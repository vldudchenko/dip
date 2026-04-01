import fetch from 'node-fetch';
import { config } from '../config/index.js';
import { supabaseAdmin } from '../db/supabase.js';

/**
 * Сервис для работы с Яндекс OAuth
 */
class YandexAuthService {
  /**
   * Генерирует URL для авторизации через Яндекс
   */
  getAuthUrl() {
    const authUrl = new URL('https://oauth.yandex.ru/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', config.yandexOAuthClientId);
    authUrl.searchParams.set('redirect_uri', config.yandexOAuthRedirectUri);
    return authUrl.toString();
  }

  /**
   * Обменивает код авторизации на токен
   */
  async exchangeCodeForToken(code) {
    const response = await fetch('https://oauth.yandex.ru/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: config.yandexOAuthClientId,
        client_secret: config.yandexOAuthClientSecret,
        redirect_uri: config.yandexOAuthRedirectUri
      })
    });

    const tokenData = await response.json();

    if (tokenData.error) {
      throw new Error(tokenData.error_description || 'OAuth error');
    }

    return tokenData;
  }

  /**
   * Получает информацию о пользователе из Яндекс
   */
  async getUserInfo(accessToken) {
    const response = await fetch('https://login.yandex.ru/info', {
      headers: { Authorization: `OAuth ${accessToken}` }
    });

    return await response.json();
  }

  /**
   * Загружает аватар пользователя из Яндекс в Supabase Storage
   */
  async uploadAvatarToStorage(userData, avatarBuffer) {
    const avatarFileName = `${userData.login}_${userData.id}_${Date.now()}.jpg`;

    const { data: avatarUploadData, error: avatarUploadError } = await supabaseAdmin.storage
      .from('avatars')
      .upload(avatarFileName, avatarBuffer, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (avatarUploadError) {
      throw avatarUploadError;
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('avatars')
      .getPublicUrl(avatarFileName);

    return publicUrl;
  }

  /**
   * Сохраняет или обновляет пользователя в базе данных
   */
  async upsertUser(userData, tokenData, avatarUrl) {
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .upsert({
        yandex_id: userData.id,
        email: userData.default_email,
        login: userData.display_name || userData.login,
        avatar: avatarUrl,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        is_guide: false
      }, { onConflict: 'yandex_id' })
      .select()
      .single();

    if (userError) throw userError;

    return user;
  }

  /**
   * Полный процесс авторизации пользователя
   */
  async authorizeUser(code) {
    // Обмен кода на токен
    const tokenData = await this.exchangeCodeForToken(code);

    // Получение информации о пользователе
    const userData = await this.getUserInfo(tokenData.access_token);

    let avatarUrl = null;

    // Загрузка аватара если он есть
    if (userData.default_avatar_id) {
      try {
        const avatarResponse = await fetch(`https://avatars.yandex.net/get-yapic/${userData.default_avatar_id}/islands-200`);

        if (avatarResponse.ok) {
          const avatarBuffer = Buffer.from(await avatarResponse.arrayBuffer());
          avatarUrl = await this.uploadAvatarToStorage(userData, avatarBuffer);
        }
      } catch (avatarError) {
        console.error('Ошибка загрузки аватара:', avatarError);
      }
    }

    // Сохранение пользователя в БД
    const user = await this.upsertUser(userData, tokenData, avatarUrl);

    return { user, tokenData, avatarUrl };
  }
}

export const yandexAuthService = new YandexAuthService();
export default yandexAuthService;
