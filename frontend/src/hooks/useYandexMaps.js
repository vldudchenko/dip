//useYandexMaps.js
import { useEffect, useState } from "react";
import { YANDEX_API_KEY } from "../utils/constants";

export function useYandexMaps(enabled = true) {
  const [ymapsReady, setYmapsReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setYmapsReady(false);
      return;
    }

    const checkReady = () => {
      if (window.ymaps3 && window.ymaps3.ready) {
        window.ymaps3.ready.then(() => {
          setYmapsReady(true);
          setLoadError(false);
        }).catch(err => {
          setLoadError(true);
        });
        return true;
      }
      return false;
    };

    // 1. Проверяем, может уже загружено
    if (checkReady()) return;

    // 2. Ищем существующий скрипт
    const existingScript = document.querySelector('script[src*="api-maps.yandex.ru"]');

    if (existingScript) {
      const interval = setInterval(() => {
        if (checkReady()) {
          clearInterval(interval);
        }
      }, 100);
      return () => clearInterval(interval);
    }

    // 3. Загружаем новый скрипт
    const script = document.createElement("script");
    script.src = `https://api-maps.yandex.ru/v3/?apikey=${YANDEX_API_KEY}&lang=ru_RU`;
    script.async = true;

    script.onload = () => {
      if (!checkReady()) {
        // Если скрипт загрузился, но ymaps3 еще не появился — подождем немного
        const interval = setInterval(() => {
          if (checkReady()) clearInterval(interval);
        }, 50);
        setTimeout(() => clearInterval(interval), 5000);
      }
    };

    script.onerror = () => {
      console.error('Failed to load Yandex Maps script');
      setLoadError(true);
    };

    document.head.appendChild(script);

    return () => {
      // Очистка не требуется для скрипта
    };
  }, [enabled]);

  return { ymapsReady, loadError };
}
