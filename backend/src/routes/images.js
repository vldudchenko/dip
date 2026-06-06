import express from 'express';
import { mediaStorageService } from '../services/mediaStorage.js';
import { requireAuth } from '../middleware/errorHandler.js';
import { supabaseAnon } from '../db/supabase.js';

const router = express.Router();

/**
 * POST /api/images/upload-url - Генерация Signed URL для прямой загрузки изображения
 */
router.post('/upload-url', requireAuth, async (req, res) => {
  try {
    const { fileName } = req.body;
    if (!fileName) return res.status(400).json({ error: 'Имя файла обязательно' });

    const { data, error } = await mediaStorageService.generateSignedUploadUrl('Images', fileName);
    
    if (error) throw error;
    res.json({ success: true, signedUrl: data.signedUrl, path: data.path });
  } catch (error) {
    console.error('Error generating image upload URL:', error);
    res.status(500).json({ error: 'Не удалось сгенерировать ссылку для загрузки' });
  }
});

/**
 * POST /api/images - Регистрация загруженного изображения
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { userId, routeId, filePath, originalName } = req.body;

    if (!filePath) return res.status(400).json({ error: 'Файл не загружен' });
    if (!routeId) return res.status(400).json({ error: 'ID маршрута обязателен' });

    const publicUrl = mediaStorageService.getPublicUrl('Images', filePath);

    const { data: image, error: imageError } = await supabaseAnon
      .from('images')
      .insert({
        user_id: userId,
        route_id: routeId,
        file_url: publicUrl,
        original_name: originalName
      })
      .select()
      .single();

    if (imageError) throw imageError;

    res.json({ success: true, image });
  } catch (error) {
    console.error('Image registration error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/images/route/:routeId - Получение всех изображений маршрута
 */
router.get('/route/:routeId', async (req, res) => {
  try {
    const { data, error } = await supabaseAnon
      .from('images')
      .select(`
        *,
        users (
          login,
          avatar
        )
      `)
      .eq('route_id', req.params.routeId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Fetch images error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/images/:id - Удаление изображения
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    // Получаем изображение для проверки владельца
    const { data: image, error: fetchError } = await supabaseAnon
      .from('images')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Проверяем, что пользователь является владельцем
    if (image.user_id !== userId) {
      return res.status(403).json({ error: 'Удаление доступно только владельцу' });
    }

    await mediaStorageService.deleteImage(id, image.file_url);

    res.json({ success: true, message: 'Изображение удалено' });
  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
