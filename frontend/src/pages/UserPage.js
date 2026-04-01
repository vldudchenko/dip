import { API_URL } from '../utils/constants';
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import defaultAvatar from '../static/Avatar.png';

/**
 * Страница пользователя
 * Отображает информацию о пользователе и его контент
 */
export const UserPage = () => {
  const { login } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(`${API_URL}/users/login/${login}`);
        if (!response.ok) {
          throw new Error('Пользователь не найден');
        }
        const data = await response.json();
        setUser(data);
        setAvatarError(false);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [login]);

  const handleToggleGuide = async () => {
    try {
      const response = await fetch(`${API_URL}/users/${user.id}/guide`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          isGuide: !user.is_guide
        })
      });

      if (!response.ok) {
        throw new Error('Не удалось обновить статус');
      }

      const updatedUser = await response.json();
      setUser(updatedUser);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div className="user-page">Загрузка...</div>;
  }

  if (error) {
    return <div className="user-page">Ошибка: {error}</div>;
  }

  return (
    <div className="user-page">
      <h1>Профиль пользователя: {user.login}</h1>

      <img
        src={avatarError || !user.avatar ? defaultAvatar : user.avatar}
        alt="Аватар"
        className="user-avatar"
        onError={() => setAvatarError(true)}
      />

      <div className="user-info">
        <p><strong>Email:</strong> {user.email || 'Не указан'}</p>
        <p><strong>Статус гида:</strong> {user.is_guide ? 'Да' : 'Нет'}</p>
      </div>

      <button
        onClick={handleToggleGuide}
        className="toggle-guide-btn"
      >
        {user.is_guide ? 'Снять статус гида' : 'Запрос на статус гида'}
      </button>
    </div>
  );
};

export default UserPage;
