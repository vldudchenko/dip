import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Map } from './components/Map';
import { VideoPage } from './components/VideoPage';
import { HomePage } from './pages/HomePage';
import { UserPage } from './pages/UserPage';
import { GuidePage } from './pages/GuidePage';
import { AddRoutePage } from './pages/AddRoutePage';
import { RoutePage } from './pages/RoutePage';

import { useAuth } from './hooks/useAuth';
import { useVideos } from './hooks/useVideos';
import { useYandexMaps } from './hooks/useYandexMaps';

import { api, loadConfig } from './api';

import './App.css';

function App() {
  const { user, login, logout } = useAuth();
  const { videos, fetchVideos } = useVideos();
  const { ymapsReady } = useYandexMaps();
  const [configLoaded, setConfigLoaded] = useState(false);

  const [editMode, setEditMode] = useState(false);
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

  const handleToggleEditMode = useCallback(() => {
    setEditMode(prev => !prev);
  }, []);

  const handleUpload = useCallback(async (file, userId, latitude, longitude) => {
    try {
      const result = await api.uploadVideo(file, userId, latitude, longitude);
      return result;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }, []);

  useEffect(() => {
    uploadHandlerRef.current = handleUpload;
  }, [handleUpload]);

  return (
    <div className="App hide-scrollbar">
      <Header
        user={user}
        onLogin={login}
        onLogout={logout}
        editMode={editMode}
        onToggleEditMode={handleToggleEditMode}
      />

      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />

          <Route path="/map" element={
            <>
              {!ymapsReady && (
                <div className="map-loading">
                  Загрузка карты...
                </div>
              )}

              {ymapsReady && configLoaded && (
                <Map
                  user={user}
                  videos={videos}
                  editMode={editMode}
                  fetchVideos={fetchVideos}
                  onUploadRef={uploadHandlerRef}
                  onFetchVideosRef={fetchVideosRef}
                />
              )}

              {!user && (
                <div className="login-prompt">
                  <p>Войдите через Яндекс, чтобы загружать видео на карту</p>
                </div>
              )}
            </>
          } />

          <Route path="/user/:login" element={<UserPage />} />

          <Route path="/guide/:login" element={<GuidePage />} />

          <Route path="/guide/:login/add-route" element={<AddRoutePage />} />

          <Route path="/route/:id" element={<RoutePage />} />

          <Route path="/video/:login/:id" element={<VideoPage />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}

export default App;
