import express from 'express';
import crypto from 'crypto';
import { yandexAuthService } from '../services/yandexAuth.js';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

const router = express.Router();

const generateState = () => crypto.randomBytes(32).toString('hex');

let currentState = null;

router.get('/yandex', (req, res) => {
  currentState = {
    value: generateState(),
    expires: Date.now() + 10 * 60 * 1000
  };
  
  const authUrl = yandexAuthService.getAuthUrl(currentState.value);
  res.redirect(authUrl);
});

router.get('/yandex/callback', async (req, res) => {
  try {
    const { code, state: returnedState } = req.query;

    if (!returnedState) {
      throw new Error('Отсутствует state параметр');
    }
    
    if (!currentState || currentState.value !== returnedState) {
      throw new Error('Неверное состояние запроса');
    }
    
    if (Date.now() > currentState.expires) {
      currentState = null;
      throw new Error('Время запроса истекло');
    }
    
    currentState = null;

    const { user, tokenData } = await yandexAuthService.authorizeUser(code);

    const jwtToken = jwt.sign(
      { userId: user.id, is_guide: user.is_guide },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    res.cookie('token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 дней
    });

    res.redirect(`${config.clientUrl}/auth/callback?user_id=${user.id}`);
  } catch (error) {
    console.error('OAuth error:', error);
    res.redirect(`${config.clientUrl}/auth/error?message=${encodeURIComponent(error.message)}`);
  }
});

/**
 * GET /auth/me - Проверка текущей сессии и получение userId из куки
 */
router.get('/me', (req, res) => {
  try {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ error: 'Не авторизован' });

    const decoded = jwt.verify(token, config.jwtSecret);
    res.json({ userId: decoded.userId, is_guide: decoded.is_guide });
  } catch (error) {
    res.status(401).json({ error: 'Невалидный токен' });
  }
});

/**
 * POST /auth/logout - Выход (очистка JWT-куки)
 */
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax'
  });
  res.json({ success: true });
});

export default router;
