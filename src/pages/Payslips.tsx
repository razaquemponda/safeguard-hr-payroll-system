import { useState, useEffect } from 'react';
import { Shield, FileDown, FileText, Download, Printer, Search } from 'lucide-react';
import { Card, Button, Badge, PageHeader, Modal } from '../components/ui';
import { formatKwacha } from '../data';
import { supabase } from '../lib/supabase';
import { generatePayslipPDF } from '../utils/pdfExport';
import { getAvailableMonths, getCurrentMonth, isFutureMonth } from '../utils/dateUtils';
import { MonthSelector } from '../components/MonthSelector';
import { EmptyState } from '../components/EmptyState';

interface Employee {
  id: string;
  employee_number: string;
  full_name: string;
  position: string;
  department: string;
  basic_salary: number;
  status: string;
  region_id?: string;
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

export function PayslipsPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [viewPayslip, setViewPayslip] = useState<{ employee: Employee; payroll: PayrollRecord | null } | null>(null);
  const [hasData, setHasData] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const availableMonths = getAvailableMonths();

  // Fetch user profile for region access
  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*, regions(*)')
          .eq('id', user.id)
          .single();
        setUserProfile(profile);
      }
    };
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (userProfile) {
      fetchData();
    }
  }, [selectedMonth, userProfile]);

  const checkDataExists = async (month: string) => {
    let query = supabase
      .from('payroll')
      .select('id', { count: 'exact', head: true })
      .eq('month', month);
    
    // Apply region filter
    if (!userProfile?.is_super_admin && userProfile?.region_id) {
      const { data: regionEmployees } = await supabase
        .from('employees')
        .select('id')
        .eq('region_id', userProfile.region_id);
      const employeeIds = regionEmployees?.map(e => e.id) || [];
      if (employeeIds.length > 0) {
        query = query.in('employee_id', employeeIds);
      }
    }
    
    const { count, error } = await query;
    if (error) return false;
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
      await fetchData();
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch employees with region filter
      let employeesQuery = supabase
        .from('employees')
        .select('id, employee_number, full_name, position, department, basic_salary, status, region_id');
      
      if (!userProfile?.is_super_admin && userProfile?.region_id) {
        employeesQuery = employeesQuery.eq('region_id', userProfile.region_id);
      }
      
      const { data: employeesData, error: empError } = await employeesQuery;
      if (empError) throw empError;
      setEmployees(employeesData || []);
      
      // Fetch payroll records with region filter
      let payrollQuery = supabase
        .from('payroll')
        .select('*')
        .eq('month', selectedMonth);
      
      if (!userProfile?.is_super_admin && userProfile?.region_id) {
        const employeeIds = (employeesData || []).map(e => e.id);
        if (employeeIds.length > 0) {
          payrollQuery = payrollQuery.in('employee_id', employeeIds);
        }
      }
      
      const { data: payrollData, error: payError } = await payrollQuery;
      if (payError) throw payError;
      setPayrollRecords(payrollData || []);
      setHasData((payrollData?.length || 0) > 0);
    } catch (err: any) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPayrollForEmployee = (employeeId: string): PayrollRecord | null => {
    return payrollRecords.find(p => p.employee_id === employeeId) || null;
  };

  const calculatePayroll = (employee: Employee): PayrollRecord => {
    const basicSalary = employee.basic_salary || 0;
    const allowances = Math.round(basicSalary * 0.10);
    const overtime = Math.round(basicSalary * 0.05);
    const bonus = Math.round(basicSalary * 0.02);
    const grossPay = basicSalary + allowances + overtime + bonus;
    const paye = Math.round(grossPay * 0.30);
    const pension = Math.round(grossPay * 0.05);
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
    return calculatePayroll(employee);
  };

  const filteredEmployees = employees.filter(e =>
    e.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.employee_number?.toLowerCase().includes(search.toLowerCase())
  );

  const isSuperAdmin = userProfile?.is_super_admin;
  const userRegion = userProfile?.regions;

  const PayslipModal = () => {
    if (!viewPayslip) return null;
    const { employee, payroll } = viewPayslip;
    const p = payroll || calculatePayroll(employee);
    
    return (
      <Modal open={!!viewPayslip} onClose={() => setViewPayslip(null)} title="Payslip Preview" size="lg">
        <div className="space-y-5">
          <div className="p-6 rounded-lg border-2 border-slate-200 bg-white" id="payslip-content">
            <div className="flex items-start justify-between pb-4 border-b-2 border-[#081C3A]">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-[#081C3A] flex items-center justify-center">
                  <Shield size={24} className="text-[#D4A017]" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-[#081C3A]">SAFEGUARD SECURITY SERVICES</h1>
                  <p className="text-xs text-slate-500">Lilongwe, Malawi · (+265) 1 234 567</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-[#081C3A]">PAYSLIP</p>
                <p className="text-xs text-slate-500">{selectedMonth}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 text-xs border-b border-slate-100">
              <div><p className="text-slate-500">Employee</p><p className="font-semibold text-slate-800">{employee.full_name}</p></div>
              <div><p className="text-slate-500">Employee No.</p><p className="font-semibold text-slate-800">{employee.employee_number}</p></div>
              <div><p className="text-slate-500">Position</p><p className="font-semibold text-slate-800">{employee.position}</p></div>
              <div><p className="text-slate-500">Department</p><p className="font-semibold text-slate-800">{employee.department}</p></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              <div>
                <h3 className="text-xs font-bold text-[#081C3A] uppercase tracking-wider mb-3 pb-2 border-b border-slate-200">Earnings</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-slate-600">Basic Salary</span><span className="font-mono text-slate-800">{formatKwacha(p.basic_salary)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Allowances</span><span className="font-mono text-slate-800">{formatKwacha(p.allowances)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Overtime</span><span className="font-mono text-slate-800">{formatKwacha(p.overtime)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Bonus</span><span className="font-mono text-slate-800">{formatKwacha(p.bonus)}</span></div>
                  <div className="flex justify-between pt-2 mt-2 border-t border-slate-200 font-bold"><span>Gross Pay</span><span className="font-mono text-[#081C3A]">{formatKwacha(p.gross_pay)}</span></div>
                </div>
              </div>
              <div>
                <h3 className="text-xs font-bold text-[#081C3A] uppercase tracking-wider mb-3 pb-2 border-b border-slate-200">Deductions</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between"><span className="text-slate-600">PAYE Tax</span><span className="font-mono text-red-600">-{formatKwacha(p.paye)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Pension</span><span className="font-mono text-red-600">-{formatKwacha(p.pension)}</span></div>
                  <div className="flex justify-between pt-2 mt-2 border-t border-slate-200 font-bold"><span>Total Deductions</span><span className="font-mono text-red-600">-{formatKwacha(p.paye + p.pension)}</span></div>
                </div>
              </div>
            </div>
            <div className="p-5 rounded-lg bg-gradient-to-r from-[#081C3A] to-[#1a2f5c] text-white flex items-center justify-between">
              <div><p className="text-xs opacity-80 uppercase tracking-wider">Total Net Pay</p><p className="text-3xl font-bold text-[#D4A017]">{formatKwacha(p.net_pay)}</p></div>
            </div>
            <p className="text-center text-xs text-slate-400 mt-4">This is a system-generated payslip. No signature required.</p>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => window.print()}><Printer size={14} /> Print</Button>
            <Button variant="secondary" onClick={() => generatePayslipPDF(employee.full_name, employee.employee_number, formatKwacha(p.net_pay))}><Download size={14} /> Download PDF</Button>
          </div>
        </div>
      </Modal>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-[#D4A017] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Payslips"
        subtitle={isSuperAdmin ? "Generate and print professional payslips" : `${userRegion?.name || ''} Region - Payslips`}
        actions={
          <div className="flex gap-2">
            <MonthSelector
              selectedMonth={selectedMonth}
              onMonthChange={handleMonthChange}
              availableMonths={availableMonths}
              isLoading={loading}
            />
            <Button variant="secondary"><FileDown size={16} /> Bulk Download</Button>
          </div>
        }
      />

      {!isSuperAdmin && userRegion && (
        <Card className="p-3 bg-gradient-to-r from-[#081C3A]/5 to-transparent border-[#081C3A]/20">
          <p className="text-sm text-slate-600">
            Viewing payslips for <strong className="text-[#081C3A]">{userRegion.name}</strong> region
          </p>
        </Card>
      )}

      <Card className="p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="Search employees..." 
            className="w-full pl-10 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#081C3A]" 
          />
        </div>
        <div className="text-sm text-slate-500">{filteredEmployees.length} payslips ready</div>
      </Card>

      {!hasData ? (
        <EmptyState
          title="No Payslips Found"
          message={`No payroll records found for ${selectedMonth}. Please process payroll for this month first.`}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEmployees.slice(0, 18).map(emp => {
            const payroll = getDisplayPayroll(emp);
            return (
              <Card key={emp.id} className="p-5 hover:shadow-lg cursor-pointer transition-shadow" onClick={() => setViewPayslip({ employee: emp, payroll })}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#081C3A] text-white text-xs font-bold flex items-center justify-center">
                      {emp.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{emp.full_name}</p>
                      <p className="text-xs text-slate-500">{emp.employee_number}</p>
                    </div>
                  </div>
                  <Badge color={payroll.id ? 'green' : 'yellow'}>{payroll.id ? 'Processed' : 'Pending'}</Badge>
                </div>
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs text-slate-500 mb-1">{selectedMonth} · Net Pay</p>
                  <p className="text-2xl font-bold text-[#081C3A]">{formatKwacha(payroll.net_pay)}</p>
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" className="text-xs py-1.5 flex-1" onClick={(e) => { e.stopPropagation(); window.print(); }}>
                      <Printer size={12} /> Print
                    </Button>
                    <Button variant="secondary" className="text-xs py-1.5 flex-1" onClick={(e) => { e.stopPropagation(); generatePayslipPDF(emp.full_name, emp.employee_number, formatKwacha(payroll.net_pay)); }}>
                      <Download size={12} /> PDF
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <PayslipModal />
    </div>
  );
}