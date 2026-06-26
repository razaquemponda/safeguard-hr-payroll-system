import { useState, useEffect } from 'react';
import { FileDown, FileSpreadsheet, FileText, TrendingUp, Users, DollarSign, Calendar, UserCheck, Building2, Briefcase, MapPin, PieChart } from 'lucide-react';
import { Card, Button, Badge, PageHeader, THead, TBody, TR, TH, TD } from '../components/ui';
import { formatKwacha } from '../data';
import { supabase } from '../lib/supabase';
import { getAvailableMonths, getCurrentMonth, isFutureMonth } from '../utils/dateUtils';
import { MonthSelector } from '../components/MonthSelector';
import { EmptyState } from '../components/EmptyState';
// ===== NEW: Import sanitization =====
import { sanitizeInput } from '../utils/securityHeaders';

type ReportType = 'employee' | 'payroll' | 'attendance' | 'recruitment' | 'department' | 'company' | 'workstation';

interface Employee {
  id: string;
  employee_number: string;
  full_name: string;
  position: string;
  department: string;
  basic_salary: number;
  status: string;
  region_id?: string;
  company?: string;
  workstation?: string;
}

interface PayrollRecord {
  id: string;
  employee_id: string;
  month: string;
  gross_pay: number;
  paye: number;
  pension: number;
  net_pay: number;
}

interface Applicant {
  id: string;
  name: string;
  position: string;
  qualification: string;
  interview_status: string;
  application_date: string;
}

interface CompanyStats {
  name: string;
  totalEmployees: number;
  activeEmployees: number;
  totalPayroll: number;
  workstations: WorkstationStats[];
}

interface WorkstationStats {
  name: string;
  employeeCount: number;
  activeCount: number;
  payrollTotal: number;
}

export function ReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportType>('company');
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
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
  }, [selectedMonth, activeReport, userProfile]);

  const checkDataExists = async () => {
    if (activeReport === 'payroll') {
      let query = supabase
        .from('payroll')
        .select('id', { count: 'exact', head: true })
        .eq('month', selectedMonth);
      
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
      
      const { count } = await query;
      setHasData((count || 0) > 0);
    } else if (activeReport === 'employee') {
      setHasData(employees.length > 0);
    } else if (activeReport === 'recruitment') {
      setHasData(applicants.length > 0);
    } else {
      setHasData(true);
    }
  };

  const handleMonthChange = async (newMonth: string) => {
    if (isFutureMonth(newMonth) && activeReport === 'payroll') {
      alert('Cannot view future months. Please select a current or past month.');
      return;
    }
    // ===== NEW: Sanitize month input =====
    const safeMonth = sanitizeInput(newMonth);
    setSelectedMonth(safeMonth);
    setLoading(true);
    await fetchData();
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch employees with region filter
      let employeesQuery = supabase.from('employees').select('*');
      if (!userProfile?.is_super_admin && userProfile?.region_id) {
        employeesQuery = employeesQuery.eq('region_id', userProfile.region_id);
      }
      
      const { data: employeesData, error: empError } = await employeesQuery;
      if (empError) throw empError;
      setEmployees(employeesData || []);
      
      // Fetch payroll records with region filter
      let payrollQuery = supabase.from('payroll').select('*').eq('month', selectedMonth);
      if (!userProfile?.is_super_admin && userProfile?.region_id) {
        const employeeIds = (employeesData || []).map(e => e.id);
        if (employeeIds.length > 0) {
          payrollQuery = payrollQuery.in('employee_id', employeeIds);
        }
      }
      
      const { data: payrollData, error: payError } = await payrollQuery;
      if (payError) throw payError;
      setPayrollRecords(payrollData || []);
      
      // Fetch applicants
      const { data: applicantsData, error: appError } = await supabase
        .from('applicants')
        .select('*')
        .order('created_at', { ascending: false });
      if (appError) throw appError;
      setApplicants(applicantsData || []);
      
      await checkDataExists();
    } catch (err: any) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDepartmentData = () => {
    const deptMap: Record<string, { count: number; totalPayroll: number }> = {};
    employees.forEach(emp => {
      const deptName = emp.department || 'Other';
      if (!deptMap[deptName]) {
        deptMap[deptName] = { count: 0, totalPayroll: 0 };
      }
      deptMap[deptName].count++;
      const payroll = payrollRecords.find(p => p.employee_id === emp.id);
      deptMap[deptName].totalPayroll += payroll?.net_pay || emp.basic_salary || 0;
    });
    return Object.entries(deptMap).map(([name, data]) => ({
      name,
      employees: data.count,
      totalPayroll: data.totalPayroll,
      average: data.totalPayroll / data.count,
      attendance: (94 + Math.random() * 5).toFixed(1)
    }));
  };

  // Get Company Statistics
  const getCompanyData = (): CompanyStats[] => {
    const companyMap: Record<string, CompanyStats> = {};
    
    employees.forEach(emp => {
      // ===== NEW: Sanitize company name =====
      const companyName = emp.company ? sanitizeInput(emp.company) : 'Unassigned';
      if (!companyMap[companyName]) {
        companyMap[companyName] = {
          name: companyName,
          totalEmployees: 0,
          activeEmployees: 0,
          totalPayroll: 0,
          workstations: {}
        };
      }
      
      companyMap[companyName].totalEmployees++;
      if (emp.status === 'Active') {
        companyMap[companyName].activeEmployees++;
      }
      
      const payroll = payrollRecords.find(p => p.employee_id === emp.id);
      companyMap[companyName].totalPayroll += payroll?.net_pay || emp.basic_salary || 0;
      
      // Track workstations per company
      // ===== NEW: Sanitize workstation name =====
      const workstationName = emp.workstation ? sanitizeInput(emp.workstation) : 'Unassigned';
      if (!companyMap[companyName].workstations[workstationName]) {
        companyMap[companyName].workstations[workstationName] = {
          name: workstationName,
          employeeCount: 0,
          activeCount: 0,
          payrollTotal: 0
        };
      }
      companyMap[companyName].workstations[workstationName].employeeCount++;
      if (emp.status === 'Active') {
        companyMap[companyName].workstations[workstationName].activeCount++;
      }
      companyMap[companyName].workstations[workstationName].payrollTotal += payroll?.net_pay || emp.basic_salary || 0;
    });
    
    // Convert workstations object to array
    return Object.values(companyMap).map(company => ({
      ...company,
      workstations: Object.values(company.workstations)
    }));
  };

  // Get Workstation Statistics (across all companies)
  const getWorkstationData = () => {
    const workstationMap: Record<string, { count: number; activeCount: number; payrollTotal: number; companies: Record<string, number> }> = {};
    
    employees.forEach(emp => {
      // ===== NEW: Sanitize workstation name =====
      const workstationName = emp.workstation ? sanitizeInput(emp.workstation) : 'Unassigned';
      // ===== NEW: Sanitize company name =====
      const companyName = emp.company ? sanitizeInput(emp.company) : 'Unassigned';
      
      if (!workstationMap[workstationName]) {
        workstationMap[workstationName] = {
          count: 0,
          activeCount: 0,
          payrollTotal: 0,
          companies: {}
        };
      }
      
      workstationMap[workstationName].count++;
      if (emp.status === 'Active') {
        workstationMap[workstationName].activeCount++;
      }
      
      const payroll = payrollRecords.find(p => p.employee_id === emp.id);
      workstationMap[workstationName].payrollTotal += payroll?.net_pay || emp.basic_salary || 0;
      workstationMap[workstationName].companies[companyName] = (workstationMap[workstationName].companies[companyName] || 0) + 1;
    });
    
    return Object.entries(workstationMap).map(([name, data]) => ({
      name,
      totalEmployees: data.count,
      activeEmployees: data.activeCount,
      totalPayroll: data.payrollTotal,
      companies: data.companies
    })).sort((a, b) => b.totalEmployees - a.totalEmployees);
  };

  const getPayrollSummary = () => {
    let totalGross = 0, totalNet = 0, totalPAYE = 0, totalPension = 0;
    payrollRecords.forEach(record => {
      totalGross += record.gross_pay || 0;
      totalNet += record.net_pay || 0;
      totalPAYE += record.paye || 0;
      totalPension += record.pension || 0;
    });
    if (payrollRecords.length === 0) {
      employees.forEach(emp => {
        totalGross += emp.basic_salary || 0;
        totalNet += emp.basic_salary || 0;
      });
    }
    return { totalGross, totalNet, totalPAYE, totalPension };
  };

  const departmentData = getDepartmentData();
  const companyData = getCompanyData();
  const workstationData = getWorkstationData();
  const payrollSummary = getPayrollSummary();

  const getCurrentReportData = () => {
    switch(activeReport) {
      case 'employee':
        return {
          title: 'Employee Report',
          headers: ['Name', 'Employee ID', 'Company', 'Workstation', 'Position', 'Department', 'Status', 'Salary'],
          rows: employees.map(emp => [
            // ===== NEW: Sanitize all employee data for display =====
            sanitizeInput(emp.full_name),
            sanitizeInput(emp.employee_number),
            sanitizeInput(emp.company || '-'),
            sanitizeInput(emp.workstation || '-'),
            sanitizeInput(emp.position),
            sanitizeInput(emp.department || '-'),
            sanitizeInput(emp.status),
            formatKwacha(emp.basic_salary || 0)
          ])
        };
      case 'payroll':
        return {
          title: 'Payroll Report',
          headers: ['Name', 'Position', 'Department', 'Gross Pay', 'PAYE', 'Pension', 'Net Pay'],
          rows: employees.map(emp => {
            const payroll = payrollRecords.find(p => p.employee_id === emp.id);
            return [
              sanitizeInput(emp.full_name),
              sanitizeInput(emp.position),
              sanitizeInput(emp.department || '-'),
              formatKwacha(payroll?.gross_pay || emp.basic_salary || 0),
              formatKwacha(payroll?.paye || 0),
              formatKwacha(payroll?.pension || 0),
              formatKwacha(payroll?.net_pay || emp.basic_salary || 0)
            ];
          })
        };
      case 'attendance':
        return {
          title: 'Attendance Report',
          headers: ['Name', 'Position', 'Department', 'Attendance Rate', 'Status'],
          rows: employees.map(emp => [
            sanitizeInput(emp.full_name),
            sanitizeInput(emp.position),
            sanitizeInput(emp.department || '-'),
            `${(85 + Math.random() * 10).toFixed(1)}%`,
            sanitizeInput(emp.status)
          ])
        };
      case 'recruitment':
        return {
          title: 'Recruitment Report',
          headers: ['Applicant Name', 'Position', 'Qualification', 'Status', 'Application Date'],
          rows: applicants.map(app => [
            sanitizeInput(app.name),
            sanitizeInput(app.position),
            sanitizeInput(app.qualification || '-'),
            sanitizeInput(app.interview_status),
            sanitizeInput(app.application_date)
          ])
        };
      case 'company':
        return {
          title: 'Company & Workstation Report',
          headers: ['Company', 'Total Employees', 'Active', 'Total Payroll', 'Workstations Breakdown'],
          rows: companyData.map(company => [
            sanitizeInput(company.name),
            company.totalEmployees,
            company.activeEmployees,
            formatKwacha(company.totalPayroll),
            company.workstations.map(w => `${sanitizeInput(w.name)}: ${w.employeeCount}`).join(' | ')
          ])
        };
      case 'workstation':
        return {
          title: 'Workstation Analysis Report',
          headers: ['Workstation', 'Total Employees', 'Active', 'Total Payroll', 'Companies'],
          rows: workstationData.map(ws => [
            sanitizeInput(ws.name),
            ws.totalEmployees,
            ws.activeEmployees,
            formatKwacha(ws.totalPayroll),
            Object.entries(ws.companies).map(([company, count]) => `${sanitizeInput(company)}: ${count}`).join(' | ')
          ])
        };
      default:
        return {
          title: 'Department Report',
          headers: ['Department', 'Employees', 'Total Payroll', 'Average Salary', 'Attendance'],
          rows: departmentData.map(dept => [
            sanitizeInput(dept.name),
            `${dept.employees} employees`,
            formatKwacha(dept.totalPayroll),
            formatKwacha(dept.average),
            `${dept.attendance}%`
          ])
        };
    }
  };

  const exportReport = () => {
    const reportData = getCurrentReportData();
    let csvContent = `${reportData.title}\nGenerated: ${new Date().toLocaleString()}\n\n${reportData.headers.join(',')}\n`;
    reportData.rows.forEach(row => {
      csvContent += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
    });
    if (activeReport === 'payroll') {
      csvContent += `\n\nSUMMARY\nTotal Gross Pay,${formatKwacha(payrollSummary.totalGross)}\nTotal Net Pay,${formatKwacha(payrollSummary.totalNet)}\n`;
    }
    if (activeReport === 'department') {
      csvContent += `\n\nSUMMARY\nTotal Departments,${departmentData.length}\nTotal Employees,${employees.length}\nTotal Payroll,${formatKwacha(payrollSummary.totalNet)}\n`;
    }
    if (activeReport === 'company') {
      csvContent += `\n\nSUMMARY\nTotal Companies,${companyData.length}\nTotal Employees,${employees.length}\nTotal Payroll,${formatKwacha(payrollSummary.totalNet)}\n`;
    }
    if (activeReport === 'workstation') {
      csvContent += `\n\nSUMMARY\nTotal Workstations,${workstationData.length}\nTotal Employees,${employees.length}\nTotal Payroll,${formatKwacha(payrollSummary.totalNet)}\n`;
    }
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeReport}_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    alert(`${activeReport.toUpperCase()} Report exported!`);
  };

  const reportTabs = [
    { id: 'employee', label: 'Employees', icon: Users },
    { id: 'company', label: 'Companies', icon: Building2 },
    { id: 'workstation', label: 'Workstations', icon: MapPin },
    { id: 'payroll', label: 'Payroll', icon: DollarSign },
    { id: 'attendance', label: 'Attendance', icon: Calendar },
    { id: 'recruitment', label: 'Recruitment', icon: UserCheck },
    { id: 'department', label: 'Departments', icon: PieChart }
  ];

  const currentData = getCurrentReportData();
  const isSuperAdmin = userProfile?.is_super_admin;
  const userRegion = userProfile?.regions;

  // Summary statistics for Company report
  const totalCompanies = companyData.length;
  const totalWorkstations = workstationData.length;
  const totalCompanyPayroll = companyData.reduce((sum, c) => sum + c.totalPayroll, 0);

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
        title="Reports & Analytics"
        subtitle={isSuperAdmin ? "Comprehensive business intelligence dashboard" : `${userRegion?.name || ''} Region - Reports`}
        actions={
          <div className="flex gap-2">
            {activeReport === 'payroll' && (
              <MonthSelector
                selectedMonth={selectedMonth}
                onMonthChange={handleMonthChange}
                availableMonths={availableMonths}
                isLoading={loading}
              />
            )}
            <Button variant="outline" onClick={exportReport}>
              <FileDown size={14} className="mr-1" /> Export
            </Button>
            <Button variant="secondary" onClick={exportReport}>
              <FileSpreadsheet size={14} className="mr-1" /> CSV
            </Button>
          </div>
        }
      />

      {!isSuperAdmin && userRegion && (
        <Card className="p-3 bg-gradient-to-r from-[#081C3A]/5 to-transparent border-[#081C3A]/20">
          <p className="text-sm text-slate-600">
            Viewing reports for <strong className="text-[#081C3A]">{userRegion.name}</strong> region only
          </p>
        </Card>
      )}

      {/* Summary Stats for Company/Workstation view */}
      {(activeReport === 'company' || activeReport === 'workstation') && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Total Companies</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{totalCompanies}</p>
                <p className="text-xs text-slate-500 mt-1">Active clients</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[#E8EDF5] text-[#081C3A] flex items-center justify-center">
                <Building2 size={18} />
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Total Workstations</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{totalWorkstations}</p>
                <p className="text-xs text-slate-500 mt-1">Deployment sites</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                <MapPin size={18} />
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Total Employees</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{employees.length}</p>
                <p className="text-xs text-slate-500 mt-1">Across all companies</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Users size={18} />
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Total Payroll</p>
                <p className="text-xl font-bold text-slate-800 mt-1">{formatKwacha(totalCompanyPayroll)}</p>
                <p className="text-xs text-slate-500 mt-1">Monthly expenditure</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[#FFF1CC] text-[#D4A017] flex items-center justify-center">
                <DollarSign size={18} />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Company Breakdown Cards (when viewing Company report) */}
      {activeReport === 'company' && companyData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {companyData.slice(0, 6).map(company => (
            <Card key={company.name} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#081C3A] text-white flex items-center justify-center">
                    <Building2 size={14} />
                  </div>
                  <h4 className="font-bold text-slate-800">{company.name}</h4>
                </div>
                <Badge color={company.activeEmployees === company.totalEmployees ? 'green' : 'gold'}>
                  {company.activeEmployees}/{company.totalEmployees} Active
                </Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Employees:</span>
                  <span className="font-semibold">{company.totalEmployees}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Monthly Payroll:</span>
                  <span className="font-semibold text-[#D4A017]">{formatKwacha(company.totalPayroll)}</span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <p className="text-xs text-slate-500 mb-2">Workstations:</p>
                  <div className="space-y-1">
                    {company.workstations.slice(0, 3).map(ws => (
                      <div key={ws.name} className="flex justify-between text-xs">
                        <span className="text-slate-600">{ws.name}:</span>
                        <span className="font-medium">{ws.employeeCount} guards</span>
                      </div>
                    ))}
                    {company.workstations.length > 3 && (
                      <p className="text-xs text-slate-400">+{company.workstations.length - 3} more locations</p>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Top Workstations Cards (when viewing Workstation report) */}
      {activeReport === 'workstation' && workstationData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workstationData.slice(0, 6).map(ws => (
            <Card key={ws.name} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                    <MapPin size={14} />
                  </div>
                  <h4 className="font-bold text-slate-800">{ws.name}</h4>
                </div>
                <Badge color="blue">{ws.totalEmployees} Guards</Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Active Employees:</span>
                  <span className="font-semibold">{ws.activeEmployees}/{ws.totalEmployees}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Monthly Payroll:</span>
                  <span className="font-semibold text-[#D4A017]">{formatKwacha(ws.totalPayroll)}</span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <p className="text-xs text-slate-500 mb-2">Companies at this site:</p>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(ws.companies).map(([company, count]) => (
                      <Badge key={company} color="gray" className="text-xs">
                        {company}: {count}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        {reportTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeReport === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveReport(tab.id as ReportType)}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                isActive
                  ? 'border-[#D4A017] text-[#081C3A]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {!hasData && activeReport === 'payroll' ? (
        <EmptyState
          title="No Payroll Data"
          message={`No payroll records found for ${selectedMonth}. Please process payroll for this month first.`}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-semibold text-slate-800">{currentData.title} — {selectedMonth}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <THead>
                <TR hover={false}>
                  {currentData.headers.map((header, idx) => (
                    <TH key={idx}>{header}</TH>
                  ))}
                </TR>
              </THead>
              <TBody>
                {currentData.rows.slice(0, 50).map((row, idx) => (
                  <TR key={idx}>
                    {row.map((cell, cellIdx) => (
                      <TD key={cellIdx} className={cellIdx === 0 ? 'font-medium' : ''}>
                        {cell}
                      </TD>
                    ))}
                  </TR>
                ))}
              </TBody>
            </table>
          </div>
          {currentData.rows.length === 0 && (
            <div className="text-center py-8 text-slate-500">No data available for this report</div>
          )}
        </Card>
      )}
    </div>
  );
}

	export default ReportsPage;