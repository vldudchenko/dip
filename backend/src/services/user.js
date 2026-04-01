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
}

export const userService = new UserService();
export default userService;
