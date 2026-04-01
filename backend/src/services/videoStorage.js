import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { config } from '../config/index.js';
import { supabaseAdmin } from '../db/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Сервис для работы с видеофайлами
 */
class VideoStorageService {
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
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('login')
      .eq('id', userId)
      .single();

    if (error || !data) {
      throw new Error('Пользователь не найден');
    }

    return data.login;
  }

  /**
   * Создаёт запись о видео в базе данных
   */
  async createVideoRecord(videoData) {
    const { data: video, error: videoError } = await supabaseAdmin
      .from('videos')
      .insert(videoData)
      .select()
      .single();

    if (videoError) throw videoError;

    return video;
  }

  /**
   * Загружает файл в Supabase Storage
   */
  async uploadFileToStorage(fileName, filePath) {
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('videos')
      .upload(fileName, fs.createReadStream(filePath), {
        upsert: true
      });

    if (uploadError) throw uploadError;

    return uploadData;
  }

  /**
   * Получает публичную ссылку на файл
   */
  getPublicUrl(fileName) {
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('videos')
      .getPublicUrl(fileName);

    return publicUrl;
  }

  /**
   * Обновляет URL видео в базе данных
   */
  async updateVideoUrl(videoId, fileUrl) {
    const { data: updatedVideo, error: updateError } = await supabaseAdmin
      .from('videos')
      .update({ file_url: fileUrl })
      .eq('id', videoId)
      .select()
      .single();

    if (updateError) throw updateError;

    return updatedVideo;
  }

  /**
   * Удаляет файл из хранилища
   */
  async deleteFileFromStorage(fileName) {
    await supabaseAdmin.storage
      .from('videos')
      .remove([fileName]);
  }

  /**
   * Удаляет временный файл с диска
   */
  deleteTempFile(filePath) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
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

    // Подготовка данных для вставки
    const videoData = {
      user_id: userId,
      file_url: 'temp_placeholder',
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      original_name: file.originalname,
      is_live: additionalData.isLive || false,
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

    // Создаём запись в БД
    const video = await this.createVideoRecord(videoData);

    // Формируем имя файла и загружаем в хранилище
    const fileExt = path.extname(file.originalname);
    const fileName = `${userLogin}_${video.id}${fileExt}`;

    await this.uploadFileToStorage(fileName, file.path);

    // Получаем публичную ссылку и обновляем запись
    const publicUrl = this.getPublicUrl(fileName);
    const updatedVideo = await this.updateVideoUrl(video.id, publicUrl);

    // Удаляем временный файл
    this.deleteTempFile(file.path);

    return updatedVideo;
  }

  /**
   * Удаляет видео (файл и запись в БД)
   */
  async deleteVideo(videoId, fileUrl) {
    // Извлекаем имя файла из URL
    const fileName = fileUrl.split('/').pop();

    // Удаляем файл из хранилища
    await this.deleteFileFromStorage(fileName);

    // Удаляем запись из БД
    const { error: deleteError } = await supabaseAdmin
      .from('videos')
      .delete()
      .eq('id', videoId);

    if (deleteError) throw deleteError;
  }
}

export const videoStorageService = new VideoStorageService();
export default videoStorageService;
