-- ============================================
-- MIGRATION: Tenant Isolation & RLS Security
-- Date: 2024-06-19
-- Description: Add tenant_id to all tables, implement RLS policies
-- ============================================

-- ============================================
-- PART 1: Add tenant_id to all tables
-- ============================================

-- Add tenant_id to employees table
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Add tenant_id to payroll table
ALTER TABLE payroll 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Add tenant_id to attendance table
ALTER TABLE attendance 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Add tenant_id to employee_deductions table
ALTER TABLE employee_deductions 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Add tenant_id to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Add tenant_id to audit_logs table
ALTER TABLE audit_logs 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Add tenant_id to settings table
ALTER TABLE settings 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Add tenant_id to positions table
ALTER TABLE positions 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Add tenant_id to regions table
ALTER TABLE regions 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- ============================================
-- PART 2: Set default tenant for existing data
-- ============================================

-- Create default tenant if none exists
INSERT INTO tenants (id, name, code, created_at)
SELECT 
  gen_random_uuid(),
  'Default Organization',
  'DEFAULT',
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM tenants LIMIT 1);

-- Update existing records with default tenant
UPDATE employees SET tenant_id = (SELECT id FROM tenants LIMIT 1) WHERE tenant_id IS NULL;
UPDATE payroll SET tenant_id = (SELECT id FROM tenants LIMIT 1) WHERE tenant_id IS NULL;
UPDATE attendance SET tenant_id = (SELECT id FROM tenants LIMIT 1) WHERE tenant_id IS NULL;
UPDATE employee_deductions SET tenant_id = (SELECT id FROM tenants LIMIT 1) WHERE tenant_id IS NULL;
UPDATE profiles SET tenant_id = (SELECT id FROM tenants LIMIT 1) WHERE tenant_id IS NULL;
UPDATE audit_logs SET tenant_id = (SELECT id FROM tenants LIMIT 1) WHERE tenant_id IS NULL;
UPDATE settings SET tenant_id = (SELECT id FROM tenants LIMIT 1) WHERE tenant_id IS NULL;
UPDATE positions SET tenant_id = (SELECT id FROM tenants LIMIT 1) WHERE tenant_id IS NULL;
UPDATE regions SET tenant_id = (SELECT id FROM tenants LIMIT 1) WHERE tenant_id IS NULL;

-- Make tenant_id NOT NULL after setting defaults
ALTER TABLE employees ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE payroll ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE attendance ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE employee_deductions ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE profiles ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE audit_logs ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE settings ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE positions ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE regions ALTER COLUMN tenant_id SET NOT NULL;

-- ============================================
-- PART 3: Create Composite Indexes for Performance
-- ============================================

-- Employees table indexes
CREATE INDEX IF NOT EXISTS idx_employees_tenant_id ON employees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employees_tenant_region ON employees(tenant_id, region_id);
CREATE INDEX IF NOT EXISTS idx_employees_tenant_status ON employees(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_employees_tenant_employee ON employees(tenant_id, employee_number);
CREATE INDEX IF NOT EXISTS idx_employees_tenant_name ON employees(tenant_id, full_name);

-- Payroll table indexes
CREATE INDEX IF NOT EXISTS idx_payroll_tenant_id ON payroll(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payroll_tenant_month ON payroll(tenant_id, month);
CREATE INDEX IF NOT EXISTS idx_payroll_tenant_employee ON payroll(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_tenant_month_employee ON payroll(tenant_id, month, employee_id);

-- Attendance table indexes
CREATE INDEX IF NOT EXISTS idx_attendance_tenant_id ON attendance(tenant_id);
CREATE INDEX IF NOT EXISTS idx_attendance_tenant_date ON attendance(tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_tenant_employee ON attendance(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_tenant_employee_date ON attendance(tenant_id, employee_id, date);

-- Employee deductions table indexes
CREATE INDEX IF NOT EXISTS idx_employee_deductions_tenant_id ON employee_deductions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employee_deductions_tenant_month ON employee_deductions(tenant_id, month);
CREATE INDEX IF NOT EXISTS idx_employee_deductions_tenant_employee ON employee_deductions(tenant_id, employee_id);

-- Profiles table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_email ON profiles(tenant_id, email);
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_role ON profiles(tenant_id, role_level);

-- Audit logs table indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created ON audit_logs(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_user ON audit_logs(tenant_id, user_id);

-- Regions table indexes
CREATE INDEX IF NOT EXISTS idx_regions_tenant_id ON regions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_regions_tenant_code ON regions(tenant_id, code);

-- ============================================
-- PART 4: Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER FUNCTION: Get current tenant ID
-- ============================================

CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT tenant_id 
    FROM profiles 
    WHERE id = auth.uid() 
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- HELPER FUNCTION: Check if user is super admin
-- ============================================

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT is_super_admin 
    FROM profiles 
    WHERE id = auth.uid() 
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TENANTS TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view their own tenant" ON tenants;
CREATE POLICY "Users can view their own tenant" ON tenants
FOR SELECT
USING (
  id = get_current_tenant_id() OR is_super_admin() = true
);

DROP POLICY IF EXISTS "Only super admins can modify tenants" ON tenants;
CREATE POLICY "Only super admins can modify tenants" ON tenants
FOR ALL
USING (is_super_admin() = true)
WITH CHECK (is_super_admin() = true);

-- ============================================
-- EMPLOYEES TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view employees in their tenant" ON employees;
CREATE POLICY "Users can view employees in their tenant" ON employees
FOR SELECT
USING (
  tenant_id = get_current_tenant_id() OR is_super_admin() = true
);

DROP POLICY IF EXISTS "Users can insert employees in their tenant" ON employees;
CREATE POLICY "Users can insert employees in their tenant" ON employees
FOR INSERT
WITH CHECK (
  tenant_id = get_current_tenant_id() OR is_super_admin() = true
);

DROP POLICY IF EXISTS "Users can update employees in their tenant" ON employees;
CREATE POLICY "Users can update employees in their tenant" ON employees
FOR UPDATE
USING (
  tenant_id = get_current_tenant_id() OR is_super_admin() = true
)
WITH CHECK (
  tenant_id = get_current_tenant_id() OR is_super_admin() = true
);

DROP POLICY IF EXISTS "Users can delete employees in their tenant" ON employees;
CREATE POLICY "Users can delete employees in their tenant" ON employees
FOR DELETE
USING (
  tenant_id = get_current_tenant_id() OR is_super_admin() = true
);

-- ============================================
-- PAYROLL TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view payroll in their tenant" ON payroll;
CREATE POLICY "Users can view payroll in their tenant" ON payroll
FOR SELECT
USING (
  tenant_id = get_current_tenant_id() OR is_super_admin() = true
);

DROP POLICY IF EXISTS "Users can insert payroll in their tenant" ON payroll;
CREATE POLICY "Users can insert payroll in their tenant" ON payroll
FOR INSERT
WITH CHECK (
  tenant_id = get_current_tenant_id() OR is_super_admin() = true
);

DROP POLICY IF EXISTS "Users can update payroll in their tenant" ON payroll;
CREATE POLICY "Users can update payroll in their tenant" ON payroll
FOR UPDATE
USING (
  tenant_id = get_current_tenant_id() OR is_super_admin() = true
)
WITH CHECK (
  tenant_id = get_current_tenant_id() OR is_super_admin() = true
);

DROP POLICY IF EXISTS "Users can delete payroll in their tenant" ON payroll;
CREATE POLICY "Users can delete payroll in their tenant" ON payroll
FOR DELETE
USING (
  tenant_id = get_current_tenant_id() OR is_super_admin() = true
);

-- ============================================
-- ATTENDANCE TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view attendance in their tenant" ON attendance;
CREATE POLICY "Users can view attendance in their tenant" ON attendance
FOR SELECT
USING (
  tenant_id = get_current_tenant_id() OR is_super_admin() = true
);

DROP POLICY IF EXISTS "Users can insert attendance in their tenant" ON attendance;
CREATE POLICY "Users can insert attendance in their tenant" ON attendance
FOR INSERT
WITH CHECK (
  tenant_id = get_current_tenant_id() OR is_super_admin() = true
);

DROP POLICY IF EXISTS "Users can update attendance in their tenant" ON attendance;
CREATE POLICY "Users can update attendance in their tenant" ON attendance
FOR UPDATE
USING (
  tenant_id = get_current_tenant_id() OR is_super_admin() = true
)
WITH CHECK (
  tenant_id = get_current_tenant_id() OR is_super_admin() = true
);

DROP POLICY IF EXISTS "Users can delete attendance in their tenant" ON attendance;
CREATE POLICY "Users can delete attendance in their tenant" ON attendance
FOR DELETE
USING (
  tenant_id = get_current_tenant_id() OR is_super_admin() = true
);

-- ============================================
-- EMPLOYEE DEDUCTIONS TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view deductions in their tenant" ON employee_deductions;
CREATE POLICY "Users can view deductions in their tenant" ON employee_deductions
FOR SELECT
USING (
  tenant_id = get_current_tenant_id() OR is_super_admin() = true
);

DROP POLICY IF EXISTS "Users can insert deductions in their tenant" ON employee_deductions;
CREATE POLICY "Users can insert deductions in their tenant" ON employee_deductions
FOR INSERT
WITH CHECK (
  tenant_id = get_current_tenant_id() OR is_super_admin() = true
);

DROP POLICY IF EXISTS "Users can update deductions in their tenant" ON employee_deductions;
CREATE POLICY "Users can update deductions in their tenant" ON employee_deductions
FOR UPDATE
USING (
  tenant_id = get_current_tenant_id() OR is_super_admin() = true
)
WITH CHECK (
  tenant_id = get_current_tenant_id() OR is_super_admin() = true
);

DROP POLICY IF EXISTS "Users can delete deductions in their tenant" ON employee_deductions;
CREATE POLICY "Users can delete deductions in their tenant" ON employee_deductions
FOR DELETE
USING (
  tenant_id = get_current_tenant_id() OR is_super_admin() = true
);

-- ============================================
-- PROFILES TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view profiles in their tenant" ON profiles;
CREATE POLICY "Users can view profiles in their tenant" ON profiles
FOR SELECT
USING (
  tenant_id = get_current_tenant_id() OR is_super_admin() = true
);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles
FOR UPDATE
USING (
  id = auth.uid() OR is_super_admin() = true
)
WITH CHECK (
  tenant_id = get_current_tenant_id() OR is_super_admin() = true
);

-- ============================================
-- AUDIT LOGS TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view audit logs in their tenant" ON audit_logs;
CREATE POLICY "Users can view audit logs in their tenant" ON audit_logs
FOR SELECT
USING (
  tenant_id = get_current_tenant_id() OR is_super_admin() = true
);

DROP POLICY IF EXISTS "Users can insert audit logs" ON audit_logs;
CREATE POLICY "Users can insert audit logs" ON audit_logs
FOR INSERT
WITH CHECK (
  tenant_id = get_current_tenant_id() OR is_super_admin() = true
);

-- ============================================
-- REGIONS TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view regions in their tenant" ON regions;
CREATE POLICY "Users can view regions in their tenant" ON regions
FOR SELECT
USING (
  tenant_id = get_current_tenant_id() OR is_super_admin() = true
);

DROP POLICY IF EXISTS "Users can insert regions in their tenant" ON regions;
CREATE POLICY "Users can insert regions in their tenant" ON regions
FOR INSERT
WITH CHECK (
  tenant_id = get_current_tenant_id() OR is_super_admin() = true
);

DROP POLICY IF EXISTS "Users can update regions in their tenant" ON regions;
CREATE POLICY "Users can update regions in their tenant" ON regions
FOR UPDATE
USING (
  tenant_id = get_current_tenant_id() OR is_super_admin() = true
)
WITH CHECK (
  tenant_id = get_current_tenant_id() OR is_super_admin() = true
);

-- ============================================
-- SETTINGS TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view settings in their tenant" ON settings;
CREATE POLICY "Users can view settings in their tenant" ON settings
FOR SELECT
USING (
  tenant_id = get_current_tenant_id() OR is_super_admin() = true
);

DROP POLICY IF EXISTS "Users can update settings in their tenant" ON settings;
CREATE POLICY "Users can update settings in their tenant" ON settings
FOR UPDATE
USING (
  tenant_id = get_current_tenant_id() OR is_super_admin() = true
)
WITH CHECK (
  tenant_id = get_current_tenant_id() OR is_super_admin() = true
);

-- ============================================
-- POSITIONS TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view positions in their tenant" ON positions;
CREATE POLICY "Users can view positions in their tenant" ON positions
FOR SELECT
USING (
  tenant_id = get_current_tenant_id() OR is_super_admin() = true
);

DROP POLICY IF EXISTS "Users can insert positions in their tenant" ON positions;
CREATE POLICY "Users can insert positions in their tenant" ON positions
FOR INSERT
WITH CHECK (
  tenant_id = get_current_tenant_id() OR is_super_admin() = true
);

DROP POLICY IF EXISTS "Users can update positions in their tenant" ON positions;
CREATE POLICY "Users can update positions in their tenant" ON positions
FOR UPDATE
USING (
  tenant_id = get_current_tenant_id() OR is_super_admin() = true
)
WITH CHECK (
  tenant_id = get_current_tenant_id() OR is_super_admin() = true
);

-- ============================================
-- PART 5: Query Performance Analysis
-- ============================================

-- Function to analyze query performance
CREATE OR REPLACE FUNCTION analyze_query_performance(query_text TEXT)
RETURNS TABLE (
  plan TEXT,
  execution_time NUMERIC
) AS $$
BEGIN
  RETURN QUERY EXECUTE 'EXPLAIN ANALYZE ' || query_text;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PART 6: Backup Strategy - Automated Backup Function
-- ============================================

-- Create backup log table
CREATE TABLE IF NOT EXISTS backup_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  table_name VARCHAR(100) NOT NULL,
  backup_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  record_count INTEGER,
  backup_size_bytes BIGINT,
  status VARCHAR(20) DEFAULT 'success'
);

-- Enable RLS on backup_logs
ALTER TABLE backup_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view backup logs in their tenant" ON backup_logs
FOR SELECT
USING (
  tenant_id = get_current_tenant_id() OR is_super_admin() = true
);

-- ============================================
-- PART 7: Tenant Context Helper Functions
-- ============================================

-- Set tenant context for the session
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', tenant_id::TEXT, false);
END;
$$ LANGUAGE plpgsql;

-- Get current tenant context
CREATE OR REPLACE FUNCTION get_tenant_context()
RETURNS UUID AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_tenant_id', true), '')::UUID;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PART 8: Verify RLS is working
-- ============================================

-- Run this to check RLS status
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================
-- PART 9: Clean up - Remove old policies if they exist
-- ============================================

-- This section ensures we don't have conflicting policies
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN (
    SELECT policyname, tablename 
    FROM pg_policies 
    WHERE schemaname = 'public'
    AND policyname LIKE '%region%'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_record.policyname, policy_record.tablename);
  END LOOP;
END $$;

-- ============================================
-- PART 10: Final Verification Queries
-- ============================================

-- Check if all tables have tenant_id
SELECT 
  table_name,
  column_name
FROM information_schema.columns
WHERE column_name = 'tenant_id'
AND table_schema = 'public'
ORDER BY table_name;

-- Check if all tables have RLS enabled
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'tenants', 'employees', 'payroll', 'attendance', 
  'employee_deductions', 'profiles', 'audit_logs', 
  'settings', 'positions', 'regions'
)
ORDER BY tablename;