import express from 'express';
import { yandexAuthService } from '../services/yandexAuth.js';
import { config } from '../config/index.js';

const router = express.Router();

/**
 * Маршрут для перенаправления на Яндекс OAuth
 */
router.get('/yandex', (req, res) => {
  const authUrl = yandexAuthService.getAuthUrl();
  res.redirect(authUrl);
});

/**
 * Callback от Яндекс OAuth
 */
router.get('/yandex/callback', async (req, res) => {
  try {
    const { code } = req.query;

    const { user, tokenData } = await yandexAuthService.authorizeUser(code);

    // Перенаправление на фронтенд с токеном
    res.redirect(`${config.clientUrl}/auth/callback?token=${tokenData.access_token}&user_id=${user.id}`);
  } catch (error) {
    console.error('OAuth error:', error);
    res.redirect(`${config.clientUrl}/auth/error?message=${encodeURIComponent(error.message)}`);
  }
});

export default router;
