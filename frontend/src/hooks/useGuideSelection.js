import { useState, useMemo, useEffect } from 'react';

/**
 * Хук для управления состоянием выбора гида в фильтрах
 */
export const useGuideSelection = (guides, itemsPerPage = 5) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Сброс страницы при поиске
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Мемоизированный список отфильтрованных гидов
  const filteredGuides = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return guides;

    return guides.filter(guide => {
      const fullName = (guide.full_name || '').toLowerCase();
      const login = (guide.login || '').toLowerCase();
      return fullName.includes(query) || login.includes(query);
    });
  }, [guides, searchQuery]);

  // Пагинация
  const totalPages = Math.ceil(filteredGuides.length / itemsPerPage);
  
  const paginatedGuides = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredGuides.slice(start, start + itemsPerPage);
  }, [filteredGuides, currentPage, itemsPerPage]);

  return {
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    totalPages,
    paginatedGuides,
    totalCount: filteredGuides.length
  };
};
