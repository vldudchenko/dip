import { createClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';

// Supabase client с anon key для обычных запросов (с RLS)
export const supabaseAnon = createClient(
  config.supabaseUrl,
  config.supabaseAnonKey
);

// Supabase client с service role key для обхода RLS (административные операции)
export const supabaseAdmin = createClient(
  config.supabaseUrl,
  config.supabaseServiceRoleKey
);

export default { supabaseAnon, supabaseAdmin };
