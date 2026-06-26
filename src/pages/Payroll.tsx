import { useState, useEffect } from 'react';
import { Search, Wallet, Calculator, Check, FileText, CheckCircle2, ChevronRight, Save, TrendingUp, Users, DollarSign, AlertCircle } from 'lucide-react';
import { Card, Button, Badge, PageHeader, THead, TBody, TR, TH, TD, Modal } from '../components/ui';
import { formatKwacha } from '../data';
import { supabase } from '../lib/supabase';
import { getAvailableMonths, getCurrentMonth, isFutureMonth } from '../utils/dateUtils';
import { MonthSelector } from '../components/MonthSelector';
import { EmptyState } from '../components/EmptyState';
import { CopyFromPreviousModal } from '../components/CopyFromPreviousModal';
// ===== NEW: Import sanitization =====
import { sanitizeInput } from '../utils/securityHeaders';

interface Employee {
  id: string;
  employee_number: string;
  full_name: string;
  position: string;
  department: string;
  basic_salary: number;
  status: string;
}

interface PayrollRecord {
  id: string;
  employee_id: string;
  month: string;
  basic_salary: number;
  allowances: number;
  overtime: number;
  bonus: number;
  gross_pay: number;
  paye: number;
  pension: number;
  uniform_deduction: number;
  net_pay: number;
  processed_at: string;
}

// NEW: Interface for employee deductions
interface EmployeeDeduction {
  id: string;
  employee_id: string;
  month: string;
  absent_days: number;
  late_days: number;
  absent_deduction: number;
  late_deduction: number;
  lecture_missed: number;
  lecture_deduction: number;
  appearance_deduction: number;
  total_deductions: number;
}

export function PayrollPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [employeeDeductions, setEmployeeDeductions] = useState<EmployeeDeduction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processed, setProcessed] = useState(false);
  const [editingValues, setEditingValues] = useState<Record<string, Partial<PayrollRecord>>>({});
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [hasData, setHasData] = useState(true);
  const availableMonths = getAvailableMonths();

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  const checkDataExists = async (month: string) => {
    const { count, error } = await supabase
      .from('payroll')
      .select('id', { count: 'exact', head: true })
      .eq('month', month);
    if (error) {
      console.error('Error checking payroll data:', error);
      return false;
    }
    return (count || 0) > 0;
  };

  const handleMonthChange = async (newMonth: string) => {
    if (isFutureMonth(newMonth)) {
      alert('Cannot view future months. Please select a current or past month.');
      return;
    }
    setSelectedMonth(newMonth);
    setLoading(true);
    try {
      const exists = await checkDataExists(newMonth);
      setHasData(exists);
      if (!exists && newMonth < getCurrentMonth()) {
        setShowCopyModal(true);
      }
      await fetchData();
    } finally {
      setLoading(false);
    }
  };

  const copyFromPreviousMonth = async (sourceMonth: string) => {
    const { data: sourceData, error: sourceError } = await supabase
      .from('payroll')
      .select('*')
      .eq('month', sourceMonth);
    
    if (sourceError) {
      console.error('Error fetching source data:', sourceError);
      return;
    }
    
    if (sourceData && sourceData.length > 0) {
      const newRecords = sourceData.map(record => ({
        employee_id: record.employee_id,
        month: selectedMonth,
        basic_salary: record.basic_salary,
        allowances: record.allowances,
        overtime: record.overtime,
        bonus: record.bonus,
        gross_pay: record.gross_pay,
        paye: record.paye,
        pension: record.pension,
        uniform_deduction: record.uniform_deduction || 0,
        net_pay: record.net_pay,
        processed_at: new Date().toISOString()
      }));
      
      const { error: insertError } = await supabase
        .from('payroll')
        .insert(newRecords);
      
      if (insertError) {
        console.error('Error copying data:', insertError);
        alert('Failed to copy data: ' + insertError.message);
      } else {
        await fetchData();
        setHasData(true);
        alert(`Payroll data copied from ${sourceMonth} to ${selectedMonth}`);
      }
    }
  };

  const fetchEmployeeDeductions = async () => {
    try {
      const { data, error } = await supabase
        .from('employee_deductions')
        .select('*')
        .eq('month', selectedMonth);

      if (error) throw error;
      setEmployeeDeductions(data || []);
      return data || [];
    } catch (err) {
      console.error('Error fetching employee deductions:', err);
      return [];
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: employeesData, error: empError } = await supabase
        .from('employees')
        .select('id, employee_number, full_name, position, department, basic_salary, status')
        .eq('status', 'Active');
      
      if (empError) throw empError;
      setEmployees(employeesData || []);
      
      const { data: payrollData, error: payError } = await supabase
        .from('payroll')
        .select('*')
        .eq('month', selectedMonth);
      
      if (payError) throw payError;
      setPayrollRecords(payrollData || []);
      
      await fetchEmployeeDeductions();
      
      setHasData((payrollData?.length || 0) > 0);
      
    } catch (err: any) {
      console.error('Error fetching data:', err);
      alert('Failed to load payroll data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getPayrollForEmployee = (employeeId: string): PayrollRecord | null => {
    return payrollRecords.find(p => p.employee_id === employeeId) || null;
  };

  const getEmployeeDeduction = (employeeId: string): EmployeeDeduction | null => {
    return employeeDeductions.find(d => d.employee_id === employeeId) || null;
  };

  const calculatePayroll = (employee: Employee, customValues?: Partial<PayrollRecord>): PayrollRecord => {
    const basicSalary = customValues?.basic_salary ?? employee.basic_salary;
    const allowances = customValues?.allowances ?? Math.round(basicSalary * 0.10);
    const overtime = customValues?.overtime ?? Math.round(basicSalary * 0.05);
    const bonus = customValues?.bonus ?? 0;
    const grossPay = basicSalary + allowances + overtime + bonus;
    const paye = customValues?.paye ?? Math.round(grossPay * 0.30);
    const pension = customValues?.pension ?? Math.round(grossPay * 0.05);
    
    const deduction = getEmployeeDeduction(employee.id);
    const uniformDeduction = customValues?.uniform_deduction ?? (deduction?.total_deductions || 0);
    
    const netPay = grossPay - paye - pension - uniformDeduction;
    
    return {
      id: '',
      employee_id: employee.id,
      month: selectedMonth,
      basic_salary: basicSalary,
      allowances,
      overtime,
      bonus,
      gross_pay: grossPay,
      paye,
      pension,
      uniform_deduction: uniformDeduction,
      net_pay: netPay,
      processed_at: new Date().toISOString()
    };
  };

  const getDisplayPayroll = (employee: Employee): PayrollRecord => {
    const existing = getPayrollForEmployee(employee.id);
    if (existing) return existing;
    const edited = editingValues[employee.id];
    return calculatePayroll(employee, edited);
  };

  // ===== UPDATED: updateField with sanitization =====
  const updateField = (employeeId: string, field: keyof PayrollRecord, value: number) => {
    // Sanitize the value - ensure it's a valid non-negative number
    const safeValue = Math.max(0, Number(value) || 0);
    
    setEditingValues(prev => ({
      ...prev,
      [employeeId]: { ...prev[employeeId], [field]: safeValue }
    }));
  };

  // ===== UPDATED: processPayroll with sanitization =====
  const processPayroll = async () => {
    setProcessing(true);
    try {
      await fetchEmployeeDeductions();
      
      // Sanitize all editing values before processing
      const sanitizedEditingValues: Record<string, Partial<PayrollRecord>> = {};
      Object.keys(editingValues).forEach(key => {
        const values = editingValues[key];
        const sanitized: Partial<PayrollRecord> = {};
        Object.keys(values).forEach(field => {
          const value = values[field as keyof PayrollRecord];
          sanitized[field as keyof PayrollRecord] = typeof value === 'number' 
            ? Math.max(0, value) 
            : value;
        });
        sanitizedEditingValues[key] = sanitized;
      });
      
      const payrollToSave: any[] = [];
      for (const employee of employees) {
        const existing = getPayrollForEmployee(employee.id);
        const edited = sanitizedEditingValues[employee.id];
        
        const deduction = getEmployeeDeduction(employee.id);
        const uniformDeduction = edited?.uniform_deduction ?? (deduction?.total_deductions || 0);
        
        const payroll = calculatePayroll(employee, { ...edited, uniform_deduction: uniformDeduction });
        
        if (existing) {
          payrollToSave.push({
            id: existing.id,
            employee_id: employee.id,
            month: selectedMonth,
            basic_salary: payroll.basic_salary,
            allowances: payroll.allowances,
            overtime: payroll.overtime,
            bonus: payroll.bonus,
            gross_pay: payroll.gross_pay,
            paye: payroll.paye,
            pension: payroll.pension,
            uniform_deduction: payroll.uniform_deduction,
            net_pay: payroll.net_pay,
            processed_at: new Date().toISOString()
          });
        } else {
          payrollToSave.push({
            employee_id: employee.id,
            month: selectedMonth,
            basic_salary: payroll.basic_salary,
            allowances: payroll.allowances,
            overtime: payroll.overtime,
            bonus: payroll.bonus,
            gross_pay: payroll.gross_pay,
            paye: payroll.paye,
            pension: payroll.pension,
            uniform_deduction: payroll.uniform_deduction,
            net_pay: payroll.net_pay,
            processed_at: new Date().toISOString()
          });
        }
      }
      
      for (const record of payrollToSave) {
        if (record.id) {
          await supabase.from('payroll').update(record).eq('id', record.id);
        } else {
          await supabase.from('payroll').insert(record);
        }
      }
      
      setProcessed(true);
      setShowConfirmModal(false);
      setEditingValues({});
      await fetchData();
      setTimeout(() => setProcessed(false), 5000);
    } catch (err: any) {
      console.error('Error processing payroll:', err);
      alert('Failed to process payroll: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const getTotals = () => {
    let gross = 0, net = 0, paye = 0, pension = 0, uniformDeductions = 0;
    employees.forEach(emp => {
      const p = getDisplayPayroll(emp);
      gross += p.gross_pay;
      net += p.net_pay;
      paye += p.paye;
      pension += p.pension;
      uniformDeductions += p.uniform_deduction || 0;
    });
    return { gross, net, paye, pension, uniformDeductions };
  };

  const totals = getTotals();
  
  // ===== UPDATED: Filter employees with sanitized search =====
  const filteredEmployees = employees.filter(e => {
    const safeSearch = sanitizeInput(search).toLowerCase();
    return e.full_name?.toLowerCase().includes(safeSearch) ||
           e.employee_number?.toLowerCase().includes(safeSearch);
  });

  const employeesWithDeductions = employees.filter(emp => {
    const deduction = getEmployeeDeduction(emp.id);
    return deduction && deduction.total_deductions > 0;
  });

  if (loading) {
    return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-[#D4A017] border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Payroll Management"
        subtitle={`${selectedMonth} Payroll Run · Editable payroll engine with real-time calculations`}
        actions={
          <div className="flex gap-2">
            <MonthSelector
              selectedMonth={selectedMonth}
              onMonthChange={handleMonthChange}
              availableMonths={availableMonths}
              isLoading={loading}
            />
            <Button variant="secondary" onClick={() => setShowConfirmModal(true)}>
              <Check size={16} /> Process Payroll
            </Button>
          </div>
        }
      />

      {employeesWithDeductions.length > 0 && (
        <Card className="p-4 bg-amber-50 border-amber-200 border">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                Attendance Deductions Applied
              </p>
              <p className="text-sm text-amber-700">
                {employeesWithDeductions.length} employee(s) have attendance/uniform deductions for this month. 
                These will be automatically included in the payroll calculation.
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-5 bg-gradient-to-br from-[#081C3A] to-[#1a2f5c] text-white">
          <p className="text-xs text-white/70">Total Employees</p>
          <p className="text-2xl font-bold mt-1">{employees.length}</p>
          <p className="text-xs text-[#D4A017] mt-2">Active Staff</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-500">Gross Pay</p>
              <p className="text-xl font-bold text-slate-800 mt-1">{formatKwacha(totals.gross)}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#E8EDF5] text-[#081C3A] flex items-center justify-center">
              <Wallet size={18} />
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-500">Total Deductions</p>
              <p className="text-xl font-bold text-slate-800 mt-1">{formatKwacha(totals.paye + totals.pension + totals.uniformDeductions)}</p>
              <p className="text-xs text-slate-500 mt-1">PAYE: {formatKwacha(totals.paye)}</p>
              <p className="text-xs text-red-500 mt-1">Uniform: {formatKwacha(totals.uniformDeductions)}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
              <Calculator size={18} />
            </div>
          </div>
        </Card>
        <Card className="p-5 bg-gradient-to-br from-[#FFF9E5] to-[#FFF1CC] border-[#D4A017]/30">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-[#8B6F0F]">Net Pay</p>
              <p className="text-2xl font-bold text-[#081C3A] mt-1">{formatKwacha(totals.net)}</p>
              <p className="text-xs text-[#8B6F0F] mt-1">Total Disbursement</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#081C3A] text-[#D4A017] flex items-center justify-center">
              <ChevronRight size={18} />
            </div>
          </div>
        </Card>
        <Card className="p-5 bg-red-50 border-red-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-red-600">Uniform/Attendance</p>
              <p className="text-xl font-bold text-red-600 mt-1">{formatKwacha(totals.uniformDeductions)}</p>
              <p className="text-xs text-red-500 mt-1">{employeesWithDeductions.length} employees</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-red-200 text-red-700 flex items-center justify-center">
              <AlertCircle size={18} />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Calculator size={16} className="text-[#D4A017]" /> Gross Pay Formula
          </h3>
          <p className="text-sm text-slate-600">= Basic Salary + Allowances (10%) + Overtime (5%) + Bonus</p>
        </Card>
        <Card className="p-5">
          <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Calculator size={16} className="text-[#D4A017]" /> Net Pay Formula
          </h3>
          <p className="text-sm text-slate-600">= Gross Pay - PAYE (30%) - Pension (5%) - Uniform/Attendance Deductions</p>
        </Card>
      </div>

      <Card className="p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          {/* ===== UPDATED: Search input with sanitization ===== */}
          <input 
            value={search} 
            onChange={e => setSearch(sanitizeInput(e.target.value))} 
            placeholder="Search employees..." 
            className="w-full pl-10 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#081C3A]" 
          />
        </div>
        <div className="text-sm text-slate-500">{filteredEmployees.length} employees</div>
      </Card>

      {!hasData && (
        <EmptyState
          title="No Payroll Records"
          message={`No payroll data found for ${selectedMonth}. Would you like to copy from a previous month or process payroll?`}
          actionLabel="Copy from Previous Month"
          onAction={() => setShowCopyModal(true)}
        />
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <THead>
              <TR hover={false}>
                <TH>Employee</TH>
                <TH>Position</TH>
                <TH className="text-right">Basic</TH>
                <TH className="text-right">Allowances</TH>
                <TH className="text-right">Overtime</TH>
                <TH className="text-right">Bonus</TH>
                <TH className="text-right bg-emerald-50/50">Gross</TH>
                <TH className="text-right bg-red-50/50">Uniform/Att</TH>
                <TH className="text-right bg-slate-100">Net Pay</TH>
              </TR>
            </THead>
            <TBody>
              {filteredEmployees.slice(0, 50).map(emp => {
                const p = getDisplayPayroll(emp);
                const deduction = getEmployeeDeduction(emp.id);
                const hasDeduction = deduction && deduction.total_deductions > 0;
                
                return (
                  <TR key={emp.id}>
                    <TD>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#081C3A] text-white text-xs font-bold flex items-center justify-center">
                          {emp.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{emp.full_name}</p>
                          <p className="text-xs text-slate-500">{emp.employee_number}</p>
                          {hasDeduction && (
                            <Badge color="red" className="text-[10px] mt-0.5">Deductions</Badge>
                          )}
                        </div>
                      </div>
                    </TD>
                    <TD className="text-xs">{emp.position}</TD>
                    <TD className="text-right">
                      <input 
                        type="number" 
                        value={p.basic_salary} 
                        onChange={e => updateField(emp.id, 'basic_salary', Number(e.target.value))} 
                        className="w-24 text-right text-xs border border-slate-200 rounded px-1 py-0.5 focus:ring-1 focus:ring-[#081C3A]" 
                      />
                    </TD>
                    <TD className="text-right">
                      <input 
                        type="number" 
                        value={p.allowances} 
                        onChange={e => updateField(emp.id, 'allowances', Number(e.target.value))} 
                        className="w-20 text-right text-xs border border-slate-200 rounded px-1 py-0.5 focus:ring-1 focus:ring-[#081C3A]" 
                      />
                    </TD>
                    <TD className="text-right">
                      <input 
                        type="number" 
                        value={p.overtime} 
                        onChange={e => updateField(emp.id, 'overtime', Number(e.target.value))} 
                        className="w-20 text-right text-xs border border-slate-200 rounded px-1 py-0.5 focus:ring-1 focus:ring-[#081C3A]" 
                      />
                    </TD>
                    <TD className="text-right">
                      <input 
                        type="number" 
                        value={p.bonus} 
                        onChange={e => updateField(emp.id, 'bonus', Number(e.target.value))} 
                        className="w-20 text-right text-xs border border-slate-200 rounded px-1 py-0.5 focus:ring-1 focus:ring-[#081C3A]" 
                      />
                    </TD>
                    <TD className="text-right font-mono font-semibold text-emerald-700 bg-emerald-50/50">
                      {formatKwacha(p.gross_pay)}
                    </TD>
                    <TD className={`text-right font-mono font-semibold ${hasDeduction ? 'text-red-600' : 'text-slate-500'} bg-red-50/50`}>
                      {formatKwacha(p.uniform_deduction || 0)}
                      {hasDeduction && (
                        <div className="text-[10px] text-red-400">
                          {deduction?.absent_days || 0}A, {deduction?.late_days || 0}L, {deduction?.lecture_missed || 0}Lec
                        </div>
                      )}
                    </TD>
                    <TD className="text-right font-mono font-bold text-[#081C3A] bg-slate-100">
                      {formatKwacha(p.net_pay)}
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </table>
        </div>
      </div>

      <Modal open={showConfirmModal} onClose={() => setShowConfirmModal(false)} title={`Process Payroll — ${selectedMonth}`} size="lg">
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-[#E8EDF5] text-sm text-slate-700 flex items-start gap-3">
            <CheckCircle2 size={18} className="text-[#081C3A] shrink-0 mt-0.5" />
            <div>
              <strong>Confirmation:</strong> You are about to process payroll for <strong>{employees.length} employees</strong> for the period <strong>{selectedMonth}</strong>.
            </div>
          </div>
          
          {employeesWithDeductions.length > 0 && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm">
              <p className="font-semibold text-red-800 flex items-center gap-2">
                <AlertCircle size={16} />
                Attendance/Uniform Deductions Applied
              </p>
              <p className="text-red-700 mt-1">
                {employeesWithDeductions.length} employees have attendance/uniform deductions totaling {formatKwacha(totals.uniformDeductions)}
              </p>
              <div className="mt-2 max-h-32 overflow-y-auto">
                {employeesWithDeductions.slice(0, 5).map(emp => {
                  const deduction = getEmployeeDeduction(emp.id);
                  return (
                    <div key={emp.id} className="flex justify-between text-xs py-1 border-b border-red-100 last:border-0">
                      <span>{emp.full_name}</span>
                      <span className="font-medium text-red-600">{formatKwacha(deduction?.total_deductions || 0)}</span>
                    </div>
                  );
                })}
                {employeesWithDeductions.length > 5 && (
                  <p className="text-xs text-red-500 mt-1">...and {employeesWithDeductions.length - 5} more</p>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="p-3 rounded-lg border border-slate-100">
              <p className="text-slate-500 text-xs">Gross Pay</p>
              <p className="font-bold text-slate-800 mt-1">{formatKwacha(totals.gross)}</p>
            </div>
            <div className="p-3 rounded-lg border border-slate-100">
              <p className="text-slate-500 text-xs">Uniform/Att</p>
              <p className="font-bold text-red-600 mt-1">{formatKwacha(totals.uniformDeductions)}</p>
            </div>
            <div className="p-3 rounded-lg border border-slate-100">
              <p className="text-slate-500 text-xs">Total Deductions</p>
              <p className="font-bold text-slate-800 mt-1">{formatKwacha(totals.paye + totals.pension + totals.uniformDeductions)}</p>
            </div>
            <div className="p-3 rounded-lg border border-slate-100 bg-[#FFF9E5]">
              <p className="text-slate-500 text-xs">Net Pay</p>
              <p className="font-bold text-[#081C3A] mt-1">{formatKwacha(totals.net)}</p>
            </div>
          </div>
          
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setShowConfirmModal(false)}>Cancel</Button>
            <Button variant="secondary" onClick={processPayroll} disabled={processing}>
              <Save size={14} /> {processing ? 'Processing...' : 'Process & Save Payroll'}
            </Button>
          </div>
        </div>
      </Modal>

      {processed && (
        <div className="fixed bottom-4 right-4 z-50 p-4 rounded-xl bg-emerald-600 text-white shadow-2xl animate-fade-in max-w-sm">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={22} />
            <div>
              <p className="font-semibold">Payroll Processed</p>
              <p className="text-sm opacity-90">{employees.length} payroll records saved for {selectedMonth}</p>
              {totals.uniformDeductions > 0 && (
                <p className="text-sm opacity-80 mt-1">Including {formatKwacha(totals.uniformDeductions)} in deductions</p>
              )}
            </div>
            <button onClick={() => setProcessed(false)} className="ml-4 text-white/80 hover:text-white">✕</button>
          </div>
        </div>
      )}

      <CopyFromPreviousModal 
        open={showCopyModal} 
        onClose={() => setShowCopyModal(false)} 
        onConfirm={copyFromPreviousMonth} 
        currentMonth={selectedMonth} 
        availableMonths={availableMonths} 
      />
    </div>
  );
}

export default PayrollPage;