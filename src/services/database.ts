import { supabase } from '../lib/supabase';

// ============ EMPLOYEES ============
export const getEmployees = async () => {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .order('full_name');
  if (error) throw error;
  return data;
};

export const addEmployee = async (employee: any) => {
  const { data, error } = await supabase
    .from('employees')
    .insert([employee])
    .select();
  if (error) throw error;
  return data[0];
};

export const updateEmployee = async (id: string, updates: any) => {
  const { data, error } = await supabase
    .from('employees')
    .update(updates)
    .eq('id', id)
    .select();
  if (error) throw error;
  return data[0];
};

export const deleteEmployee = async (id: string) => {
  const { error } = await supabase
    .from('employees')
    .delete()
    .eq('id', id);
  if (error) throw error;
  return true;
};

// ============ APPLICANTS ============
export const getApplicants = async () => {
  const { data, error } = await supabase
    .from('applicants')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const addApplicant = async (applicant: any) => {
  const { data, error } = await supabase
    .from('applicants')
    .insert([applicant])
    .select();
  if (error) throw error;
  return data[0];
};

export const updateApplicantStatus = async (id: string, status: string, decision: string) => {
  const { data, error } = await supabase
    .from('applicants')
    .update({ interview_status: status, decision })
    .eq('id', id)
    .select();
  if (error) throw error;
  return data[0];
};

export const deleteApplicant = async (id: string) => {
  const { error } = await supabase
    .from('applicants')
    .delete()
    .eq('id', id);
  if (error) throw error;
  return true;
};

// ============ ATTENDANCE ============
export const getAttendance = async (employeeId: string, month: string, year: string) => {
  const startDate = `${year}-${month}-01`;
  const endDate = `${year}-${month}-31`;
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('employee_id', employeeId)
    .gte('date', startDate)
    .lte('date', endDate);
  if (error) throw error;
  return data;
};

export const saveAttendance = async (employeeId: string, date: string, status: string) => {
  const { error } = await supabase
    .from('attendance')
    .upsert({ employee_id: employeeId, date, status }, { onConflict: 'employee_id,date' });
  if (error) throw error;
  return true;
};

// ============ PAYROLL ============
export const getPayroll = async (month: string, year: string) => {
  const monthStr = `${month} ${year}`;
  const { data, error } = await supabase
    .from('payroll')
    .select('*, employees(full_name, position, department)')
    .eq('month', monthStr);
  if (error) throw error;
  return data;
};

export const savePayroll = async (payrollRecords: any[]) => {
  const { error } = await supabase
    .from('payroll')
    .upsert(payrollRecords);
  if (error) throw error;
  return true;
};

// ============ DASHBOARD STATS ============
export const getDashboardStats = async () => {
  const [employeesResult, payrollResult] = await Promise.all([
    supabase.from('employees').select('*', { count: 'exact', head: true }),
    supabase.from('payroll').select('net_pay')
  ]);
  
  return {
    totalEmployees: employeesResult.count || 0,
    totalPayroll: payrollResult.data?.reduce((sum, p) => sum + (p.net_pay || 0), 0) || 0,
    activeEmployees: 0, // Will be updated later
    onLeave: 0
  };
};