import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client using service role key
// Used in Server Actions and API Routes only
export function createServerSupabaseClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error(
            'Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
        );
    }

    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false },
    });
}
