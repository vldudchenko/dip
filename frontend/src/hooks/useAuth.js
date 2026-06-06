import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { API_URL } from '../utils/constants';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchUser = useCallback(async (userId) => {
    if (!userId || userId === 'undefined') {
      setLoading(false);
      return null;
    }
    try {
      const data = await api.fetchUser(userId);
      if (data) {
        setUser(data);
        localStorage.setItem('user_id', data.id);
      }
      return data;
    } catch (error) {
      console.error('Ошибка получения пользователя:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Проверка авторизации и обработка callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const userId = params.get('user_id');

    if (userId) {
      // После редиректа с бэкенда: сохраняем userId и загружаем профиль
      localStorage.setItem('user_id', userId);
      fetchUser(userId);
      navigate('/', { replace: true });
    } else {
      // Пробуем восстановить сессию из JWT-куки через /auth/me
      const storedUserId = localStorage.getItem('user_id');

      fetch(`${API_URL}/auth/me`, { credentials: 'include' })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.userId) {
            // Кука валидна — загружаем профиль
            fetchUser(data.userId);
          } else if (storedUserId && storedUserId !== 'undefined') {
            // Кука протухла, но есть сохранённый userId — пробуем загрузить профиль
            fetchUser(storedUserId).catch(() => {
              localStorage.removeItem('user_id');
              setLoading(false);
            });
          } else {
            setLoading(false);
          }
        })
        .catch(() => {
          // Сеть недоступна — пробуем localStorage
          if (storedUserId && storedUserId !== 'undefined') {
            fetchUser(storedUserId);
          } else {
            setLoading(false);
          }
        });
    }
  }, [fetchUser, navigate]);

  const login = useCallback(() => {
    window.location.href = `${API_URL}/auth/yandex`;
  }, []);

  const logout = useCallback(async () => {
    try {
      // Очищаем JWT-куку на бэкенде
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (_) {}
    localStorage.removeItem('user_id');
    setUser(null);
  }, []);

  return { user, fetchUser, login, logout, loading };
}
