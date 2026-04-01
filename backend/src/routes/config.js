import express from 'express';
import { config } from '../config/index.js';

const router = express.Router();

/**
 * GET /api/config - Конфигурация для frontend
 */
router.get('/', (req, res) => {
  res.json({
    DEFAULT_RADIUS: config.defaultRadius
  });
});

export default router;
