import React from 'react';
import { useNavigate } from 'react-router-dom';
import { RouteForm } from '../components/RouteForm';

/**
 * Страница добавления маршрута
 */
export const AddRoutePage = () => {
  const navigate = useNavigate();

  const handleSubmit = async (e, result) => {
    e.preventDefault();
    if (result && result.id) {
      navigate(`/route/${result.id}/edit-path`);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <div className="add-route-page">
      <div className="add-route-container">
        <h1>Добавить новый маршрут</h1>
        <RouteForm
          initialValues={{
            title: '',
            difficulty: 'easy',
            description: ''
          }}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitLabel="Создать маршрут"
        />
      </div>
    </div>
  );
};

export default AddRoutePage;
