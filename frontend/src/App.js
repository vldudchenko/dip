import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Map } from './components/Map';
import { VideoPage } from './pages/VideoPage';
import { HomePage } from './pages/HomePage';
import { UserPage } from './pages/UserPage';
import { GuidePage } from './pages/GuidePage';
import { RoutePage } from './pages/RoutePage';
import { RoutePathPage } from './pages/RoutePathPage';
import { SearchPage } from './pages/SearchPage';
import { PostVideoPage } from './pages/PostVideoPage';
import { InteractiveMapPage } from './pages/InteractiveMapPage';

import { useAuth } from './hooks/useAuth';
import { useVideos } from './hooks/useVideos';
import { useYandexMaps } from './hooks/useYandexMaps';
import { useMapProvider } from './hooks/useMapProvider';

import { api, loadConfig } from './api';

import './App.css';

function App() {
  const { user, login, logout, loading: authLoading } = useAuth();
  const { videos, fetchVideos } = useVideos();
  const { provider } = useMapProvider();
  const location = useLocation();
  // Загружаем Яндекс SDK только если выбран яндекс-провайдер
  const { ymapsReady, loadError } = useYandexMaps(provider === 'yandex');
  const [configLoaded, setConfigLoaded] = useState(false);

  const uploadHandlerRef = useRef(null);
  const fetchVideosRef = useRef(fetchVideos);

  // Загрузка конфигурации при старте
  useEffect(() => {
    loadConfig().then(() => {
      setConfigLoaded(true);
    });
  }, []);

  // Обновляем ref при изменении fetchVideos
  useEffect(() => {
    fetchVideosRef.current = fetchVideos;
  }, [fetchVideos]);


  const handleUpload = useCallback(async (videoFile, userId, latitude, longitude) => {
    try {
      const result = await api.uploadVideo(videoFile, userId, latitude, longitude);
      return result;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }, []);

  useEffect(() => {
    uploadHandlerRef.current = handleUpload;
  }, [handleUpload]);

  // Загружаем все видео при переходе на страницу карты
  useEffect(() => {
    if (location.pathname === '/map') {
      fetchVideos(null, null);
    }
  }, [location.pathname, fetchVideos]);

  return (
    <div className="App hide-scrollbar">
      <Header
        user={user}
        onLogin={login}
        onLogout={logout}
      />

      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />

          <Route path="/search" element={<SearchPage />} />

          <Route path="/post-video" element={<PostVideoPage user={user} authLoading={authLoading} />} />

          <Route path="/map" element={
            <InteractiveMapPage user={user} />
          } />

          <Route path="/user/:login" element={<UserPage />} />

          <Route path="/guide/:login" element={<GuidePage />} />

          <Route path="/route/:id" element={<RoutePage />} />

          <Route path="/route/:id/path" element={<RoutePathPage />} />

          <Route path="/video/:login/:id" element={<VideoPage />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}

export default App;
