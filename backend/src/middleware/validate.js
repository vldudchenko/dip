import { z } from 'zod';

/**
 * Универсальный middleware для валидации данных с помощью Zod
 * @param {z.ZodSchema} schema - Схема Zod для проверки
 */
export const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Ошибка валидации данных',
        details: error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message
        }))
      });
    }
    next(error);
  }
};

/**
 * Схема валидации маршрута
 */
export const routeSchema = z.object({
  title: z.string().min(3, 'Название должно быть не менее 3 символов').max(100),
  description: z.string().optional(),
  path_data: z.array(z.object({
    lat: z.number().min(-90, 'Широта должна быть от -90 до 90').max(90, 'Широта должна быть от -90 до 90'),
    lng: z.number().min(-180, 'Долгота должна быть от -180 до 180').max(180, 'Долгота должна быть от -180 до 180'),
    transport: z.enum(['walking', 'cycling', 'driving', 'bus']).default('walking')
  })).min(2, 'Маршрут должен содержать минимум 2 точки').max(500, 'Слишком длинный маршрут (максимум 500 точек)')
});
