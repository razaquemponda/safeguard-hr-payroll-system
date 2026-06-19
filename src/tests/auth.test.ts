// Check if your auth is working properly
// Create a test file: src/tests/auth.test.ts

import { supabase } from '../lib/supabase';

// Test 1: Login with valid credentials
const testLogin = async () => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'admin@safeguard.mw',
    password: 'Admin1980'
  });
  
  if (error) {
    console.error('❌ Login failed:', error.message);
  } else {
    console.log('✅ Login successful:', data.user.email);
  }
};

// Test 2: Access protected route without auth
const testProtectedRoute = async () => {
  // Try to fetch employees without auth
  const { data, error } = await supabase
    .from('employees')
    .select('*');
  
  if (error) {
    console.log('✅ Protected: Access denied without auth');
  } else {
    console.error('❌ Security breach: Data accessible without auth');
  }
};

// Test 3: Region-based access control
const testRegionAccess = async () => {
  // Mock a user from Central region
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('region_id', 'some-other-region-id');
  
  // Should return empty or error
  console.log('Region access test:', data?.length === 0 ? '✅' : '❌');
};