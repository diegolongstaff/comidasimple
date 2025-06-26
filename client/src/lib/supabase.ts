// Note: We're using Drizzle directly instead of Supabase client
// This file provides environment variables and helper functions

export const supabaseConfig = {
  url: process.env.SUPABASE_URL || 'https://agziccjqlmttcfroniuj.supabase.co',
  anonKey: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnemljY2pxbG10dGNmcm9uaXVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczMzQzMDEsImV4cCI6MjA2MjkxMDMwMX0.N_a_oir58xpWb665WlleeoL7oWkVHy40IFLyDzx6-lU'
};

// We use the backend API for all data operations instead of direct Supabase calls
// This ensures proper authentication and authorization through our Express routes
