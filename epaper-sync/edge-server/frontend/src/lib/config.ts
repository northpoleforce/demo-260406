export const AppConfig = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    tableName: process.env.NEXT_PUBLIC_SUPABASE_TABLE_NAME || 'photo_text',
  },
  // If in the future you change column names, you can define them here
  schema: {
    imageUrlColumn: 'image_url',
    contentColumn: 'content',
  }
};
