import express from 'express';
import cors from 'cors';
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

const app = express();

// CORS настройка
app.use(cors({
  origin: config.clientUrl,
  credentials: true
}));

app.use(express.json());

// Подключение маршрутов
app.use('/auth', authRoutes);
app.use('/videos', videoRoutes);
app.use('/', commentRoutes); // "/" так как нет страницы комментариев
app.use('/users', userRoutes);
app.use('/user', userRoutes);
app.use('/config', configRoutes);
app.use('/routes', routeRoutes);
app.use('/sessions', sessionRoutes);

// Middleware для обработки ошибок
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Маршрут не найден' });
});

app.listen(config.port, () => {
  console.log(`Backend запущен на http://localhost:${config.port}`);
});

export default app;
