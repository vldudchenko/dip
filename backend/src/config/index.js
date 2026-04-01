import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT,
  
  // Supabase
  supabaseUrl: process.env.SUPABASE_Project_URL,
  supabaseAnonKey: process.env.SUPABASE_Anon_Key,
  supabaseServiceRoleKey: process.env.SUPABASE_Service_Role_Key,
  
  // Yandex OAuth
  yandexOAuthClientId: process.env.YANDEX_OAUTH_CLIENT_ID,
  yandexOAuthClientSecret: process.env.YANDEX_OAUTH_CLIENT_SECRET,
  yandexOAuthRedirectUri: process.env.YANDEX_OAUTH_REDIRECT_URI,
  
  // Yandex Maps
  yandexMapsApiKey: process.env.YANDEX_MAPS_API_KEY,
  
  // Frontend URL
  clientUrl: process.env.CLIENT_URL,
  
  // App config
  defaultRadius: parseFloat(process.env.DEFAULT_RADIUS),
  maxVideoSizeMb: parseInt(process.env.MAX_VIDEO_SIZE_MB),
};

export default config;
