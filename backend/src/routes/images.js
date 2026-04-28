import express from 'express';
import { upload } from '../middleware/upload.js';
import { mediaStorageService } from '../services/mediaStorage.js';
import { requireAuth } from '../middleware/errorHandler.js';
import { supabaseAnon } from '../db/supabase.js';

const router = express.Router();

/**
 * POST /api/images - Загрузка нового изображения к маршруту
 */
router.post('/', upload.single('image'), requireAuth, async (req, res) => {
  try {
    const { userId, routeId } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }

    if (!routeId) {
      return res.status(400).json({ error: 'ID маршрута обязателен' });
    }

    const image = await mediaStorageService.uploadImage(
      req.file,
      userId,
      routeId
    );

    res.json({ success: true, image });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/images/route/:routeId - Получение всех изображений маршрута
 */
router.get('/route/:routeId', async (req, res) => {
  try {
    const { data, error } = await supabaseAnon
      .from('route_images')
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
      .from('route_images')
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
