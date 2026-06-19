import { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Eye, Edit2, Trash2, Filter, Download, UserPlus } from 'lucide-react';
import { Card, Button, Badge, THead, TBody, TR, TH, TD, Modal, PageHeader, Tabs } from '../components/ui';
import { formatKwacha } from '../data';
import { supabase } from '../lib/supabase';
import { showNotification } from '../utils/clickHandlers';
import { FileText, FileSpreadsheet } from "lucide-react";
import { PDFDownloadLink } from '@react-pdf/renderer';
import { EmployeeReportPDF } from '../utils/pdfExport';
import * as XLSX from 'xlsx';
import { sanitizeInput } from '../utils/securityHeaders';

interface Employee {
  id: string;
  employeeNumber: string;
  fullName: string;
  gender: string;
  age: number;
  phone: string;
  position: string;
  department: string;
  basicSalary: number;
  status: string;
  email: string;
  dateHired: string;
  dob?: string;
  nationalId?: string;
  address?: string;
  qualification?: string;
  contractType?: string;
  payPoint?: string;
  region_id?: string;
  company?: string;
  workstation?: string;
  pay_point?: string;
  account_number?: string;
  uniform_deduction?: number;
}

// Department options
const departmentOptions = [
  'Operations (Guards, K9, Supervisors)',
  'Finance',
  'Logistics',
  'Administration',
  'Building',
  'Marketing',
  'Technical'
];

// Auto-format function for text fields
const formatText = (value: string) => {
  return value
    .toUpperCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^A-Z0-9\s]/g, '');
};

// ===== NEW: Calculate age from DOB =====
const calculateAge = (dob: string): number => {
  if (!dob) return 0;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

export function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [regions, setRegions] = useState<any[]>([]);
  const [filterRegionId, setFilterRegionId] = useState<string>('');
  const [filterCompany, setFilterCompany] = useState<string>('');
  const [filterWorkstation, setFilterWorkstation] = useState<string>('');
  const [filterPayPoint, setFilterPayPoint] = useState<string>('');
  
  // User authentication state
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userLoading, setUserLoading] = useState(true);

  // Fetch current user profile
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
      setUserLoading(false);
    };
    fetchUserProfile();
  }, []);

  useEffect(() => {
    fetchRegions();
  }, []);

  useEffect(() => {
    if (!userLoading) {
      fetchEmployees();
    }
  }, [filterRegionId, filterCompany, filterWorkstation, filterPayPoint, userProfile, userLoading]);

  const fetchRegions = async () => {
    const { data } = await supabase.from('regions').select('*');
    setRegions(data || []);
  };

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      let query = supabase.from('employees').select('*').eq('status', 'Active');
      
      if (!userProfile?.is_super_admin && userProfile?.region_id) {
        query = query.eq('region_id', userProfile.region_id);
      }
      
      if (filterRegionId && userProfile?.is_super_admin) {
        query = query.eq('region_id', filterRegionId);
      }
      if (filterCompany) query = query.ilike('company', `%${filterCompany}%`);
      if (filterWorkstation) query = query.ilike('workstation', `%${filterWorkstation}%`);
      if (filterPayPoint) query = query.eq('pay_point', filterPayPoint);
      
      const { data, error } = await query.order('full_name');
      if (error) throw error;
      
      const mappedEmployees = (data || []).map((emp: any) => ({
        id: emp.id,
        employeeNumber: emp.employee_number,
        fullName: emp.full_name,
        gender: emp.gender || '',
        age: emp.age || 0,
        phone: emp.phone || '',
        position: emp.position,
        department: emp.department || 'Operations',
        basicSalary: emp.basic_salary,
        status: emp.status || 'Active',
        email: emp.email || '',
        dateHired: emp.hire_date || new Date().toISOString().split('T')[0],
        dob: emp.dob && emp.dob !== '' ? emp.dob : null,
        nationalId: emp.national_id,
        address: emp.address,
        qualification: emp.qualification,
        contractType: emp.contract_type || 'Permanent',
        payPoint: emp.pay_point,
        region_id: emp.region_id,
        company: emp.company,
        workstation: emp.workstation,
        pay_point: emp.pay_point,
        account_number: emp.account_number,
        uniform_deduction: emp.uniform_deduction || 0
      }));
      setEmployees(mappedEmployees);
    } catch (err: any) {
      console.error('Error fetching employees:', err);
      showNotification('Failed to load employees', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return employees.filter(e => {
      const matchesSearch = e.fullName.toLowerCase().includes(search.toLowerCase()) || 
                           e.employeeNumber.toLowerCase().includes(search.toLowerCase()) || 
                           e.position.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = statusFilter === 'all' || e.status === statusFilter;
      return matchesSearch && matchesFilter;
    });
  }, [employees, search, statusFilter]);

  // ===== UPDATED: addEmployee with sanitization =====
  const addEmployee = async (emp: any) => {
    // Sanitize all text inputs
    const safeEmp = {
      ...emp,
      fullName: sanitizeInput(emp.fullName),
      position: sanitizeInput(emp.position),
      department: sanitizeInput(emp.department),
      address: sanitizeInput(emp.address),
      qualification: sanitizeInput(emp.qualification),
      company: sanitizeInput(emp.company),
      workstation: sanitizeInput(emp.workstation),
      nationalId: sanitizeInput(emp.nationalId),
      phone: sanitizeInput(emp.phone),
    };
    
    let assignedRegionId = safeEmp.region_id;
    if (!userProfile?.is_super_admin) {
      assignedRegionId = userProfile?.region_id;
    }
    
    if (userProfile?.is_super_admin && !assignedRegionId) {
      showNotification('Please select a region', 'error');
      return;
    }
    
    const { data: existing } = await supabase
      .from('employees')
      .select('employee_number')
      .eq('employee_number', safeEmp.employeeNumber)
      .single();
    
    if (existing) {
      showNotification(`Employee number ${safeEmp.employeeNumber} already exists!`, 'error');
      return;
    }
    
    const formattedCompany = safeEmp.company ? formatText(safeEmp.company) : null;
    const formattedWorkstation = safeEmp.workstation ? formatText(safeEmp.workstation) : null;
    
    const uniformDeduction = parseInt(safeEmp.uniform_deduction) || 0;
    
    // ===== NEW: Calculate age from DOB =====
    const calculatedAge = safeEmp.dob ? calculateAge(safeEmp.dob) : 0;
    
    const { data, error } = await supabase
      .from('employees')
      .insert([{
        employee_number: safeEmp.employeeNumber,
        full_name: safeEmp.fullName,
        gender: safeEmp.gender,
        age: calculatedAge,
        phone: safeEmp.phone,
        position: safeEmp.position,
        department: safeEmp.department,
        basic_salary: parseFloat(safeEmp.basicSalary),
        status: safeEmp.status || 'Active',
        email: safeEmp.email,
        hire_date: safeEmp.dateHired && safeEmp.dateHired !== '' ? safeEmp.dateHired : new Date().toISOString().split('T')[0],
        dob: safeEmp.dob && safeEmp.dob !== '' ? safeEmp.dob : null,
        national_id: safeEmp.nationalId,
        address: safeEmp.address,
        qualification: safeEmp.qualification,
        contract_type: safeEmp.contractType,
        region_id: assignedRegionId,
        company: formattedCompany,
        workstation: formattedWorkstation,
        pay_point: safeEmp.pay_point,
        account_number: safeEmp.account_number,
        uniform_deduction: uniformDeduction
      }])
      .select();
    
    if (error) {
      showNotification('Error adding employee: ' + error.message, 'error');
    } else if (data && data[0]) {
      const newEmployee = {
        id: data[0].id,
        employeeNumber: data[0].employee_number,
        fullName: data[0].full_name,
        gender: data[0].gender || '',
        age: data[0].age || 0,
        phone: data[0].phone || '',
        position: data[0].position,
        department: data[0].department,
        basicSalary: data[0].basic_salary,
        status: data[0].status,
        email: data[0].email || '',
        dateHired: data[0].hire_date || new Date().toISOString().split('T')[0],
        dob: data[0].dob,
        nationalId: data[0].national_id,
        address: data[0].address,
        qualification: data[0].qualification,
        contractType: data[0].contract_type,
        region_id: data[0].region_id,
        company: data[0].company,
        workstation: data[0].workstation,
        pay_point: data[0].pay_point,
        account_number: data[0].account_number,
        uniform_deduction: data[0].uniform_deduction || 0
      };
      setEmployees([newEmployee, ...employees]);
      showNotification(`${safeEmp.fullName} has been added`, 'success');
    }
    setShowAdd(false);
  };

  const handleEdit = (employee: Employee) => {
    if (!userProfile?.is_super_admin && employee.region_id !== userProfile?.region_id) {
      showNotification('You cannot edit employees from other regions', 'error');
      return;
    }
    setEditingEmployee(employee);
    setShowEdit(true);
  };

  // ===== UPDATED: updateEmployee with sanitization =====
  const updateEmployee = async (emp: any) => {
    if (!editingEmployee) return;
    
    // Sanitize all text inputs
    const safeEmp = {
      ...emp,
      fullName: sanitizeInput(emp.fullName),
      position: sanitizeInput(emp.position),
      department: sanitizeInput(emp.department),
      address: sanitizeInput(emp.address),
      qualification: sanitizeInput(emp.qualification),
      company: sanitizeInput(emp.company),
      workstation: sanitizeInput(emp.workstation),
      nationalId: sanitizeInput(emp.nationalId),
      phone: sanitizeInput(emp.phone),
    };
    
    const formattedCompany = safeEmp.company ? formatText(safeEmp.company) : null;
    const formattedWorkstation = safeEmp.workstation ? formatText(safeEmp.workstation) : null;
    
    const uniformDeduction = parseInt(safeEmp.uniform_deduction) || 0;
    
    // ===== NEW: Calculate age from DOB =====
    const calculatedAge = safeEmp.dob ? calculateAge(safeEmp.dob) : 0;
    
    const { data, error } = await supabase
      .from('employees')
      .update({
        employee_number: safeEmp.employeeNumber,
        full_name: safeEmp.fullName,
        gender: safeEmp.gender,
        age: calculatedAge,
        phone: safeEmp.phone,
        position: safeEmp.position,
        department: safeEmp.department,
        basic_salary: parseFloat(safeEmp.basicSalary),
        status: safeEmp.status,
        email: safeEmp.email,
        hire_date: safeEmp.dateHired && safeEmp.dateHired !== '' ? safeEmp.dateHired : null,
        dob: safeEmp.dob && safeEmp.dob !== '' ? safeEmp.dob : null,
        national_id: safeEmp.nationalId,
        address: safeEmp.address,
        qualification: safeEmp.qualification,
        contract_type: safeEmp.contractType,
        company: formattedCompany,
        workstation: formattedWorkstation,
        pay_point: safeEmp.pay_point,
        account_number: safeEmp.account_number,
        uniform_deduction: uniformDeduction
      })
      .eq('id', editingEmployee.id)
      .select();
    
    if (error) {
      showNotification('Error updating employee: ' + error.message, 'error');
    } else if (data && data[0]) {
      const updatedEmployee = {
        ...editingEmployee,
        employeeNumber: data[0].employee_number,
        fullName: data[0].full_name,
        gender: data[0].gender || '',
        age: data[0].age || 0,
        phone: data[0].phone || '',
        position: data[0].position,
        department: data[0].department,
        basicSalary: data[0].basic_salary,
        status: data[0].status,
        email: data[0].email || '',
        dateHired: data[0].hire_date || new Date().toISOString().split('T')[0],
        dob: data[0].dob,
        nationalId: data[0].national_id,
        address: data[0].address,
        qualification: data[0].qualification,
        contractType: data[0].contract_type,
        company: data[0].company,
        workstation: data[0].workstation,
        pay_point: data[0].pay_point,
        account_number: data[0].account_number,
        uniform_deduction: data[0].uniform_deduction || 0
      };
      setEmployees(employees.map(e => e.id === updatedEmployee.id ? updatedEmployee : e));
      showNotification(`${safeEmp.fullName} has been updated`, 'success');
    }
    setShowEdit(false);
    setEditingEmployee(null);
  };

  const handleDelete = async (employee: Employee) => {
    if (!userProfile?.is_super_admin && employee.region_id !== userProfile?.region_id) {
      showNotification('You cannot delete employees from other regions', 'error');
      return;
    }
    
    if (confirm(`Are you sure you want to delete ${employee.fullName}?`)) {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', employee.id);
      if (error) {
        showNotification('Error deleting employee: ' + error.message, 'error');
      } else {
        setEmployees(employees.filter(e => e.id !== employee.id));
        showNotification(`${employee.fullName} has been deleted`, 'success');
      }
    }
  };

  const handleExport = () => {
    const csv = [
      ['Employee ID', 'Full Name', 'Company', 'Workstation', 'Account Number', 'Gender', 'Age', 'Phone', 'Position', 'Department', 'Basic Salary', 'Status', 'Pay Point', 'Uniform Deduction'],
      ...filtered.map(e => [
        e.employeeNumber, e.fullName, e.company || '', e.workstation || '',
        e.account_number || '', e.gender, e.age, e.phone, e.position, e.department, e.basicSalary, e.status, e.pay_point || '',
        e.uniform_deduction || 0
      ])
    ].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employees_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification(`Exported ${filtered.length} employees`, 'success');
  };

  const clearFilters = () => {
    setFilterRegionId('');
    setFilterCompany('');
    setFilterWorkstation('');
    setFilterPayPoint('');
  };

  if (userLoading || loading) return <div className="text-center py-8">Loading...</div>;
  if (selected) return <EmployeeProfile employee={selected} onBack={() => setSelected(null)} />;

  const isSuperAdmin = userProfile?.is_super_admin;
  const userRegion = regions.find(r => r.id === userProfile?.region_id);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Employee Management"
        subtitle={isSuperAdmin ? "Complete database of all security personnel" : `${userRegion?.name || ''} - Security Personnel`}
        actions={
          <>
            <Button variant="outline" className="hidden md:inline-flex"><Filter size={16} /> Filter</Button>
            <Button variant="outline" className="hidden md:inline-flex" onClick={handleExport}><Download size={16} /> Export</Button>
            <Button variant="secondary" onClick={() => setShowAdd(true)}><Plus size={16} /> Add Employee</Button>
          </>
        }
      />

      {!isSuperAdmin && userRegion && (
        <Card className="p-3 bg-gradient-to-r from-[#081C3A]/5 to-transparent border-[#081C3A]/20">
          <p className="text-sm text-slate-600">
            Viewing employees in <strong className="text-[#081C3A]">{userRegion.name}</strong>
          </p>
        </Card>
      )}

      {isSuperAdmin && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Filter size={14} /> Advanced Filters
            </h4>
            {(filterRegionId || filterCompany || filterWorkstation || filterPayPoint) && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
                Clear all
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Region</label>
              <select
                value={filterRegionId}
                onChange={(e) => {
                  setFilterRegionId(e.target.value);
                  setFilterCompany('');
                  setFilterWorkstation('');
                }}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              >
                <option value="">All Regions</option>
                {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Company</label>
              <input
                type="text"
                value={filterCompany}
                onChange={(e) => setFilterCompany(e.target.value.toUpperCase())}
                placeholder="Type company name..."
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Workstation</label>
              <input
                type="text"
                value={filterWorkstation}
                onChange={(e) => setFilterWorkstation(e.target.value.toUpperCase())}
                placeholder="Type workstation..."
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Pay Point</label>
              <select
                value={filterPayPoint}
                onChange={(e) => setFilterPayPoint(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              >
                <option value="">All Pay Points</option>
                <option value="national_bank">National Bank of Malawi</option>
                <option value="standard_bank">Standard Bank</option>
                <option value="nbs_bank">NBS Bank</option>
                <option value="centenary_bank">Centenary Bank</option>
                <option value="fdh_bank">FDH Bank</option>
                <option value="first_capital_bank">First Capital Bank</option>
                <option value="airtel_money">Airtel Money</option>
                <option value="tnm_mpamba">TNM Mpamba</option>
              </select>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total', n: employees.length },
          { label: 'Active', n: employees.filter(e => e.status === 'Active').length },
          { label: 'On Leave', n: employees.filter(e => e.status === 'On Leave').length },
          { label: 'Suspended', n: employees.filter(e => e.status === 'Suspended').length }
        ].map((s, i) => (
          <Card key={i} className="p-4">
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{s.n}</p>
          </Card>
        ))}
      </div>

      <Card className="p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, ID or position..."
            className="w-full pl-10 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-[#081C3A]"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[{ v: 'all', l: 'All' }, { v: 'Active', l: 'Active' }, { v: 'On Leave', l: 'On Leave' }, { v: 'Suspended', l: 'Suspended' }].map(f => (
            <button key={f.v} onClick={() => setStatusFilter(f.v)} className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${statusFilter === f.v ? 'bg-[#081C3A] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{f.l}</button>
          ))}
        </div>
      </Card>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <THead>
              <TR hover={false}>
                <TH>Employee</TH>
                <TH className="hidden lg:table-cell">Company</TH>
                <TH className="hidden xl:table-cell">Workstation</TH>
                <TH className="hidden md:table-cell">Account</TH>
                <TH className="hidden md:table-cell">Phone</TH>
                <TH>Position</TH>
                <TH className="hidden lg:table-cell">Basic Salary</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {filtered.slice(0, 50).map(emp => (
                <TR key={emp.id} onClick={() => setSelected(emp)}>
                  <TD>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#081C3A] flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {emp.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{emp.fullName}</p>
                        <p className="text-xs text-slate-500">{emp.employeeNumber}</p>
                      </div>
                    </div>
                  </TD>
                  <TD className="hidden lg:table-cell">{emp.company || '-'}</TD>
                  <TD className="hidden xl:table-cell">{emp.workstation || '-'}</TD>
                  <TD className="hidden md:table-cell text-xs font-mono">{emp.account_number || '-'}</TD>
                  <TD className="hidden md:table-cell">{emp.phone || '-'}</TD>
                  <TD>{emp.position}</TD>
                  <TD className="hidden lg:table-cell font-medium">{formatKwacha(emp.basicSalary)}</TD>
                  <TD><Badge color={emp.status === 'Active' ? 'green' : emp.status === 'On Leave' ? 'yellow' : 'red'}>{emp.status}</Badge></TD>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => setSelected(emp)} className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-600 flex items-center justify-center"><Eye size={14} /></button>
                      <button onClick={() => handleEdit(emp)} className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-600 flex items-center justify-center"><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(emp)} className="w-8 h-8 rounded-lg hover:bg-red-50 text-red-500 flex items-center justify-center"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </TR>
              ))}
            </TBody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {Math.min(50, filtered.length)} of {filtered.length} employees</span>
          <div className="flex items-center gap-1">
            <button className="px-3 py-1.5 rounded-md border border-slate-200 hover:bg-slate-50">Previous</button>
            <button className="px-3 py-1.5 rounded-md bg-[#081C3A] text-white">1</button>
            <button className="px-3 py-1.5 rounded-md border border-slate-200 hover:bg-slate-50">Next</button>
          </div>
        </div>
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add New Employee" size="xl">
        <AddEmployeeForm 
          onSubmit={addEmployee} 
          onCancel={() => setShowAdd(false)} 
          departments={departmentOptions} 
          regions={regions}
          userRegionId={userProfile?.region_id}
          isSuperAdmin={isSuperAdmin}
          userRegionName={userRegion?.name}
        />
      </Modal>

      <Modal open={showEdit} onClose={() => { setShowEdit(false); setEditingEmployee(null); }} title="Edit Employee" size="xl">
        {editingEmployee && (
          <EditEmployeeForm 
            employee={editingEmployee}
            onSubmit={updateEmployee} 
            onCancel={() => { setShowEdit(false); setEditingEmployee(null); }} 
            departments={departmentOptions} 
            regions={regions}
            isSuperAdmin={isSuperAdmin}
          />
        )}
      </Modal>
    </div>
  );
}

// AddEmployeeForm Component - WITH UNIFORM DEDUCTION FIELD
function AddEmployeeForm({
  onSubmit,
  onCancel,
  departments,
  regions,
  userRegionId,
  isSuperAdmin,
  userRegionName,
}: {
  onSubmit: (e: any) => void;
  onCancel: () => void;
  departments: string[];
  regions: any[];
  userRegionId?: string;
  isSuperAdmin?: boolean;
  userRegionName?: string;
}) {
  const [form, setForm] = useState<any>({
    employeeNumber: "",
    fullName: "",
    dob: "",
    gender: "Male",
    nationalId: "",
    phone: "",
    address: "",
    position: "Security Guard",
    department: departments[0],
    qualification: "standard 8",
    dateHired: new Date().toISOString().slice(0, 10),
    basicSalary: 550000,
    contractType: "Permanent",
    status: "Active",
    email: "",
    region_id: userRegionId || "",
    company: "",
    workstation: "",
    pay_point: "",
    account_number: "",
    uniform_deduction: 10000,
  });

  const [positions, setPositions] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const update = (k: string, v: any) => {
    setForm((prev: any) => ({ ...prev, [k]: v }));
  };

  // Format number with commas for salary display
  const formatNumberWithCommas = (value: number) => {
    return value.toLocaleString();
  };

  // Handle salary input with commas
  const handleSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^\d]/g, "");
    const numericValue = parseInt(rawValue) || 0;
    update("basicSalary", numericValue);
  };

  // Handle uniform deduction input with commas
  const handleUniformDeductionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^\d]/g, "");
    const numericValue = parseInt(rawValue) || 0;
    update("uniform_deduction", numericValue);
  };

  // Generate employee number based on region
  const generateEmployeeNumber = async (regionId: string) => {
    if (!regionId || isGenerating) return;

    setIsGenerating(true);
    try {
      const region = regions.find((r) => r.id === regionId);
      if (!region) return;

      let prefix = "";
      switch (region.code) {
        case "NORTH":
          prefix = "N";
          break;
        case "SOUTH":
          prefix = "S";
          break;
        case "CENTRAL":
          prefix = "C";
          break;
        case "EAST":
          prefix = "E";
          break;
        default:
          prefix = "X";
      }

      const { data } = await supabase
        .from("employees")
        .select("employee_number")
        .ilike("employee_number", `${prefix}%`)
        .order("employee_number", { ascending: false })
        .limit(1);

      let nextNumber = 1;
      if (data && data.length > 0) {
        const match = data[0].employee_number.match(/\d+$/);
        if (match) {
          const lastNumber = parseInt(match[0]);
          nextNumber = lastNumber + 1;
        }
      }

      const formattedNumber = `${prefix}${nextNumber.toString().padStart(3, "0")}`;
      setTimeout(() => {
        update("employeeNumber", formattedNumber);
      }, 10);
    } catch (err) {
      console.error("Error generating employee number:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Fetch positions from database
  useEffect(() => {
    const fetchPositions = async () => {
      try {
        const { data } = await supabase
          .from("positions")
          .select("name")
          .eq("is_active", true)
          .order("name");
        if (data && data.length > 0) {
          setPositions(data);
        } else {
          setPositions([
            { name: "Security Guard" },
            { name: "Senior Security Officer" },
            { name: "Supervisor" },
            { name: "Manager" },
            { name: "Staff" },
            { name: "HR" },
          ]);
        }
      } catch (err) {
        console.error("Error fetching positions:", err);
        setPositions([
          { name: "Security Guard" },
          { name: "Senior Security Officer" },
          { name: "Supervisor" },
          { name: "Manager" },
          { name: "Staff" },
          { name: "HR" },
        ]);
      }
    };
    fetchPositions();
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employeeNumber || !form.fullName) {
      alert("Please fill in Employee Number and Full Name");
      return;
    }
    if (!form.phone) {
      alert("Please enter phone number");
      return;
    }
    if (isSuperAdmin && !form.region_id) {
      alert("Please select a region");
      return;
    }
    onSubmit(form);
  };

  const field = (
    k: string,
    label: string,
    type = "text",
    required = false,
    options?: { label: string; value: string }[],
  ) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {options ? (
        <select
          value={form[k] || ""}
          onChange={(e) => update(k, e.target.value)}
          className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#081C3A] bg-white"
        >
          <option value="">Select {label}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : type === "salary" ? (
        <input
          type="text"
          value={formatNumberWithCommas(form[k] || 0)}
          onChange={handleSalaryChange}
          className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#081C3A] text-right"
          required={required}
        />
      ) : (
        <input
          type={type}
          value={form[k] || ""}
          onChange={(e) => update(k, e.target.value)}
          className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#081C3A]"
          required={required}
        />
      )}
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="p-4 rounded-lg bg-[#E8EDF5] text-sm text-slate-700 flex items-start gap-3">
        <UserPlus size={18} className="text-[#081C3A] shrink-0 mt-0.5" />
        <div>
          <strong>Employment Form</strong>
          <br />
          Complete all required fields. Employee will be added to active
          records.
          {!isSuperAdmin && userRegionName && (
            <span className="block mt-1 text-xs text-[#D4A017]">
              Will be assigned to: {userRegionName}
            </span>
          )}
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-slate-800 mb-3 text-sm">
          Personal Information
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Employee Number
            </label>
            <input
              type="text"
              value={form.employeeNumber}
              disabled
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 font-mono"
            />
            <p className="text-xs text-slate-400 mt-1">
              Auto-generated after selecting region
            </p>
          </div>
          {field("fullName", "Full Name", "text", true)}
          {field("dob", "Date of Birth", "date")}
          {field("gender", "Gender", "text", false, [
            { label: "Male", value: "Male" },
            { label: "Female", value: "Female" },
          ])}
          {field("nationalId", "National ID")}
          {field("phone", "Phone Number", "tel", true)}
        </div>
        <div className="mt-4">{field("address", "Residential Address")}</div>
      </div>

      <div>
        <h4 className="font-semibold text-slate-800 mb-3 text-sm">
          Employment Information
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {field(
            "position",
            "Position",
            "text",
            false,
            positions.map((p) => ({ label: p.name, value: p.name })),
          )}
          {field(
            "department",
            "Department",
            "text",
            false,
            departments.map((d) => ({ label: d, value: d })),
          )}
          {field("qualification", "Qualification")}
          {field("dateHired", "Date Hired", "date")}
          {field("contractType", "Contract Type", "text", false, [
            { label: "Permanent", value: "Permanent" },
            { label: "Contract", value: "Contract" },
            { label: "Part-time", value: "Part-time" },
          ])}
          {field("status", "Status", "text", false, [
            { label: "Active", value: "Active" },
            { label: "On Leave", value: "On Leave" },
            { label: "Suspended", value: "Suspended" },
          ])}
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-slate-800 mb-3 text-sm">
          Company & Location
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Company
            </label>
            <input
              type="text"
              value={form.company || ""}
              onChange={(e) => {
                let val = e.target.value.toUpperCase().trim();
                val = val.replace(/[^A-Z0-9\s]/g, "");
                val = val.replace(/\s+/g, " ");
                update("company", val);
              }}
              placeholder="e.g., MASM, AHL, TCC"
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#081C3A] uppercase"
            />
            <p className="text-xs text-slate-400 mt-1">
              Auto-formatted to UPPERCASE
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Workstation / Site
            </label>
            <input
              type="text"
              value={form.workstation || ""}
              onChange={(e) => {
                let val = e.target.value.toUpperCase().trim();
                val = val.replace(/[^A-Z0-9\s]/g, "");
                val = val.replace(/\s+/g, " ");
                update("workstation", val);
              }}
              placeholder="e.g., CLINIC, MAIN OFFICE, GATE 1"
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#081C3A] uppercase"
            />
            <p className="text-xs text-slate-400 mt-1">
              Auto-formatted to UPPERCASE
            </p>
          </div>
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-slate-800 mb-3 text-sm">
          Compensation & Payment
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Basic Salary (MK)
            </label>
            <input
              type="text"
              value={formatNumberWithCommas(form.basicSalary || 0)}
              onChange={handleSalaryChange}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#081C3A] text-right"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Pay Point
            </label>
            <select
              value={form.pay_point || ""}
              onChange={(e) => update("pay_point", e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#081C3A] bg-white"
            >
              <option value="">Select Pay Point</option>
              <option value="national_bank">National Bank of Malawi</option>
              <option value="standard_bank">Standard Bank</option>
              <option value="nbs_bank">NBS Bank</option>
              <option value="centenary_bank">Centenary Bank</option>
              <option value="fdh_bank">FDH Bank</option>
              <option value="first_capital_bank">First Capital Bank</option>
              <option value="airtel_money">Airtel Money</option>
              <option value="tnm_mpamba">TNM Mpamba</option>
            </select>
          </div>
        </div>
      </div>

      {/* Uniform Deduction Section */}
      <div>
        <h4 className="font-semibold text-slate-800 mb-3 text-sm">
          Uniform & Benefits
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Uniform Deduction (MK)
              <span className="text-xs text-slate-500 ml-2">(Default: 10,000)</span>
            </label>
            <input
              type="text"
              value={formatNumberWithCommas(form.uniform_deduction || 0)}
              onChange={handleUniformDeductionChange}
              placeholder="10,000"
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#081C3A] text-right"
            />
            <p className="text-xs text-slate-400 mt-1">
              This amount will be deducted from monthly income and refunded in terminal dues
            </p>
          </div>
          <div className="flex items-end">
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 w-full">
              <p className="text-xs text-amber-700">
                <strong>Note:</strong> Uniform deduction is optional. Enter 0 if no deduction applies.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bank Account Field */}
      <div>
        <h4 className="font-semibold text-slate-800 mb-3 text-sm">
          Bank Account
        </h4>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Bank Account / Mobile Money Number
            </label>
            <input
              type="text"
              value={form.account_number || ""}
              onChange={(e) => update("account_number", e.target.value)}
              placeholder="e.g., 5063532125021 or 0888123456"
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#081C3A]"
            />
            <p className="text-xs text-slate-400 mt-1">
              Bank account number for salary payments
            </p>
          </div>
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-slate-800 mb-3 text-sm">Region</h4>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Region <span className="text-red-500">*</span>
            </label>
            {isSuperAdmin ? (
              <select
                value={form.region_id || ""}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  setForm((prev: any) => ({ ...prev, region_id: selectedId }));
                  if (selectedId) {
                    generateEmployeeNumber(selectedId);
                  } else {
                    setForm((prev: any) => ({ ...prev, employeeNumber: "" }));
                  }
                }}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#081C3A] bg-white"
              >
                <option value="">-- Please select a region --</option>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={userRegionName || ""}
                disabled
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50"
              />
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-5 py-2 rounded-lg bg-[#D4A017] text-white text-sm font-semibold hover:bg-[#e8b82e]"
        >
          ✓ Hire Employee
        </button>
      </div>
    </form>
  );
}

// EditEmployeeForm Component - WITH UNIFORM DEDUCTION FIELD
function EditEmployeeForm({ employee, onSubmit, onCancel, departments, regions, isSuperAdmin }: { 
  employee: Employee;
  onSubmit: (e: any) => void; 
  onCancel: () => void; 
  departments: string[]; 
  regions: any[];
  isSuperAdmin?: boolean;
}) {
  const [form, setForm] = useState<any>({
    employeeNumber: employee.employeeNumber,
    fullName: employee.fullName,
    dob: employee.dob || '',
    gender: employee.gender || 'Male',
    nationalId: employee.nationalId || '',
    phone: employee.phone || '',
    address: employee.address || '',
    position: employee.position,
    department: employee.department,
    qualification: employee.qualification || '',
    dateHired: employee.dateHired,
    basicSalary: employee.basicSalary,
    contractType: employee.contractType || 'Permanent',
    status: employee.status,
    email: employee.email || '',
    region_id: employee.region_id || '',
    company: employee.company || '',
    workstation: employee.workstation || '',
    pay_point: employee.pay_point || '',
    account_number: employee.account_number || '',
    uniform_deduction: employee.uniform_deduction || 0,
  });
  
  const [positions, setPositions] = useState<any[]>([]);
  
  const update = (k: string, v: any) => {
    setForm({ ...form, [k]: v });
  };

  // Format number with commas
  const formatNumberWithCommas = (value: string) => {
    const cleanValue = value.replace(/[^\d]/g, '');
    if (!cleanValue) return '0';
    return parseInt(cleanValue).toLocaleString();
  };

  // Handle salary input with commas
  const handleSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^\d]/g, '');
    const numericValue = parseInt(rawValue) || 0;
    update('basicSalary', numericValue);
  };

  // Handle uniform deduction input with commas
  const handleUniformDeductionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^\d]/g, '');
    const numericValue = parseInt(rawValue) || 0;
    update('uniform_deduction', numericValue);
  };

  // Fetch positions
  useEffect(() => {
    const fetchPositions = async () => {
      const { data } = await supabase
        .from('positions')
        .select('name')
        .eq('is_active', true)
        .order('name');
      setPositions(data || []);
    };
    fetchPositions();
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employeeNumber || !form.fullName) {
      alert('Please fill in Employee Number and Full Name');
      return;
    }
    if (!form.phone) {
      alert('Please enter phone number');
      return;
    }
    onSubmit(form);
  };

  const field = (k: string, label: string, type = 'text', required = false, options?: { label: string; value: string }[]) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>
      {options ? (
        <select 
          value={form[k] || ''} 
          onChange={e => update(k, e.target.value)} 
          className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#081C3A] bg-white"
        >
          <option value="">Select {label}</option>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input 
          type={type} 
          value={form[k] || ''} 
          onChange={e => update(k, e.target.value)} 
          className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#081C3A]" 
          required={required}
        />
      )}
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="p-4 rounded-lg bg-[#E8EDF5] text-sm text-slate-700 flex items-start gap-3">
        <UserPlus size={18} className="text-[#081C3A] shrink-0 mt-0.5" />
        <div>
          <strong>Edit Employee</strong><br />
          Update employee information below.
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-slate-800 mb-3 text-sm">Personal Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Employee Number</label>
            <input 
              type="text" 
              value={form.employeeNumber || ''} 
              disabled
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 font-mono"
            />
          </div>
          {field('fullName', 'Full Name', 'text', true)}
          {field('dob', 'Date of Birth', 'date')}
          {field('gender', 'Gender', 'text', false, [
            { label: 'Male', value: 'Male' }, { label: 'Female', value: 'Female' }
          ])}
          {field('nationalId', 'National ID')}
          {field('phone', 'Phone Number', 'tel', true)}
        </div>
        <div className="mt-4">{field('address', 'Residential Address')}</div>
      </div>

      <div>
        <h4 className="font-semibold text-slate-800 mb-3 text-sm">Employment Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {field('position', 'Position', 'text', false, positions.map(p => ({ label: p.name, value: p.name })))}
          {field('department', 'Department', 'text', false, departments.map(d => ({ label: d, value: d })))}
          {field('qualification', 'Qualification')}
          {field('dateHired', 'Date Hired', 'date')}
          {field('contractType', 'Contract Type', 'text', false, [
            { label: 'Permanent', value: 'Permanent' }, 
            { label: 'Contract', value: 'Contract' }, 
            { label: 'Part-time', value: 'Part-time' }
          ])}
          {field('status', 'Status', 'text', false, [
            { label: 'Active', value: 'Active' }, 
            { label: 'On Leave', value: 'On Leave' }, 
            { label: 'Suspended', value: 'Suspended' }
          ])}
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-slate-800 mb-3 text-sm">Company & Location</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Company</label>
            <input 
              type="text" 
              value={form.company || ''} 
              onChange={e => {
                let val = e.target.value.toUpperCase().trim();
                val = val.replace(/[^A-Z0-9\s]/g, '');
                val = val.replace(/\s+/g, ' ');
                update('company', val);
              }}
              placeholder="e.g., MASM, AHL, TCC"
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#081C3A] uppercase"
            />
            <p className="text-xs text-slate-400 mt-1">Auto-formatted to UPPERCASE</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Workstation / Site</label>
            <input 
              type="text" 
              value={form.workstation || ''} 
              onChange={e => {
                let val = e.target.value.toUpperCase().trim();
                val = val.replace(/[^A-Z0-9\s]/g, '');
                val = val.replace(/\s+/g, ' ');
                update('workstation', val);
              }}
              placeholder="e.g., CLINIC, MAIN OFFICE, GATE 1"
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#081C3A] uppercase"
            />
            <p className="text-xs text-slate-400 mt-1">Auto-formatted to UPPERCASE</p>
          </div>
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-slate-800 mb-3 text-sm">Compensation & Payment</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Basic Salary (MK)</label>
            <input 
              type="text" 
              value={formatNumberWithCommas(String(form.basicSalary || '0'))} 
              onChange={handleSalaryChange}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#081C3A] text-right" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Pay Point</label>
            <select 
              value={form.pay_point || ''} 
              onChange={e => update('pay_point', e.target.value)} 
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#081C3A] bg-white"
            >
              <option value="">Select Pay Point</option>
              <option value="national_bank">National Bank of Malawi</option>
              <option value="standard_bank">Standard Bank</option>
              <option value="nbs_bank">NBS Bank</option>
              <option value="centenary_bank">Centenary Bank</option>
              <option value="fdh_bank">FDH Bank</option>
              <option value="first_capital_bank">First Capital Bank</option>
              <option value="airtel_money">Airtel Money</option>
              <option value="tnm_mpamba">TNM Mpamba</option>
            </select>
          </div>
        </div>
      </div>

      {/* Uniform Deduction Section - Edit Form */}
      <div>
        <h4 className="font-semibold text-slate-800 mb-3 text-sm">
          Uniform & Benefits
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Uniform Deduction (MK)
              <span className="text-xs text-slate-500 ml-2">(Default: 10,000)</span>
            </label>
            <input
              type="text"
              value={formatNumberWithCommas(String(form.uniform_deduction || '0'))}
              onChange={handleUniformDeductionChange}
              placeholder="10,000"
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#081C3A] text-right"
            />
            <p className="text-xs text-slate-400 mt-1">
              This amount will be deducted from monthly income and refunded in terminal dues
            </p>
          </div>
          <div className="flex items-end">
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 w-full">
              <p className="text-xs text-amber-700">
                <strong>Note:</strong> Uniform deduction is optional. Enter 0 if no deduction applies.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-slate-800 mb-3 text-sm">Bank Account</h4>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Bank Account / Mobile Money Number</label>
            <input 
              type="text" 
              value={form.account_number || ''} 
              onChange={e => update('account_number', e.target.value)}
              placeholder="e.g., 5063532125021 or 0888123456"
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#081C3A]" 
            />
            <p className="text-xs text-slate-400 mt-1">Bank account number for salary payments</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium hover:bg-slate-50">Cancel</button>
        <button type="submit" className="px-5 py-2 rounded-lg bg-[#D4A017] text-white text-sm font-semibold hover:bg-[#e8b82e]">✓ Update Employee</button>
      </div>
    </form>
  );
}

// EmployeeProfile Component - UPDATED WITH UNIFORM DEDUCTION
function EmployeeProfile({ employee, onBack }: { employee: Employee; onBack: () => void }) {
  const [tab, setTab] = useState('profile');
  
  const tabs = [
    { id: 'profile', label: 'Overview' }, { id: 'payroll', label: 'Payroll' },
    { id: 'attendance', label: 'Attendance' }, { id: 'documents', label: 'Documents' }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <button onClick={onBack} className="text-sm text-slate-600 hover:text-[#081C3A] flex items-center gap-2">← Back to Employees</button>

      <Card className="p-6 bg-gradient-to-br from-[#081C3A] to-[#1a2f5c] text-white border-0">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="w-24 h-24 rounded-2xl bg-[#D4A017] flex items-center justify-center text-white text-3xl font-bold shadow-xl shrink-0">
            {employee.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h2 className="text-2xl font-bold">{employee.fullName}</h2>
              <Badge color={employee.status === 'Active' ? 'green' : 'yellow'}>{employee.status}</Badge>
              <Badge color="gold">{employee.contractType || 'Permanent'}</Badge>
            </div>
            <p className="text-white/70 mb-4">{employee.position} · {employee.department} · {employee.employeeNumber}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div><p className="text-xs text-white/60">Phone</p><p className="text-sm">{employee.phone || '-'}</p></div>
              <div><p className="text-xs text-white/60">Email</p><p className="text-sm truncate">{employee.email || '-'}</p></div>
              <div><p className="text-xs text-white/60">Account</p><p className="text-sm font-mono text-xs">{employee.account_number || '-'}</p></div>
              <div><p className="text-xs text-white/60">Basic Salary</p><p className="text-sm font-semibold">{formatKwacha(employee.basicSalary)}</p></div>
            </div>
          </div>
        </div>
      </Card>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-6">
            <h3 className="font-semibold text-slate-800 mb-4">Personal Information</h3>
            <div className="space-y-3 text-sm">
              {[
                ['Full Name', employee.fullName], ['Gender', employee.gender], ['Age', String(employee.age)],
                ['Date of Birth', employee.dob || '-'], ['National ID', employee.nationalId || '-'], ['Phone', employee.phone || '-'],
                ['Address', employee.address || '-'], ['Email', employee.email || '-']
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">{k}</span><span className="font-medium text-slate-800">{v}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-slate-800 mb-4">Employment Information</h3>
            <div className="space-y-3 text-sm">
              {[
                ['Position', employee.position], ['Department', employee.department], ['Qualification', employee.qualification || '-'],
                ['Date Hired', employee.dateHired], ['Contract Type', employee.contractType || 'Permanent'],
                ['Company', employee.company || '-'], ['Workstation', employee.workstation || '-'],
                ['Pay Point', employee.pay_point || '-'], ['Bank Account', employee.account_number || '-'],
                ['Uniform Deduction', formatKwacha(employee.uniform_deduction || 0)],
                ['Status', employee.status]
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">{k}</span><span className="font-medium text-slate-800">{v}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-slate-800 mb-4">Payroll Information</h3>
            <div className="space-y-3 text-sm">
              {[
                ['Basic Salary', formatKwacha(employee.basicSalary)],
                ['Uniform Deduction', formatKwacha(employee.uniform_deduction || 0)],
                ['Allowances (10%)', formatKwacha(Math.round(employee.basicSalary * 0.1))],
                ['Overtime (5%)', formatKwacha(Math.round(employee.basicSalary * 0.05))],
                ['Gross Pay', formatKwacha(Math.round(employee.basicSalary * 1.15))],
                ['PAYE (30%)', formatKwacha(Math.round(employee.basicSalary * 1.15 * 0.3))],
                ['Pension (5%)', formatKwacha(Math.round(employee.basicSalary * 1.15 * 0.05))],
                ['Net Pay (before uniform)', formatKwacha(Math.round(employee.basicSalary * 1.15 * 0.65))],
                ['Net Pay (after uniform)', formatKwacha(Math.round(employee.basicSalary * 1.15 * 0.65 - (employee.uniform_deduction || 0)))]
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">{k}</span><span className="font-medium text-slate-800">{v}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'payroll' && (
        <Card className="p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Payroll History</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {['July 2025', 'August 2025', 'September 2025', 'October 2025', 'November 2025'].map(period => (
              <div key={period} className="p-4 rounded-lg border border-slate-100 hover:border-[#081C3A] transition-colors">
                <p className="text-xs text-slate-500">{period}</p>
                <p className="text-lg font-bold text-slate-800 mt-1">{formatKwacha(Math.round(employee.basicSalary * 1.15 * 0.65 - (employee.uniform_deduction || 0)))}</p>
                <p className="text-xs text-slate-500 mt-1">Net Pay (after uniform)</p>
                <Button variant="outline" className="mt-3 text-xs w-full py-1.5">View Payslip</Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === 'attendance' && (
        <Card className="p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Recent Attendance — November 2025</h3>
          <div className="grid grid-cols-7 md:grid-cols-15 gap-1.5">
            {Array.from({ length: 30 }, (_, i) => {
              const r = (i * 17) % 10;
              let s = 'P', c = 'bg-emerald-500';
              if (r > 8) { s = 'A'; c = 'bg-red-400'; }
              else if (r > 7) { s = 'L'; c = 'bg-yellow-400'; }
              else if (r > 6) { s = 'LV'; c = 'bg-blue-400'; }
              return (
                <div key={i} className="flex flex-col items-center">
                  <div className={`w-full aspect-square rounded flex items-center justify-center text-white text-xs font-semibold ${c}`}>{s}</div>
                  <span className="text-[10px] text-slate-500 mt-1">{i + 1}</span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-6 text-xs flex-wrap">
            <span className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-emerald-500" /> Present</span>
            <span className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-red-400" /> Absent</span>
            <span className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-yellow-400" /> Late</span>
            <span className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-blue-400" /> Leave</span>
          </div>
        </Card>
      )}

      {tab === 'documents' && (
        <Card className="p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Employee Documents</h3>
          <div className="space-y-2">
            {['Contract Agreement.pdf', 'Certified ID Copy.pdf', 'Qualification Certificate.pdf', 'Security License.pdf', 'Medical Report.pdf'].map((f, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded bg-red-50 text-red-600 flex items-center justify-center font-bold text-xs">PDF</div>
                  <span className="text-sm text-slate-800">{f}</span>
                </div>
                <Button variant="outline" className="text-xs py-1.5">Download</Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}