import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async (userId) => {
    try {
      const data = await api.fetchUser(userId);
      if (data) {
        setUser(data);
        localStorage.setItem('yandex_token', data.access_token);
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
    const token = params.get('token');
    const userId = params.get('user_id');

    if (token && userId) {
      localStorage.setItem('yandex_token', token);
      localStorage.setItem('user_id', userId);
      fetchUser(userId);
      window.location.href = '/';
      return;
    }

    const storedUserId = localStorage.getItem('user_id');
    if (storedUserId) {
      fetchUser(storedUserId);
    } else {
      setLoading(false);
    }
  }, [fetchUser]);

  const login = useCallback(() => {
    window.location.href = `${process.env.REACT_APP_API_URL}/auth/yandex`;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('yandex_token');
    localStorage.removeItem('user_id');
    setUser(null);
  }, []);

  return { user, fetchUser, login, logout, loading };
}
