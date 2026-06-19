// src/utils/databaseIndexes.ts

import { supabase } from '../lib/supabase';
import { logger } from './logging';

// Check if indexes exist
export const checkIndexes = async (): Promise<{
  exists: boolean;
  missing: string[];
}> => {
  const requiredIndexes = [
    'idx_employees_region_id',
    'idx_employees_status',
    'idx_payroll_month',
    'idx_payroll_employee_id',
    'idx_attendance_date',
    'idx_attendance_employee_id',
    'idx_employee_deductions_month',
    'idx_employee_deductions_employee_id',
    'idx_profiles_region_id'
  ];
  
  try {
    const { data, error } = await supabase
      .rpc('list_indexes'); // You need to create this function in Supabase
    
    if (error) throw error;
    
    const existingIndexes = data.map((row: any) => row.indexname);
    const missing = requiredIndexes.filter(idx => !existingIndexes.includes(idx));
    
    return {
      exists: missing.length === 0,
      missing
    };
  } catch (error) {
    logger.error('Error checking indexes:', error);
    return { exists: false, missing: requiredIndexes };
  }
};

// Create a function in Supabase to list indexes
// Run this SQL in Supabase SQL Editor:
/*
CREATE OR REPLACE FUNCTION list_indexes()
RETURNS TABLE (
  schemaname text,
  tablename text,
  indexname text,
  indexdef text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.nspname as schemaname,
    c.relname as tablename,
    i.relname as indexname,
    pg_get_indexdef(i.oid) as indexdef
  FROM
    pg_index x
    JOIN pg_class c ON c.oid = x.indrelid
    JOIN pg_class i ON i.oid = x.indexrelid
    LEFT JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE
    n.nspname = 'public';
END;
$$ LANGUAGE plpgsql;
*/