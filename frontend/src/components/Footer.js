import React from 'react';
import './Footer.css';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-main">
          <div className="footer-brand">
            <h2 className="footer-brand-title">GeoClips</h2>
            <p className="footer-description">
              Делитесь видео с мест по всему миру. Загружайте свои видео-экскурсии 
              и смотрите контент от других пользователей на интерактивной карте.
            </p>
          </div>

          <div className="footer-contacts">
            <h3 className="footer-section-title">Контакты</h3>
            <p className="footer-city">Симферополь</p>
            <p className="footer-district">(р-н Центральный)</p>
            <p className="footer-address">Учебный пер. 8</p>
            <p className="footer-phone">
              <a href="tel:+79785687589">+7 (978) 568-75-89</a>
            </p>            
          </div>
        </div>

        <div className="footer-links-row">          
          <div className="footer-section">
            <h3 className="footer-section-title">Правовая информация</h3>
            <ul className="footer-legal-list">
              <li><a href="/terms" className="footer-link">Пользовательское соглашение</a></li>
              <li><a href="/privacy" className="footer-link">Политика конфиденциальности</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h3 className="footer-section-title">Социальные сети</h3>
            <div className="footer-socials">
              <a href="https://t.me/vldudchenko" className="footer-social-link" aria-label="Telegram">
                <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.978 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="footer-copyright">© 2026 — GeoClips.</p>
        </div>
      </div>
    </footer>
  );
}
