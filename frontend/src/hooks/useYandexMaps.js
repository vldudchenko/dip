//useYandexMaps.js
import { useEffect, useState } from "react";
import { YANDEX_API_KEY } from "../utils/constants";

export function useYandexMaps() {
  const [ymapsReady, setYmapsReady] = useState(false);

  useEffect(() => {
    // Если карты уже загружены и готовы
    if (window.ymaps3 && window.ymaps3.ready) {
      window.ymaps3.ready.then(() => {
        setYmapsReady(true);
      });
      return;
    }

    // Проверяем, есть ли уже скрипт
    const existingScript = document.querySelector('script[src*="api-maps.yandex.ru"]');

    if (existingScript) {
      // Скрипт уже есть, ждём загрузки
      const checkReady = setInterval(() => {
        if (window.ymaps3 && window.ymaps3.ready) {
          clearInterval(checkReady);
          window.ymaps3.ready.then(() => {
            setYmapsReady(true);
          });
        }
      }, 100);
      return () => clearInterval(checkReady);
    }

    // Загружаем скрипт Яндекс Карт
    const script = document.createElement("script");
    script.src = `https://api-maps.yandex.ru/v3/?apikey=${YANDEX_API_KEY}&lang=ru_RU`;
    script.async = true;

    script.onload = () => {
      if (window.ymaps3 && window.ymaps3.ready) {
        window.ymaps3.ready.then(() => {
          setYmapsReady(true);
        });
      }
    };

    script.onerror = () => {
      console.error('Ошибка загрузки Яндекс Карт API');
      console.error('Script URL:', script.src);
    };

    console.log('Loading Yandex Maps script:', script.src);
    document.head.appendChild(script);

    return () => {
      // Не удаляем скрипт
    };
  }, []);

  return { ymapsReady };
}
