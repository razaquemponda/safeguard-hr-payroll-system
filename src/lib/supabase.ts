import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jaqpnslmzgmybrjspece.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphcXBuc2xtemdteWJyanNwZWNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NDY4MzQsImV4cCI6MjA5NjIyMjgzNH0.Kfr_i53upL1mA12hq4s9fh2i4YSa3-biVrxxlQk3jC0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Get current user's role
export const getUserRole = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  
  return data?.role || 'staff';
};

// Get current user's profile
export const getUserProfile = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  
  return data;
};

// Update user's role (admin only)
export const updateUserRole = async (userId: string, role: string) => {
  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId);
  
  if (error) throw error;
  return true;
};