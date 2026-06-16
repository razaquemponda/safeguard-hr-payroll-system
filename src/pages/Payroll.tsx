import { useState, useEffect } from 'react';
import { Search, Wallet, Calculator, Check, FileText, CheckCircle2, ChevronRight, Save, TrendingUp, Users, DollarSign } from 'lucide-react';
import { Card, Button, Badge, PageHeader, THead, TBody, TR, TH, TD, Modal } from '../components/ui';
import { formatKwacha } from '../data';
import { supabase } from '../lib/supabase';
import { getAvailableMonths, getCurrentMonth, isFutureMonth } from '../utils/dateUtils';
import { MonthSelector } from '../components/MonthSelector';
import { EmptyState } from '../components/EmptyState';
import { CopyFromPreviousModal } from '../components/CopyFromPreviousModal';

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
  net_pay: number;
  processed_at: string;
}

export function PayrollPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
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

  const calculatePayroll = (employee: Employee, customValues?: Partial<PayrollRecord>): PayrollRecord => {
    const basicSalary = customValues?.basic_salary ?? employee.basic_salary;
    const allowances = customValues?.allowances ?? Math.round(basicSalary * 0.10);
    const overtime = customValues?.overtime ?? Math.round(basicSalary * 0.05);
    const bonus = customValues?.bonus ?? 0;
    const grossPay = basicSalary + allowances + overtime + bonus;
    const paye = customValues?.paye ?? Math.round(grossPay * 0.30);
    const pension = customValues?.pension ?? Math.round(grossPay * 0.05);
    const netPay = grossPay - paye - pension;
    
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

  const updateField = (employeeId: string, field: keyof PayrollRecord, value: number) => {
    setEditingValues(prev => ({
      ...prev,
      [employeeId]: { ...prev[employeeId], [field]: value }
    }));
  };

  const processPayroll = async () => {
    setProcessing(true);
    try {
      const payrollToSave: any[] = [];
      for (const employee of employees) {
        const existing = getPayrollForEmployee(employee.id);
        const edited = editingValues[employee.id];
        const payroll = calculatePayroll(employee, edited);
        
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
    let gross = 0, net = 0, paye = 0, pension = 0;
    employees.forEach(emp => {
      const p = getDisplayPayroll(emp);
      gross += p.gross_pay;
      net += p.net_pay;
      paye += p.paye;
      pension += p.pension;
    });
    return { gross, net, paye, pension };
  };

  const totals = getTotals();
  const filteredEmployees = employees.filter(e =>
    e.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.employee_number?.toLowerCase().includes(search.toLowerCase())
  );

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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-5 bg-gradient-to-br from-[#081C3A] to-[#1a2f5c] text-white"><p className="text-xs text-white/70">Total Employees</p><p className="text-2xl font-bold mt-1">{employees.length}</p><p className="text-xs text-[#D4A017] mt-2">Active Staff</p></Card>
        <Card className="p-5"><div className="flex items-start justify-between"><div><p className="text-xs text-slate-500">Gross Pay</p><p className="text-xl font-bold text-slate-800 mt-1">{formatKwacha(totals.gross)}</p></div><div className="w-10 h-10 rounded-lg bg-[#E8EDF5] text-[#081C3A] flex items-center justify-center"><Wallet size={18} /></div></div></Card>
        <Card className="p-5"><div className="flex items-start justify-between"><div><p className="text-xs text-slate-500">Total Deductions</p><p className="text-xl font-bold text-slate-800 mt-1">{formatKwacha(totals.paye + totals.pension)}</p><p className="text-xs text-slate-500 mt-1">PAYE: {formatKwacha(totals.paye)}</p></div><div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center"><Calculator size={18} /></div></div></Card>
        <Card className="p-5 bg-gradient-to-br from-[#FFF9E5] to-[#FFF1CC] border-[#D4A017]/30"><div className="flex items-start justify-between"><div><p className="text-xs text-[#8B6F0F]">Net Pay</p><p className="text-2xl font-bold text-[#081C3A] mt-1">{formatKwacha(totals.net)}</p><p className="text-xs text-[#8B6F0F] mt-1">Total Disbursement</p></div><div className="w-10 h-10 rounded-lg bg-[#081C3A] text-[#D4A017] flex items-center justify-center"><ChevronRight size={18} /></div></div></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5"><h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2"><Calculator size={16} className="text-[#D4A017]" /> Gross Pay Formula</h3><p className="text-sm text-slate-600">= Basic Salary + Allowances (10%) + Overtime (5%) + Bonus</p></Card>
        <Card className="p-5"><h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2"><Calculator size={16} className="text-[#D4A017]" /> Net Pay Formula</h3><p className="text-sm text-slate-600">= Gross Pay - PAYE (30%) - Pension (5%)</p></Card>
      </div>

      <Card className="p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employees..." className="w-full pl-10 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#081C3A]" /></div>
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
            <THead><TR hover={false}><TH>Employee</TH><TH>Position</TH><TH className="text-right">Basic</TH><TH className="text-right">Allowances</TH><TH className="text-right">Overtime</TH><TH className="text-right">Bonus</TH><TH className="text-right bg-emerald-50/50">Gross</TH><TH className="text-right bg-red-50/50">Net Pay</TH></TR></THead>
            <TBody>
              {filteredEmployees.slice(0, 50).map(emp => {
                const p = getDisplayPayroll(emp);
                return (
                  <TR key={emp.id}>
                    <TD><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-[#081C3A] text-white text-xs font-bold flex items-center justify-center">{emp.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}</div><div><p className="text-sm font-medium text-slate-800">{emp.full_name}</p><p className="text-xs text-slate-500">{emp.employee_number}</p></div></div></TD>
                    <TD className="text-xs">{emp.position}</TD>
                    <TD className="text-right"><input type="number" value={p.basic_salary} onChange={e => updateField(emp.id, 'basic_salary', Number(e.target.value))} className="w-24 text-right text-xs border border-slate-200 rounded px-1 py-0.5 focus:ring-1 focus:ring-[#081C3A]" /></TD>
                    <TD className="text-right"><input type="number" value={p.allowances} onChange={e => updateField(emp.id, 'allowances', Number(e.target.value))} className="w-20 text-right text-xs border border-slate-200 rounded px-1 py-0.5 focus:ring-1 focus:ring-[#081C3A]" /></TD>
                    <TD className="text-right"><input type="number" value={p.overtime} onChange={e => updateField(emp.id, 'overtime', Number(e.target.value))} className="w-20 text-right text-xs border border-slate-200 rounded px-1 py-0.5 focus:ring-1 focus:ring-[#081C3A]" /></TD>
                    <TD className="text-right"><input type="number" value={p.bonus} onChange={e => updateField(emp.id, 'bonus', Number(e.target.value))} className="w-20 text-right text-xs border border-slate-200 rounded px-1 py-0.5 focus:ring-1 focus:ring-[#081C3A]" /></TD>
                    <TD className="text-right font-mono font-semibold text-emerald-700 bg-emerald-50/50">{formatKwacha(p.gross_pay)}</TD>
                    <TD className="text-right font-mono font-bold text-[#081C3A] bg-slate-100">{formatKwacha(p.net_pay)}</TD>
                  </TR>
                );
              })}
            </TBody>
          </table>
        </div>
      </div>

      <Modal open={showConfirmModal} onClose={() => setShowConfirmModal(false)} title={`Process Payroll — ${selectedMonth}`} size="lg">
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-[#E8EDF5] text-sm text-slate-700 flex items-start gap-3"><CheckCircle2 size={18} className="text-[#081C3A] shrink-0 mt-0.5" /><div><strong>Confirmation:</strong> You are about to process payroll for <strong>{employees.length} employees</strong> for the period <strong>{selectedMonth}</strong>.</div></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="p-3 rounded-lg border border-slate-100"><p className="text-slate-500 text-xs">Gross Pay</p><p className="font-bold text-slate-800 mt-1">{formatKwacha(totals.gross)}</p></div>
            <div className="p-3 rounded-lg border border-slate-100"><p className="text-slate-500 text-xs">Net Pay</p><p className="font-bold text-[#081C3A] mt-1">{formatKwacha(totals.net)}</p></div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100"><Button variant="outline" onClick={() => setShowConfirmModal(false)}>Cancel</Button><Button variant="secondary" onClick={processPayroll} disabled={processing}><Save size={14} /> {processing ? 'Processing...' : 'Process & Save Payroll'}</Button></div>
        </div>
      </Modal>

      {processed && (<div className="fixed bottom-4 right-4 z-50 p-4 rounded-xl bg-emerald-600 text-white shadow-2xl animate-fade-in max-w-sm"><div className="flex items-start gap-3"><CheckCircle2 size={22} /><div><p className="font-semibold">Payroll Processed</p><p className="text-sm opacity-90">{employees.length} payroll records saved for {selectedMonth}</p></div><button onClick={() => setProcessed(false)} className="ml-4 text-white/80 hover:text-white">✕</button></div></div>)}

      <CopyFromPreviousModal open={showCopyModal} onClose={() => setShowCopyModal(false)} onConfirm={copyFromPreviousMonth} currentMonth={selectedMonth} availableMonths={availableMonths} />
    </div>
  );
}