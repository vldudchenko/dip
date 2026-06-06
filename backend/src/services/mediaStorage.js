import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import { supabaseAdmin } from '../db/supabase.js';
import { userService } from './user.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Сервис для работы с медиафайлами (видео и изображения)
 */
class MediaStorageService {
  /**
   * Получает путь к директории загрузок
   */
  getUploadDir() {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    return uploadDir;
  }

  /**
   * Получает логин пользователя по ID
   */
  async getUserLogin(userId) {
    const user = await userService.getUserById(userId);
    if (!user) {
      throw new Error('Пользователь не найден');
    }
    return user.login;
  }

  /**
   * Загружает файл в Supabase Storage
   */
  async uploadFileToStorage(bucket, fileName, filePath) {
    let { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(fileName, fs.createReadStream(filePath), {
        upsert: true,
        contentType: this.getMimeType(filePath)
      });

    if (uploadError && (uploadError.status === 404 || uploadError.statusCode === '404' || uploadError.message?.includes('not found'))) {
      await supabaseAdmin.storage.createBucket(bucket, {
        public: bucket !== 'raw-videos',
      });

      // Повторяем загрузку
      const retryResult = await supabaseAdmin.storage
        .from(bucket)
        .upload(fileName, fs.createReadStream(filePath), {
          upsert: true,
          contentType: this.getMimeType(filePath)
        });

      uploadData = retryResult.data;
      uploadError = retryResult.error;
    }

    if (uploadError) {
      throw uploadError;
    }

    return uploadData;
  }

  /**
   * Определяет MIME-тип по расширению
   */
  getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Получает публичную ссылку на файл
   */
  getPublicUrl(bucket, fileName) {
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return publicUrl;
  }

  /**
   * Генерирует Signed URL для прямой загрузки
   */
  async generateSignedUploadUrl(bucket, fileName) {
    // Используем supabaseAdmin для генерации URL
    let { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUploadUrl(fileName);

    // Если бакет не найден (404), пробуем создать его автоматически
    if (error && (error.status === 404 || error.statusCode === '404' || error.message?.includes('not found'))) {
      const { error: createError } = await supabaseAdmin.storage.createBucket(bucket, {
        public: bucket !== 'raw-videos', // raw-videos делаем приватным, остальные публичными
      });

      if (createError && !createError.message?.includes('already exists')) {
        console.error(`Не удалось создать бакет ${bucket}:`, createError);
        return { data: null, error: createError };
      }

      // Повторяем попытку после создания
      const retryResult = await supabaseAdmin.storage
        .from(bucket)
        .createSignedUploadUrl(fileName);
      data = retryResult.data;
      error = retryResult.error;
    }

    return { data, error };
  }

  /**
   * Удаляет файл из хранилища
   */
  async deleteFileFromStorage(bucket, fileName) {
    await supabaseAdmin.storage
      .from(bucket)
      .remove([fileName]);
  }

  /**
   * Удаляет временный файл с диска
   */
  deleteTempFile(filePath) {
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.error('Ошибка удаления временного файла:', e);
      }
    }
  }

  /**
   * Получает длительность видео через ffprobe
   */
  async getVideoDuration(videoPath) {
    const { exec } = await import('child_process');
    const util = await import('util');
    const execPromise = util.promisify(exec);

    // Динамический импорт, чтобы использовать установленный бинарник
    const { default: ffprobeInstaller } = await import('@ffprobe-installer/ffprobe');

    try {
      const { stdout } = await execPromise(
        `"${ffprobeInstaller.path}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`
      );
      return Math.round(parseFloat(stdout.trim()));
    } catch (ffprobeError) {
      console.error('FFprobe error:', ffprobeError);
      return 0;
    }
  }

  /**
   * Регистрирует загруженное напрямую видео в БД (статус processing)
   */
  async registerVideo(userId, latitude, longitude, originalName, filePath, additionalData = {}) {
    const videoData = {
      user_id: userId,
      file_url: filePath, // Пока храним путь raw файла
      status: 'processing',
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      original_name: originalName,
      route_id: additionalData.routeId || null
    };

    if (additionalData.isLive) {
      if (additionalData.routeStart) {
        videoData.route_start_lat = parseFloat(additionalData.routeStart.latitude);
        videoData.route_start_lng = parseFloat(additionalData.routeStart.longitude);
      }
      if (additionalData.routeEnd) {
        videoData.route_end_lat = parseFloat(additionalData.routeEnd.latitude);
        videoData.route_end_lng = parseFloat(additionalData.routeEnd.longitude);
      }
      if (additionalData.routeGeometry) {
        videoData.route_geometry = additionalData.routeGeometry;
      }
      if (additionalData.videoDuration) {
        videoData.video_duration = parseInt(additionalData.videoDuration);
      }
    }

    const { data: video, error } = await supabaseAdmin
      .from('videos')
      .insert(videoData)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return video;
  }

  /**
   * Полный процесс загрузки изображения
   */
  async uploadImage(file, userId, routeId) {
    const userLogin = await this.getUserLogin(userId);

    if (!routeId) throw new Error('routeId обязателен для загрузки изображения');

    const fileExt = path.extname(file.originalname);
    const uniqueId = crypto.randomUUID();

    // Формируем имя файла: route_id/user_login/uuid.ext
    const fileName = `${routeId}/${userLogin}/${uniqueId}${fileExt}`;

    try {
      // 1. Загружаем файл в хранилище
      await this.uploadFileToStorage('Images', fileName, file.path);
      const publicUrl = this.getPublicUrl('Images', fileName);

      // 2. Подготовка данных для БД
      const imageData = {
        user_id: userId,
        route_id: routeId,
        file_url: publicUrl,
        original_name: file.originalname
      };

      // 3. Создаём запись в БД
      const { data: image, error: imageError } = await supabaseAdmin
        .from('images')
        .insert(imageData)
        .select()
        .single();

      if (imageError) {
        // Очистка если БД подвела
        await this.deleteFileFromStorage('Images', fileName);
        throw imageError;
      }

      return image;
    } finally {
      this.deleteTempFile(file.path);
    }
  }

  /**
   * Удаляет видео
   */
  async deleteVideo(videoId, fileUrl) {
    if (!fileUrl) throw new Error('Неверный URL файла');

    const parts = fileUrl.split('/videos/');
    if (parts.length < 2) throw new Error('Неверный формат URL видео');
    const fileName = parts[1];

    await this.deleteFileFromStorage('videos', fileName);

    const { error: deleteError } = await supabaseAdmin
      .from('videos')
      .delete()
      .eq('id', videoId);

    if (deleteError) throw deleteError;
  }

  /**
   * Удаляет изображение
   */
  async deleteImage(imageId, fileUrl) {
    if (!fileUrl) throw new Error('Неверный URL файла');

    const parts = fileUrl.split('/Images/');
    if (parts.length < 2) throw new Error('Неверный формат URL изображения');
    const fileName = parts[1];

    await this.deleteFileFromStorage('Images', fileName);

    const { error: deleteError } = await supabaseAdmin
      .from('images')
      .delete()
      .eq('id', imageId);

    if (deleteError) throw deleteError;
  }
}

export const mediaStorageService = new MediaStorageService();
export default mediaStorageService;
