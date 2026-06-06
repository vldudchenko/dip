import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import { supabaseAdmin } from '../db/supabase.js';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

export const videoProcessorService = {
  /**
   * Запускает процесс обработки видео
   */
  async processVideo(videoId, filePath) {
    try {
      const tempDir = os.tmpdir();
      const uniqueId = crypto.randomUUID();
      const ext = path.extname(filePath);

      const localInputPath = path.join(tempDir, `${uniqueId}_input${ext}`);
      const localOutputPath = path.join(tempDir, `${uniqueId}_output.mp4`);
      const localPosterPath = path.join(tempDir, `${uniqueId}_poster.jpg`);

      // 1. Скачиваем файл из raw-videos бакета
      const { data: fileData, error: downloadError } = await supabaseAdmin.storage
        .from('raw-videos')
        .download(filePath);

      if (downloadError) throw downloadError;

      const buffer = Buffer.from(await fileData.arrayBuffer());
      fs.writeFileSync(localInputPath, buffer);

      // 2. Генерация постера и транскодирование (одновременно)
      await this.transcodeAndGeneratePoster(localInputPath, localOutputPath, localPosterPath);

      // 3. Загружаем обработанное видео и постер обратно
      const processedVideoPath = `processed/${uniqueId}.mp4`;
      const processedPosterPath = `posters/${uniqueId}.jpg`;

      // Загрузка видео
      await supabaseAdmin.storage
        .from('videos')
        .upload(processedVideoPath, fs.createReadStream(localOutputPath), {
          contentType: 'video/mp4',
          duplex: 'half'
        });

      // Загрузка постера
      await supabaseAdmin.storage
        .from('videos')
        .upload(processedPosterPath, fs.createReadStream(localPosterPath), {
          contentType: 'image/jpeg',
          duplex: 'half'
        });

      // Получаем публичные URL
      const { data: { publicUrl: videoUrl } } = supabaseAdmin.storage
        .from('videos')
        .getPublicUrl(processedVideoPath);

      const { data: { publicUrl: posterUrl } } = supabaseAdmin.storage
        .from('videos')
        .getPublicUrl(processedPosterPath);

      // 4. Обновляем статус в БД
      const { error: updateError } = await supabaseAdmin
        .from('videos')
        .update({
          status: 'ready',
          file_url: videoUrl,
          poster_url: posterUrl
        })
        .eq('id', videoId);

      if (updateError) throw updateError;

      // 5. Очистка временных файлов
      try {
        if (fs.existsSync(localInputPath)) fs.unlinkSync(localInputPath);
        if (fs.existsSync(localOutputPath)) fs.unlinkSync(localOutputPath);
        if (fs.existsSync(localPosterPath)) fs.unlinkSync(localPosterPath);
      } catch (cleanupErr) {
        console.error('Cleanup error:', cleanupErr);
      }

    } catch (error) {
      console.error(`Processing failed for video ${videoId}:`, error);
      // Помечаем видео как ошибочное
      await supabaseAdmin
        .from('videos')
        .update({ status: 'error' })
        .eq('id', videoId);
    }
  },

  transcodeAndGeneratePoster(inputPath, outputPath, posterPath) {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        // 1. Настройки для видео
        .output(outputPath)
        .outputOptions([
          '-c:v libx264',
          '-preset veryfast',
          '-crf 28',
          '-c:a aac',
          '-b:a 128k',
          '-movflags +faststart'
        ])
        // 2. Настройки для постера (скриншот на 1-й секунде)
        .output(posterPath)
        .outputOptions([
          '-ss 1',
          '-vframes 1',
          '-f image2',
          '-s 640x360'
        ])
        .on('end', resolve)
        .on('error', reject)
        .run();
    });
  }
};
