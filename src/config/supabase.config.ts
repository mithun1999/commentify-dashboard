export const supabaseConfig = {
  supabaseUrl:
    (import.meta.env.VITE_SUPABASE_URL as string) ||
    'https://ojstdwhcstgtyjegscev.supabase.co',
  supabaseKey:
    (import.meta.env.VITE_SUPABASE_KEY as string) ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qc3Rkd2hjc3RndHlqZWdzY2V2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzOTg0NTMsImV4cCI6MjA3ODk3NDQ1M30.zql7REzPfja-kmQAwZ-rDa8mlnEpDK3LG8gZ9Nn-8vA',
}
