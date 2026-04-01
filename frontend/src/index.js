import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

// Подавление ошибки ResizeObserver loop limit exceeded
// Это известная проблема React/webpack-dev-server, не влияющая на работу приложения
if (typeof ResizeObserver !== 'undefined') {
  let frameId = 0;
  const originalObserver = ResizeObserver;
  
  window.ResizeObserver = class ResizeObserver extends originalObserver {
    constructor(callback) {
      callback = new Proxy(callback, {
        apply: (target, thisArg, args) => {
          if (frameId) {
            cancelAnimationFrame(frameId);
          }
          frameId = requestAnimationFrame(() => {
            Reflect.apply(target, thisArg, args);
          });
        }
      });
      super(callback);
    }
  };

  // Также обрабатываем ошибку глобально
  window.addEventListener('error', (event) => {
    if (event.message?.includes('ResizeObserver loop')) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.message?.includes('ResizeObserver loop')) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
