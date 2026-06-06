import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config/index.js';
import { errorHandler } from './middleware/errorHandler.js';

// Импорт маршрутов
import authRoutes from './routes/auth.js';
import videoRoutes from './routes/videos.js';
import commentRoutes from './routes/comments.js';
import userRoutes from './routes/users.js';
import configRoutes from './routes/config.js';
import routeRoutes from './routes/routes.js';
import sessionRoutes from './routes/sessions.js';
import imageRoutes from './routes/images.js';
import { sessionService } from './services/session.js';

const app = express();

// Настройка безопасности заголовков
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false // Отключаем CSP на этапе разработки/MVP для простоты работы с внешними картами
}));

// CORS настройка
app.use(cors({
  origin: config.clientUrl,
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// Подключение маршрутов
app.use('/auth', authRoutes);
app.use('/videos', videoRoutes);
app.use('/', commentRoutes);
app.use('/users', userRoutes);
app.use('/config', configRoutes);
app.use('/routes', routeRoutes);
app.use('/sessions', sessionRoutes);
app.use('/images', imageRoutes);

// Настройка кэширования для статики и медиа (1 час для примера, можно больше)
app.use('/uploads', express.static('uploads', {
  maxAge: '1h',
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'public, max-age=3600');
  }
}));

// Глобальный Middleware для кэширования GET запросов API (на 5 минут)
app.get('*', (req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/auth')) {
    res.setHeader('Cache-Control', 'public, max-age=300');
  }
  next();
});

// Middleware для обработки ошибок
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Маршрут не найден' });
});

app.listen(config.port, () => {
  console.log(`Backend запущен на http://localhost:${config.port}`);
  
  // Запуск периодического обновления статусов сессий
  setInterval(async () => {
    try {
      await sessionService.updateSessionStatuses();
    } catch (error) {
      console.error('Error updating session statuses:', error);
    }
  }, 60000); // Раз в минуту
});

export default app;
