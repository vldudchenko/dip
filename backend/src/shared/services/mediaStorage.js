import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import { supabaseAdmin } from '../db/supabase.js';
import { userService } from './user.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * ╨б╨╡╤А╨▓╨╕╤Б ╨┤╨╗╤П ╤А╨░╨▒╨╛╤В╤Л ╤Б ╨╝╨╡╨┤╨╕╨░╤Д╨░╨╣╨╗╨░╨╝╨╕ (╨▓╨╕╨┤╨╡╨╛ ╨╕ ╨╕╨╖╨╛╨▒╤А╨░╨╢╨╡╨╜╨╕╤П)
 */
class MediaStorageService {
  /**
   * ╨Я╨╛╨╗╤Г╤З╨░╨╡╤В ╨┐╤Г╤В╤М ╨║ ╨┤╨╕╤А╨╡╨║╤В╨╛╤А╨╕╨╕ ╨╖╨░╨│╤А╤Г╨╖╨╛╨║
   */
  getUploadDir() {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    return uploadDir;
  }

  /**
   * ╨Я╨╛╨╗╤Г╤З╨░╨╡╤В ╨╗╨╛╨│╨╕╨╜ ╨┐╨╛╨╗╤М╨╖╨╛╨▓╨░╤В╨╡╨╗╤П ╨┐╨╛ ID
   */
  async getUserLogin(userId) {
    const user = await userService.getUserById(userId);
    if (!user) {
      throw new Error('╨Я╨╛╨╗╤М╨╖╨╛╨▓╨░╤В╨╡╨╗╤М ╨╜╨╡ ╨╜╨░╨╣╨┤╨╡╨╜');
    }
    return user.login;
  }

  /**
   * ╨Ч╨░╨│╤А╤Г╨╢╨░╨╡╤В ╤Д╨░╨╣╨╗ ╨▓ Supabase Storage
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
        throw new Error(`╨С╨░╨║╨╡╤В "${bucket}" ╨╜╨╡ ╨╜╨░╨╣╨┤╨╡╨╜ ╨▓ ╤Е╤А╨░╨╜╨╕╨╗╨╕╤Й╨╡ Supabase. ╨Я╨╛╨╢╨░╨╗╤Г╨╣╤Б╤В╨░, ╤Б╨╛╨╖╨┤╨░╨╣╤В╨╡ ╨╡╨│╨╛.`);
      }
      throw uploadError;
    }

    return uploadData;
  }

  /**
   * ╨Ю╨┐╤А╨╡╨┤╨╡╨╗╤П╨╡╤В MIME-╤В╨╕╨┐ ╨┐╨╛ ╤А╨░╤Б╤И╨╕╤А╨╡╨╜╨╕╤О
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
   * ╨Я╨╛╨╗╤Г╤З╨░╨╡╤В ╨┐╤Г╨▒╨╗╨╕╤З╨╜╤Г╤О ╤Б╤Б╤Л╨╗╨║╤Г ╨╜╨░ ╤Д╨░╨╣╨╗
   */
  getPublicUrl(bucket, fileName) {
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return publicUrl;
  }

  /**
   * ╨г╨┤╨░╨╗╤П╨╡╤В ╤Д╨░╨╣╨╗ ╨╕╨╖ ╤Е╤А╨░╨╜╨╕╨╗╨╕╤Й╨░
   */
  async deleteFileFromStorage(bucket, fileName) {
    await supabaseAdmin.storage
      .from(bucket)
      .remove([fileName]);
  }

  /**
   * ╨г╨┤╨░╨╗╤П╨╡╤В ╨▓╤А╨╡╨╝╨╡╨╜╨╜╤Л╨╣ ╤Д╨░╨╣╨╗ ╤Б ╨┤╨╕╤Б╨║╨░
   */
  deleteTempFile(filePath) {
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.error('╨Ю╤И╨╕╨▒╨║╨░ ╤Г╨┤╨░╨╗╨╡╨╜╨╕╤П ╨▓╤А╨╡╨╝╨╡╨╜╨╜╨╛╨│╨╛ ╤Д╨░╨╣╨╗╨░:', e);
      }
    }
  }

  /**
   * ╨Я╨╛╨╗╤Г╤З╨░╨╡╤В ╨┤╨╗╨╕╤В╨╡╨╗╤М╨╜╨╛╤Б╤В╤М ╨▓╨╕╨┤╨╡╨╛ ╤З╨╡╤А╨╡╨╖ ffprobe
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
   * ╨Я╨╛╨╗╨╜╤Л╨╣ ╨┐╤А╨╛╤Ж╨╡╤Б╤Б ╨╖╨░╨│╤А╤Г╨╖╨║╨╕ ╨▓╨╕╨┤╨╡╨╛
   */
  async uploadVideo(file, userId, latitude, longitude, additionalData = {}) {
    const userLogin = await this.getUserLogin(userId);
    const routeId = additionalData.routeId || 'general';
    const fileExt = path.extname(file.originalname);
    const uniqueId = crypto.randomUUID();
    
    // ╨д╨╛╤А╨╝╨╕╤А╤Г╨╡╨╝ ╨╕╨╝╤П ╤Д╨░╨╣╨╗╨░: route_id/user_login/uuid.ext
    const fileName = `${routeId}/${userLogin}/${uniqueId}${fileExt}`;

    try {
      // 1. ╨Ч╨░╨│╤А╤Г╨╢╨░╨╡╨╝ ╤Д╨░╨╣╨╗ ╨▓ ╤Е╤А╨░╨╜╨╕╨╗╨╕╤Й╨╡
      await this.uploadFileToStorage('videos', fileName, file.path);
      const publicUrl = this.getPublicUrl('videos', fileName);

      // 2. ╨Я╨╛╨┤╨│╨╛╤В╨╛╨▓╨║╨░ ╨┤╨░╨╜╨╜╤Л╤Е ╨┤╨╗╤П ╨▓╤Б╤В╨░╨▓╨║╨╕ ╨▓ ╨С╨Ф
      const videoData = {
        user_id: userId,
        file_url: publicUrl,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        original_name: file.originalname,
        is_live: additionalData.isLive || false,
        route_id: additionalData.routeId || null
      };

      // ╨Ф╨╛╨▒╨░╨▓╨╗╤П╨╡╨╝ ╨┤╨░╨╜╨╜╤Л╨╡ ╨╛ ╨╝╨░╤А╤И╤А╤Г╤В╨╡ ╨┤╨╗╤П live-╨╝╨░╤А╨║╨╡╤А╨╛╨▓
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

      // 3. ╨б╨╛╨╖╨┤╨░╤С╨╝ ╨╖╨░╨┐╨╕╤Б╤М ╨▓ ╨С╨Ф
      const { data: video, error: videoError } = await supabaseAdmin
        .from('videos')
        .insert(videoData)
        .select()
        .single();

      if (videoError) {
        // ╨Ю╤З╨╕╤Б╤В╨║╨░ ╨╡╤Б╨╗╨╕ ╨╖╨░╨┐╨╕╤Б╤М ╨▓ ╨С╨Ф ╨╜╨╡ ╤Г╨┤╨░╨╗╨░╤Б╤М
        await this.deleteFileFromStorage('videos', fileName);
        throw videoError;
      }

      return video;
    } finally {
      this.deleteTempFile(file.path);
    }
  }

  /**
   * ╨Я╨╛╨╗╨╜╤Л╨╣ ╨┐╤А╨╛╤Ж╨╡╤Б╤Б ╨╖╨░╨│╤А╤Г╨╖╨║╨╕ ╨╕╨╖╨╛╨▒╤А╨░╨╢╨╡╨╜╨╕╤П
   */
  async uploadImage(file, userId, routeId) {
    const userLogin = await this.getUserLogin(userId);
    
    if (!routeId) throw new Error('routeId ╨╛╨▒╤П╨╖╨░╤В╨╡╨╗╨╡╨╜ ╨┤╨╗╤П ╨╖╨░╨│╤А╤Г╨╖╨║╨╕ ╨╕╨╖╨╛╨▒╤А╨░╨╢╨╡╨╜╨╕╤П');

    const fileExt = path.extname(file.originalname);
    const uniqueId = crypto.randomUUID();
    
    // ╨д╨╛╤А╨╝╨╕╤А╤Г╨╡╨╝ ╨╕╨╝╤П ╤Д╨░╨╣╨╗╨░: route_id/user_login/uuid.ext
    const fileName = `${routeId}/${userLogin}/${uniqueId}${fileExt}`;

    try {
      // 1. ╨Ч╨░╨│╤А╤Г╨╢╨░╨╡╨╝ ╤Д╨░╨╣╨╗ ╨▓ ╤Е╤А╨░╨╜╨╕╨╗╨╕╤Й╨╡
      await this.uploadFileToStorage('Images', fileName, file.path);
      const publicUrl = this.getPublicUrl('Images', fileName);

      // 2. ╨Я╨╛╨┤╨│╨╛╤В╨╛╨▓╨║╨░ ╨┤╨░╨╜╨╜╤Л╤Е ╨┤╨╗╤П ╨С╨Ф
      const imageData = {
        user_id: userId,
        route_id: routeId,
        file_url: publicUrl,
        original_name: file.originalname
      };

      // 3. ╨б╨╛╨╖╨┤╨░╤С╨╝ ╨╖╨░╨┐╨╕╤Б╤М ╨▓ ╨С╨Ф
      const { data: image, error: imageError } = await supabaseAdmin
        .from('images')
        .insert(imageData)
        .select()
        .single();

      if (imageError) {
        // ╨Ю╤З╨╕╤Б╤В╨║╨░ ╨╡╤Б╨╗╨╕ ╨С╨Ф ╨┐╨╛╨┤╨▓╨╡╨╗╨░
        await this.deleteFileFromStorage('Images', fileName);
        throw imageError;
      }

      return image;
    } finally {
      this.deleteTempFile(file.path);
    }
  }

  /**
   * ╨г╨┤╨░╨╗╤П╨╡╤В ╨▓╨╕╨┤╨╡╨╛
   */
  async deleteVideo(videoId, fileUrl) {
    if (!fileUrl) throw new Error('╨Э╨╡╨▓╨╡╤А╨╜╤Л╨╣ URL ╤Д╨░╨╣╨╗╨░');
    
    const parts = fileUrl.split('/videos/');
    if (parts.length < 2) throw new Error('╨Э╨╡╨▓╨╡╤А╨╜╤Л╨╣ ╤Д╨╛╤А╨╝╨░╤В URL ╨▓╨╕╨┤╨╡╨╛');
    const fileName = parts[1];

    await this.deleteFileFromStorage('videos', fileName);

    const { error: deleteError } = await supabaseAdmin
      .from('videos')
      .delete()
      .eq('id', videoId);

    if (deleteError) throw deleteError;
  }

  /**
   * ╨г╨┤╨░╨╗╤П╨╡╤В ╨╕╨╖╨╛╨▒╤А╨░╨╢╨╡╨╜╨╕╨╡
   */
  async deleteImage(imageId, fileUrl) {
    if (!fileUrl) throw new Error('╨Э╨╡╨▓╨╡╤А╨╜╤Л╨╣ URL ╤Д╨░╨╣╨╗╨░');
    
    const parts = fileUrl.split('/Images/');
    if (parts.length < 2) throw new Error('╨Э╨╡╨▓╨╡╤А╨╜╤Л╨╣ ╤Д╨╛╤А╨╝╨░╤В URL ╨╕╨╖╨╛╨▒╤А╨░╨╢╨╡╨╜╨╕╤П');
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
