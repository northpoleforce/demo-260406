import { createClient } from '@supabase/supabase-js';
import { AppConfig } from './config';

export const supabase = createClient(
  AppConfig.supabase.url,
  AppConfig.supabase.anonKey
);

// We define the interface matching your new table schema
export interface DishRecord {
  id: number | string;
  image_url: string;
  content: string;
  created_at: string;
}
