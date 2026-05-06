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
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(fileName, fs.createReadStream(filePath), {
        upsert: true,
        contentType: this.getMimeType(filePath)
      });

    if (uploadError) {
      if (uploadError.status === 404 || uploadError.message?.includes('not found')) {
        throw new Error(`Бакет "${bucket}" не найден в хранилище Supabase. Пожалуйста, создайте его.`);
      }
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

    try {
      const { stdout } = await execPromise(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`
      );
      return Math.round(parseFloat(stdout.trim()));
    } catch (ffprobeError) {
      console.error('FFprobe error:', ffprobeError);
      return 0;
    }
  }

  /**
   * Полный процесс загрузки видео
   */
  async uploadVideo(file, userId, latitude, longitude, additionalData = {}) {
    const userLogin = await this.getUserLogin(userId);
    const routeId = additionalData.routeId || 'general';
    const fileExt = path.extname(file.originalname);
    const uniqueId = crypto.randomUUID();
    
    // Формируем имя файла: route_id/user_login/uuid.ext
    const fileName = `${routeId}/${userLogin}/${uniqueId}${fileExt}`;

    try {
      // 1. Загружаем файл в хранилище
      await this.uploadFileToStorage('videos', fileName, file.path);
      const publicUrl = this.getPublicUrl('videos', fileName);

      // 2. Подготовка данных для вставки в БД
      const videoData = {
        user_id: userId,
        file_url: publicUrl,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        original_name: file.originalname,
        is_live: additionalData.isLive || false,
        route_id: additionalData.routeId || null
      };

      // Добавляем данные о маршруте для live-маркеров
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

      // 3. Создаём запись в БД
      const { data: video, error: videoError } = await supabaseAdmin
        .from('videos')
        .insert(videoData)
        .select()
        .single();

      if (videoError) {
        // Очистка если запись в БД не удалась
        await this.deleteFileFromStorage('videos', fileName);
        throw videoError;
      }

      return video;
    } finally {
      this.deleteTempFile(file.path);
    }
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
