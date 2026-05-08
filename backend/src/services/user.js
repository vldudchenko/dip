import { supabaseAdmin } from '../db/supabase.js';

/**
 * Сервис для работы с пользователями
 */
class UserService {
  /**
   * Получает пользователя по ID
   */
  async getUserById(id) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    return data;
  }

  /**
   * Получает пользователя по логину
   */
  async getUserByLogin(login) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('login', login)
      .single();

    if (error) throw error;

    return data;
  }

  /**
   * Обновляет статус is_guide у пользователя
   */
  async updateUserIsGuide(id, isGuide) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ is_guide: isGuide })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return data;
  }
  /**
   * Поиск пользователей (гидов) по логину или ФИО
   */
  async searchUsers(query) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .or(`login.ilike.%${query}%,full_name.ilike.%${query}%`)
      .eq('is_guide', true); // Ищем только гидов по просьбе пользователя

    if (error) throw error;

    return data;
  }
}

export const userService = new UserService();
export default userService;
