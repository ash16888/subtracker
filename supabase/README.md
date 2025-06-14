# Supabase Setup Instructions

## 1. Create a new Supabase project

1. Go to [https://supabase.com](https://supabase.com)
2. Create a new project
3. Save your project URL and anon key

## 2. Run the database schema

1. Go to SQL Editor in your Supabase dashboard
2. Copy the contents of `schema.sql`
3. Run the SQL query

## 3. Configure your local environment

1. Copy `.env.example` to `.env`
2. Replace the placeholder values with your actual Supabase credentials:
   - `VITE_SUPABASE_URL`: Your project URL
   - `VITE_SUPABASE_ANON_KEY`: Your anon/public key

## 4. Enable Authentication

1. Go to Authentication → Providers in Supabase dashboard
2. Enable Email provider
3. Configure email templates if needed

## 5. Security Notes

- Row Level Security (RLS) is enabled on the subscriptions table
- Users can only access their own subscription data
- The anon key is safe to use in the frontend as RLS policies protect the data