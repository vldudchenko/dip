import React from 'react';
import '../styles/Footer.css';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-main">

          <div className="footer-brand">
            <h2 className="footer-brand-title">GeoClips</h2>
            <p className="footer-description">
              Делитесь видео с мест пройденых маршрутов. Загружайте свои видео
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

          <div className="footer-section">
            <h3 className="footer-section-title">Правовая информация</h3>
            <ul className="footer-legal-list">
              <li><a href="/terms" className="footer-link">Пользовательское соглашение</a></li>
              <li><a href="/privacy" className="footer-link">Политика конфиденциальности</a></li>
              <li><a href="/faq" className="footer-link">FAQ</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="footer-copyright">© 2026 — GeoClips</p>
        </div>
      </div>
    </footer>
  );
}
