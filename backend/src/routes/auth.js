import express from 'express';
import crypto from 'crypto';
import { yandexAuthService } from '../services/yandexAuth.js';
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

    res.redirect(`${config.clientUrl}/auth/callback?token=${tokenData.access_token}&user_id=${user.id}`);
  } catch (error) {
    console.error('OAuth error:', error);
    res.redirect(`${config.clientUrl}/auth/error?message=${encodeURIComponent(error.message)}`);
  }
});

export default router;
