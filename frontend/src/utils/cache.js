/**
 * Простой кэш для API запросов
 */
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 минут

export function getFromCache(key) {
  const cached = cache.get(key);
  if (!cached) return null;

  const { data, timestamp } = cached;
  if (Date.now() - timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }

  return data;
}

export function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

export function clearCache(key) {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
}

/**
 * Debounce функция для ограничения частоты запросов
 */
export function debounce(fn, delay) {
  let timeoutId = null;

  return function (...args) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    return new Promise((resolve, reject) => {
      timeoutId = setTimeout(() => {
        fn.apply(this, args)
          .then(resolve)
          .catch(reject);
      }, delay);
    });
  };
}

/**
 * Throttle функция для ограничения частоты вызовов
 */
export function throttle(fn, limit) {
  let inThrottle = false;
  let lastResult = null;

  return function (...args) {
    if (inThrottle) {
      return lastResult;
    }

    inThrottle = true;
    lastResult = fn.apply(this, args);

    setTimeout(() => {
      inThrottle = false;
    }, limit);

    return lastResult;
  };
}
