-- supabase/migrations/20240618000000_create_indexes.sql

-- ============================================
-- EMPLOYEES TABLE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_employees_region_id ON employees(region_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_employee_number ON employees(employee_number);
CREATE INDEX IF NOT EXISTS idx_employees_full_name ON employees(full_name);
CREATE INDEX IF NOT EXISTS idx_employees_position ON employees(position);

-- ============================================
-- PAYROLL TABLE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_payroll_month ON payroll(month);
CREATE INDEX IF NOT EXISTS idx_payroll_employee_id ON payroll(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_month_employee ON payroll(month, employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_processed_at ON payroll(processed_at);

-- ============================================
-- ATTENDANCE TABLE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_id ON attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance(employee_id, date);

-- ============================================
-- EMPLOYEE DEDUCTIONS TABLE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_employee_deductions_month ON employee_deductions(month);
CREATE INDEX IF NOT EXISTS idx_employee_deductions_employee_id ON employee_deductions(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_deductions_employee_month ON employee_deductions(employee_id, month);

-- ============================================
-- PROFILES TABLE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_region_id ON profiles(region_id);
CREATE INDEX IF NOT EXISTS idx_profiles_is_super_admin ON profiles(is_super_admin);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);