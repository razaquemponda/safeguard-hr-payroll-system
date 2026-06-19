// src/lib/supabaseClient.ts

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  db: {
    schema: 'public',
  },
});

// Helper to ensure tenant isolation in queries
export const withTenantFilter = <T>(query: any): any => {
  // This is a helper function - the real enforcement is at the database level via RLS
  return query;
};

// Get current user's tenant ID
export const getCurrentTenantId = async (): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (error) throw error;
    return data?.tenant_id || null;
  } catch (error) {
    console.error('Error fetching tenant ID:', error);
    return null;
  }
};

// Set tenant context for the session
export const setTenantContext = async (tenantId: string): Promise<void> => {
  try {
    await supabase.rpc('set_tenant_context', { tenant_id: tenantId });
  } catch (error) {
    console.error('Error setting tenant context:', error);
  }
};