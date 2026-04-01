/**
 * Middleware для обработки ошибок
 */
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }

  if (err.code === 'PGRST116') {
    return res.status(404).json({ error: 'Ресурс не найден' });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Внутренняя ошибка сервера'
  });
};

/**
 * Middleware для проверки авторизации
 */
export const requireAuth = (req, res, next) => {
  const userId = req.body.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  next();
};

export default { errorHandler, requireAuth };
