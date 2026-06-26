import { useState, useMemo, useEffect } from 'react';
import { Shield, FileDown, FileText, FileSpreadsheet, Download, Printer, Plus, Trash2, Edit2, Search, MapPin, CheckCircle, Map, Building2, Car, Sparkles, Bot, Percent, CreditCard, Camera, ClipboardList } from 'lucide-react';
import { Card, Button, Badge, PageHeader, THead, TBody, TR, TH, TD, Modal, Tabs, Input } from '../components/ui';
import { generateEmployees, formatKwacha, computePayroll, netPay, grossPay, Employee } from '../data';
import { UserManagement } from '../components/UserManagement';
import { supabase } from '../lib/supabase';

/* ----------------- PAYSLIPS PAGE ----------------- */
export function PayslipsPage() {
  const employees = useMemo(() => generateEmployees(245), []);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<Employee | null>(null);
  const filtered = employees.filter(e => e.fullName.toLowerCase().includes(search.toLowerCase()) || e.employeeNumber.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Payslips" subtitle="Generate and print professional payslips" actions={<><Button variant="outline"><FileText size={16} /> November 2025</Button><Button variant="secondary"><FileDown size={16} /> Bulk Download</Button></>} />
      <Card className="p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employees..." className="w-full pl-10 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#081C3A]" /></div>
        <div className="text-sm text-slate-500">{filtered.length} payslips ready</div>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.slice(0, 18).map(emp => {
          const p = computePayroll(emp);
          return (
            <Card key={emp.id} className="p-5 hover:shadow-lg cursor-pointer transition-shadow" onClick={() => setView(emp)}>
              <div className="flex items-start justify-between mb-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-[#081C3A] text-white text-xs font-bold flex items-center justify-center">{emp.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}</div><div><p className="font-semibold text-slate-800 text-sm">{emp.fullName}</p><p className="text-xs text-slate-500">{emp.employeeNumber}</p></div></div><Badge color="green">Processed</Badge></div>
              <div className="border-t border-slate-100 pt-4"><p className="text-xs text-slate-500 mb-1">November 2025 · Net Pay</p><p className="text-2xl font-bold text-[#081C3A]">{formatKwacha(netPay(p))}</p><div className="flex gap-2 mt-4"><Button variant="outline" className="text-xs py-1.5 flex-1"><Printer size={12} /> Print</Button><Button variant="secondary" className="text-xs py-1.5 flex-1"><Download size={12} /> PDF</Button></div></div>
            </Card>
          );
        })}
      </div>
      <Modal open={!!view} onClose={() => setView(null)} title="Payslip Preview" size="lg">{view && <PayslipPDF employee={view} />}</Modal>
    </div>
  );
}

function PayslipPDF({ employee }: { employee: Employee }) {
  const p = computePayroll(employee);
  const g = grossPay(p);
  const n = netPay(p);
  return (
    <div className="space-y-5">
      <div className="p-6 rounded-lg border-2 border-slate-200 bg-white" id="payslip-content">
        <div className="flex items-start justify-between pb-4 border-b-2 border-[#081C3A]"><div className="flex items-center gap-3"><div className="w-14 h-14 rounded-xl bg-[#081C3A] flex items-center justify-center"><Shield size={24} className="text-[#D4A017]" /></div><div><h1 className="text-xl font-bold text-[#081C3A]">SAFEGUARD SECURITY SERVICES</h1><p className="text-xs text-slate-500">Lilongwe, Malawi · (+265) 1 234 567</p></div></div><div className="text-right"><p className="text-sm font-bold text-[#081C3A]">PAYSLIP</p><p className="text-xs text-slate-500">November 2025</p></div></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 text-xs border-b border-slate-100"><div><p className="text-slate-500">Employee</p><p className="font-semibold text-slate-800">{employee.fullName}</p></div><div><p className="text-slate-500">Employee No.</p><p className="font-semibold text-slate-800">{employee.employeeNumber}</p></div><div><p className="text-slate-500">Position</p><p className="font-semibold text-slate-800">{employee.position}</p></div><div><p className="text-slate-500">Department</p><p className="font-semibold text-slate-800">{employee.department}</p></div><div><p className="text-slate-500">Pay Period</p><p className="font-semibold text-slate-800">Nov 01 - Nov 30, 2025</p></div><div><p className="text-slate-500">Pay Point</p><p className="font-semibold text-slate-800">{employee.payPoint}</p></div><div><p className="text-slate-500">Contract</p><p className="font-semibold text-slate-800">{employee.contractType}</p></div><div><p className="text-slate-500">Date Paid</p><p className="font-semibold text-slate-800">Nov 30, 2025</p></div></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4"><div><h3 className="text-xs font-bold text-[#081C3A] uppercase tracking-wider mb-3 pb-2 border-b border-slate-200">Earnings</h3><div className="space-y-2 text-xs">{[['Basic Salary', p.basic], ['Allowances', p.allowances], ['Overtime', p.overtime], ['Bonus', p.bonus]].map(([k, v]) => (<div key={String(k)} className="flex justify-between"><span className="text-slate-600">{k}</span><span className="font-mono text-slate-800">{formatKwacha(v as number)}</span></div>))}<div className="flex justify-between pt-2 mt-2 border-t border-slate-200 font-bold"><span>Gross Pay</span><span className="font-mono text-[#081C3A]">{formatKwacha(g)}</span></div></div></div><div><h3 className="text-xs font-bold text-[#081C3A] uppercase tracking-wider mb-3 pb-2 border-b border-slate-200">Deductions</h3><div className="space-y-2 text-xs">{[['PAYE Tax', p.paye], ['Pension (5%)', p.pension], ['Absenteeism', p.absenteeism], ['Other Deductions', p.otherDeductions]].map(([k, v]) => (<div key={String(k)} className="flex justify-between"><span className="text-slate-600">{k}</span><span className="font-mono text-red-600">-{formatKwacha(v as number)}</span></div>))}<div className="flex justify-between pt-2 mt-2 border-t border-slate-200 font-bold"><span>Total Deductions</span><span className="font-mono text-red-600">-{formatKwacha(p.paye + p.pension)}</span></div></div></div></div>
        <div className="p-5 rounded-lg bg-gradient-to-r from-[#081C3A] to-[#1a2f5c] text-white flex items-center justify-between"><div><p className="text-xs opacity-80 uppercase tracking-wider">Total Net Pay</p><p className="text-3xl font-bold text-[#D4A017]">{formatKwacha(n)}</p></div><div className="text-right text-xs"><p className="opacity-80">Payment Method: Bank Transfer</p><p className="opacity-80">Authorized: William Banda (Admin)</p></div></div>
        <p className="text-center text-xs text-slate-400 mt-4">This is a system-generated payslip. No signature required.</p>
      </div>
      <div className="flex items-center justify-end gap-2"><Button variant="outline"><Printer size={14} /> Print</Button><Button variant="secondary"><Download size={14} /> Download PDF</Button></div>
    </div>
  );
}

/* ----------------- REPORTS ----------------- */
export function ReportsPage() {
  const [active, setActive] = useState('employee');
  const tabs = [{ id: 'employee', label: 'Employee Report' }, { id: 'payroll', label: 'Payroll Report' }, { id: 'attendance', label: 'Attendance Report' }, { id: 'recruitment', label: 'Recruitment Report' }, { id: 'department', label: 'Department Report' }];
  const employees = generateEmployees(245);
  const totalPayroll = employees.reduce((sum, e) => sum + netPay(computePayroll(e)), 0);
  const byDept: Record<string, { count: number; total: number }> = {};
  employees.forEach(e => { if (!byDept[e.department]) byDept[e.department] = { count: 0, total: 0 }; byDept[e.department].count++; byDept[e.department].total += netPay(computePayroll(e)); });
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Reports & Analytics" subtitle="Comprehensive business intelligence dashboard" actions={<><Button variant="outline"><FileDown size={16} /> PDF</Button><Button variant="outline"><FileSpreadsheet size={16} /> Excel</Button><Button variant="secondary"><FileText size={16} /> CSV</Button></>} />
      <Card className="p-5"><div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">{[{ l: 'Total Employees', n: employees.length, sub: '245 active personnel' }, { l: 'Total Payroll', n: formatKwacha(totalPayroll), sub: 'November 2025' }, { l: 'Avg. Salary', n: formatKwacha(Math.round(totalPayroll / employees.length)), sub: 'Per employee' }, { l: 'Departments', n: Object.keys(byDept).length, sub: 'Operational units' }].map((s, i) => (<div key={i} className="p-4 rounded-lg bg-slate-50"><p className="text-xs text-slate-500">{s.l}</p><p className="text-xl font-bold text-slate-800 mt-1">{s.n}</p><p className="text-xs text-slate-500 mt-1">{s.sub}</p></div>))}</div></Card>
      <Tabs tabs={tabs} active={active} onChange={setActive} />
      <Card className="p-6"><h3 className="font-semibold text-slate-800 mb-4 capitalize">{tabs.find(t => t.id === active)?.label} — November 2025</h3><div className="overflow-x-auto"><table className="w-full text-sm"><THead><TR hover={false}><TH>Department</TH><TH>Employees</TH><TH className="text-right">Total Payroll</TH><TH className="text-right hidden md:table-cell">Average</TH><TH>Attendance</TH><TH className="hidden lg:table-cell">Status</TH></TR></THead><TBody>{Object.entries(byDept).sort((a, b) => b[1].count - a[1].count).map(([dept, data]) => (<TR key={dept}><TD><strong>{dept}</strong></TD><TD>{data.count} employees</TD><TD className="text-right font-mono font-semibold">{formatKwacha(data.total)}</TD><TD className="text-right font-mono hidden md:table-cell">{formatKwacha(Math.round(data.total / data.count))}</TD><TD><Badge color="green">{(94 + Math.floor(Math.random() * 5))}.{Math.floor(Math.random() * 9)}%</Badge></TD><TD className="hidden lg:table-cell"><Badge color={data.count > 20 ? 'green' : 'gold'}>{data.count > 20 ? 'Healthy' : 'Optimal'}</Badge></TD></TR>))}</TBody></table></div></Card>
    </div>
  );
}

/* ----------------- SETTINGS ----------------- */
export function SettingsPage() {
  const [tab, setTab] = useState('company');
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [roles, setRoles] = useState<any[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [roleForm, setRoleForm] = useState({
    name: '',
    color: 'blue',
    perms: ['', '', '']
  });
  
  // Positions state
  const [positions, setPositions] = useState<any[]>([]);
  const [showPositionModal, setShowPositionModal] = useState(false);
  const [editingPosition, setEditingPosition] = useState<any>(null);
  const [positionForm, setPositionForm] = useState({
    name: '',
    category: 'security',
    default_salary: 150000,
    is_active: true
  });

  const colorOptions = [
    { value: 'navy', label: 'Navy Blue', class: 'bg-[#081C3A]' },
    { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
    { value: 'gold', label: 'Gold', class: 'bg-[#D4A017]' },
    { value: 'green', label: 'Green', class: 'bg-green-500' },
    { value: 'red', label: 'Red', class: 'bg-red-500' },
    { value: 'purple', label: 'Purple', class: 'bg-purple-500' }
  ];

  const categoryOptions = [
    { value: 'security', label: 'Security' },
    { value: 'admin', label: 'Administration' },
    { value: 'management', label: 'Management' },
    { value: 'support', label: 'Support' }
  ];

  const [companyForm, setCompanyForm] = useState({
    companyName: 'Safeguard Security Services Ltd.',
    registration: 'REG-123456-MW',
    address: 'Area 11, Capital Hill, Lilongwe, Malawi',
    phone: '+265 1 234 567',
    email: 'info@safeguard.mw',
    website: 'www.safeguard.mw',
    taxId: 'MW-12345678',
    pensionReg: 'NBS-123456'
  });
  
  const [taxForm, setTaxForm] = useState({
    taxRate: '30',
    taxFreeThreshold: '50000',
    taxAuthority: 'Malawi Revenue Authority',
    filingFrequency: 'Monthly'
  });
  
  const [pensionForm, setPensionForm] = useState({
    employeeContribution: '5',
    employerContribution: '5',
    pensionFund: 'NBS Pension Fund',
    remittanceCycle: 'Monthly'
  });
  
  const [payrollForm, setPayrollForm] = useState({
    defaultPayDate: 'Last working day',
    currency: 'Malawi Kwacha (MK)',
    allowanceRate: '10',
    overtimeRate: '5',
    workingDays: '22',
    payPeriod: 'November 2025'
  });
  
  const [systemSettings, setSystemSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    autoAttendanceSync: true,
    twoFactorAuth: false,
    auditLogging: true,
    dataEncryption: true
  });

  const tabs = [
    { id: 'company', label: 'Company' },
    { id: 'tax', label: 'Tax Settings' },
    { id: 'pension', label: 'Pension' },
    { id: 'payroll', label: 'Payroll' },
    { id: 'positions', label: 'Positions' },
    { id: 'users', label: 'User Management' },
    { id: 'roles', label: 'User Roles' },
    { id: 'system', label: 'System' }
  ];

  // Load positions from database
  const loadPositions = async () => {
    try {
      const { data, error } = await supabase
        .from('positions')
        .select('*')
        .order('name');
      if (error) throw error;
      setPositions(data || []);
    } catch (error) {
      console.error('Error loading positions:', error);
    }
  };

  // Save position (create or update)
  const handleSavePosition = async () => {
    if (!positionForm.name.trim()) {
      alert('Please enter a position name');
      return;
    }
    
    try {
      if (editingPosition) {
        const { error } = await supabase
          .from('positions')
          .update({
            name: positionForm.name,
            category: positionForm.category,
            default_salary: positionForm.default_salary,
            is_active: positionForm.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingPosition.id);
        if (error) throw error;
        alert('Position updated successfully');
      } else {
        const { error } = await supabase
          .from('positions')
          .insert([{
            name: positionForm.name,
            category: positionForm.category,
            default_salary: positionForm.default_salary,
            is_active: positionForm.is_active
          }]);
        if (error) throw error;
        alert('Position added successfully');
      }
      
      await loadPositions();
      setShowPositionModal(false);
      setEditingPosition(null);
      setPositionForm({ name: '', category: 'security', default_salary: 150000, is_active: true });
    } catch (error: any) {
      console.error('Error saving position:', error);
      alert(`Failed to save position: ${error.message || 'Unknown error'}`);
    }
  };

  // Delete position
  const handleDeletePosition = async (position: any) => {
    if (confirm(`Are you sure you want to delete "${position.name}"? This may affect existing employees.`)) {
      try {
        const { error } = await supabase
          .from('positions')
          .delete()
          .eq('id', position.id);
        if (error) throw error;
        await loadPositions();
        alert('Position deleted successfully');
      } catch (error: any) {
        console.error('Error deleting position:', error);
        alert(`Failed to delete position: ${error.message || 'Unknown error'}`);
      }
    }
  };

  // Edit position
  const handleEditPosition = (position: any) => {
    setEditingPosition(position);
    setPositionForm({
      name: position.name,
      category: position.category,
      default_salary: position.default_salary,
      is_active: position.is_active
    });
    setShowPositionModal(true);
  };

  // Load roles from Supabase
  const loadRoles = async () => {
    setLoadingRoles(true);
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setRoles(data || []);
    } catch (error) {
      console.error('Error loading roles:', error);
    } finally {
      setLoadingRoles(false);
    }
  };

  const handleSaveCompany = () => {
    setSaving(true);
    localStorage.setItem('companySettings', JSON.stringify(companyForm));
    setTimeout(() => {
      setSaving(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }, 500);
  };

  const handleSaveTax = () => {
    setSaving(true);
    localStorage.setItem('taxSettings', JSON.stringify(taxForm));
    setTimeout(() => {
      setSaving(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }, 500);
  };

  const handleSavePension = () => {
    setSaving(true);
    localStorage.setItem('pensionSettings', JSON.stringify(pensionForm));
    setTimeout(() => {
      setSaving(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }, 500);
  };

  const handleSavePayroll = () => {
    setSaving(true);
    localStorage.setItem('payrollSettings', JSON.stringify(payrollForm));
    setTimeout(() => {
      setSaving(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }, 500);
  };

  const handleCancel = () => {
    const savedCompany = localStorage.getItem('companySettings');
    if (savedCompany) setCompanyForm(JSON.parse(savedCompany));
  };

  const handleToggleSetting = (index: number) => {
    const settingKeys = ['emailNotifications', 'smsNotifications', 'autoAttendanceSync', 'twoFactorAuth', 'auditLogging', 'dataEncryption'];
    const setting = settingKeys[index];
    setSystemSettings(prev => ({ ...prev, [setting]: !prev[setting as keyof typeof prev] }));
  };

  // Role Functions
  const handleNewRole = () => {
    setEditingRole(null);
    setRoleForm({ name: '', color: 'blue', perms: ['', '', ''] });
    setShowRoleModal(true);
  };

  const handleEditRole = (role: any) => {
    setEditingRole(role);
    setRoleForm({
      name: role.name,
      color: role.color,
      perms: [...role.perms, '', '', ''].slice(0, 3)
    });
    setShowRoleModal(true);
  };

  const handleDeleteRole = async (roleId: number, roleName: string) => {
    if (confirm(`Are you sure you want to delete "${roleName}"?`)) {
      try {
        const { error } = await supabase.from('user_roles').delete().eq('id', roleId);
        if (error) throw error;
        await loadRoles();
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        alert('Role deleted successfully');
      } catch (error) {
        console.error('Error deleting role:', error);
        alert('Failed to delete role');
      }
    }
  };

  const handleSaveRole = async () => {
    if (!roleForm.name.trim()) {
      alert('Please enter a role name');
      return;
    }
    
    const newRole = {
      name: roleForm.name,
      users: editingRole ? editingRole.users : 0,
      color: roleForm.color,
      perms: roleForm.perms.filter(p => p.trim() !== '')
    };
    
    try {
      if (editingRole) {
        const { error } = await supabase
          .from('user_roles')
          .update(newRole)
          .eq('id', editingRole.id);
        if (error) throw error;
        alert('Role updated successfully');
      } else {
        const { error } = await supabase.from('user_roles').insert([newRole]);
        if (error) throw error;
        alert('Role created successfully');
      }
      
      await loadRoles();
      setShowRoleModal(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving role:', error);
      alert('Failed to save role');
    }
  };

  useEffect(() => {
    const savedCompany = localStorage.getItem('companySettings');
    if (savedCompany) setCompanyForm(JSON.parse(savedCompany));
    const savedTax = localStorage.getItem('taxSettings');
    if (savedTax) setTaxForm(JSON.parse(savedTax));
    const savedPension = localStorage.getItem('pensionSettings');
    if (savedPension) setPensionForm(JSON.parse(savedPension));
    const savedPayroll = localStorage.getItem('payrollSettings');
    if (savedPayroll) setPayrollForm(JSON.parse(savedPayroll));
    
    loadRoles();
    loadPositions();
  }, []);

  const RoleModal = () => (
    <Modal open={showRoleModal} onClose={() => setShowRoleModal(false)} title={editingRole ? 'Edit Role' : 'Create New Role'} size="lg">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Role Name *</label>
          <input
            type="text"
            value={roleForm.name}
            onChange={(e) => setRoleForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Regional Manager, Team Lead"
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#081C3A]"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Role Color</label>
          <div className="flex gap-2 flex-wrap">
            {colorOptions.map(color => (
              <button
                key={color.value}
                type="button"
                onClick={() => setRoleForm(prev => ({ ...prev, color: color.value }))}
                className={`w-10 h-10 rounded-lg ${color.class} ${roleForm.color === color.value ? 'ring-2 ring-offset-2 ring-[#081C3A]' : ''}`}
                title={color.label}
              />
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-1">Navy=Admin, Blue=Manager, Gold=Finance, Green=Supervisor, Red=Executive, Purple=Special</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Permissions</label>
          <div className="space-y-2">
            {[0, 1, 2].map((idx) => (
              <input
                key={idx}
                type="text"
                value={roleForm.perms[idx] || ''}
                onChange={(e) => {
                  const newPerms = [...roleForm.perms];
                  newPerms[idx] = e.target.value;
                  setRoleForm(prev => ({ ...prev, perms: newPerms }));
                }}
                placeholder={`Permission ${idx + 1}`}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#081C3A]"
              />
            ))}
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-6">
        <Button variant="outline" onClick={() => setShowRoleModal(false)}>Cancel</Button>
        <Button variant="secondary" onClick={handleSaveRole}>
          <CheckCircle size={14} className="mr-1" /> {editingRole ? 'Update Role' : 'Create Role'}
        </Button>
      </div>
    </Modal>
  );

  // Position Modal
  const PositionModal = () => (
    <Modal open={showPositionModal} onClose={() => setShowPositionModal(false)} title={editingPosition ? 'Edit Position' : 'New Position'} size="md">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Position Name *</label>
          <input
            type="text"
            value={positionForm.name}
            onChange={(e) => setPositionForm({...positionForm, name: e.target.value})}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#081C3A]"
            placeholder="e.g., Regional Manager, Security Guard"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
          <select
            value={positionForm.category}
            onChange={(e) => setPositionForm({...positionForm, category: e.target.value})}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#081C3A]"
          >
            {categoryOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          <p className="text-xs text-slate-400 mt-1">Categorizes the position for reporting purposes</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Default Salary (MK)</label>
          <input
            type="number"
            value={positionForm.default_salary}
            onChange={(e) => setPositionForm({...positionForm, default_salary: parseInt(e.target.value) || 0})}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#081C3A]"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={positionForm.is_active}
            onChange={(e) => setPositionForm({...positionForm, is_active: e.target.checked})}
            className="w-4 h-4 rounded border-slate-300"
          />
          <label className="text-sm text-slate-700">Active (visible in employee form)</label>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-6">
        <Button variant="outline" onClick={() => setShowPositionModal(false)}>Cancel</Button>
        <Button variant="secondary" onClick={handleSavePosition}>
          <CheckCircle size={14} className="mr-1" /> {editingPosition ? 'Update Position' : 'Create Position'}
        </Button>
      </div>
    </Modal>
  );

  if (loadingRoles) {
    return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-[#D4A017] border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="System Settings" subtitle="Configure company preferences and policies" />
      
      {showSuccess && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm animate-fade-in">
          Settings saved successfully!
        </div>
      )}
      
      <Tabs tabs={tabs} active={tab} onChange={setTab} />
      
      {tab === 'company' && (
        <Card className="p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Company Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Company Name" value={companyForm.companyName} onChange={(e: any) => setCompanyForm({...companyForm, companyName: e.target.value})} />
            <Input label="Company Registration" value={companyForm.registration} onChange={(e: any) => setCompanyForm({...companyForm, registration: e.target.value})} />
            <Input label="Address" value={companyForm.address} onChange={(e: any) => setCompanyForm({...companyForm, address: e.target.value})} />
            <Input label="Phone" value={companyForm.phone} onChange={(e: any) => setCompanyForm({...companyForm, phone: e.target.value})} />
            <Input label="Email" value={companyForm.email} onChange={(e: any) => setCompanyForm({...companyForm, email: e.target.value})} />
            <Input label="Website" value={companyForm.website} onChange={(e: any) => setCompanyForm({...companyForm, website: e.target.value})} />
            <Input label="Tax ID (TPIN)" value={companyForm.taxId} onChange={(e: any) => setCompanyForm({...companyForm, taxId: e.target.value})} />
            <Input label="Pension Registration" value={companyForm.pensionReg} onChange={(e: any) => setCompanyForm({...companyForm, pensionReg: e.target.value})} />
          </div>
          <div className="flex items-center justify-end gap-2 mt-6">
            <Button variant="outline" onClick={handleCancel}>Cancel</Button>
            <Button variant="secondary" onClick={handleSaveCompany} disabled={saving}>
              {saving ? 'Saving...' : <><CheckCircle size={14} className="mr-1" /> Save Changes</>}
            </Button>
          </div>
        </Card>
      )}
      
      {tab === 'tax' && (
        <Card className="p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Tax Settings (PAYE)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="PAYE Tax Rate (%)" value={taxForm.taxRate} onChange={(e: any) => setTaxForm({...taxForm, taxRate: e.target.value})} />
            <Input label="Tax Free Threshold (MK)" value={taxForm.taxFreeThreshold} onChange={(e: any) => setTaxForm({...taxForm, taxFreeThreshold: e.target.value})} />
            <Input label="Tax Authority" value={taxForm.taxAuthority} onChange={(e: any) => setTaxForm({...taxForm, taxAuthority: e.target.value})} />
            <Input label="Filing Frequency" value={taxForm.filingFrequency} onChange={(e: any) => setTaxForm({...taxForm, filingFrequency: e.target.value})} />
          </div>
          <div className="mt-6 p-4 rounded-lg bg-[#FFF9E5] text-sm">
            <Percent size={16} className="inline mr-2 text-[#D4A017]" />
            Current policy: Flat {taxForm.taxRate}% PAYE on gross income above MK {parseInt(taxForm.taxFreeThreshold).toLocaleString()} threshold.
          </div>
          <div className="flex items-center justify-end gap-2 mt-6">
            <Button variant="outline" onClick={handleCancel}>Cancel</Button>
            <Button variant="secondary" onClick={handleSaveTax} disabled={saving}>
              {saving ? 'Saving...' : <><CheckCircle size={14} className="mr-1" /> Save Changes</>}
            </Button>
          </div>
        </Card>
      )}
      
      {tab === 'pension' && (
        <Card className="p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Pension Contribution Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Employee Contribution (%)" value={pensionForm.employeeContribution} onChange={(e: any) => setPensionForm({...pensionForm, employeeContribution: e.target.value})} />
            <Input label="Employer Contribution (%)" value={pensionForm.employerContribution} onChange={(e: any) => setPensionForm({...pensionForm, employerContribution: e.target.value})} />
            <Input label="Pension Fund" value={pensionForm.pensionFund} onChange={(e: any) => setPensionForm({...pensionForm, pensionFund: e.target.value})} />
            <Input label="Remittance Cycle" value={pensionForm.remittanceCycle} onChange={(e: any) => setPensionForm({...pensionForm, remittanceCycle: e.target.value})} />
          </div>
          <div className="flex items-center justify-end gap-2 mt-6">
            <Button variant="outline" onClick={handleCancel}>Cancel</Button>
            <Button variant="secondary" onClick={handleSavePension} disabled={saving}>
              {saving ? 'Saving...' : <><CheckCircle size={14} className="mr-1" /> Save Changes</>}
            </Button>
          </div>
        </Card>
      )}
      
      {tab === 'payroll' && (
        <Card className="p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Payroll Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Default Pay Date" value={payrollForm.defaultPayDate} onChange={(e: any) => setPayrollForm({...payrollForm, defaultPayDate: e.target.value})} />
            <Input label="Payroll Currency" value={payrollForm.currency} onChange={(e: any) => setPayrollForm({...payrollForm, currency: e.target.value})} />
            <Input label="Allowance Rate (%)" value={payrollForm.allowanceRate} onChange={(e: any) => setPayrollForm({...payrollForm, allowanceRate: e.target.value})} />
            <Input label="Overtime Rate (%)" value={payrollForm.overtimeRate} onChange={(e: any) => setPayrollForm({...payrollForm, overtimeRate: e.target.value})} />
            <Input label="Working Days" value={payrollForm.workingDays} onChange={(e: any) => setPayrollForm({...payrollForm, workingDays: e.target.value})} />
            <Input label="Pay Period" value={payrollForm.payPeriod} onChange={(e: any) => setPayrollForm({...payrollForm, payPeriod: e.target.value})} />
          </div>
          <div className="mt-6 p-4 rounded-lg bg-[#E8EDF5] text-sm flex items-start gap-3">
            <CreditCard size={18} className="text-[#081C3A] shrink-0 mt-0.5" />
            <div><strong>Bank Integration:</strong> National Bank of Malawi · NBS Bank · FDH Bank</div>
          </div>
          <div className="flex items-center justify-end gap-2 mt-6">
            <Button variant="outline" onClick={handleCancel}>Cancel</Button>
            <Button variant="secondary" onClick={handleSavePayroll} disabled={saving}>
              {saving ? 'Saving...' : <><CheckCircle size={14} className="mr-1" /> Save Changes</>}
            </Button>
          </div>
        </Card>
      )}
      
      {/* Positions Tab */}
      {tab === 'positions' && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-800">Job Positions</h3>
              <p className="text-xs text-slate-500">Manage job titles and positions available for employees</p>
            </div>
            <Button variant="secondary" onClick={() => {
              setEditingPosition(null);
              setPositionForm({ name: '', category: 'security', default_salary: 150000, is_active: true });
              setShowPositionModal(true);
            }}>
              <Plus size={14} className="mr-1" /> New Position
            </Button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left">Position Name</th>
                  <th className="px-4 py-2 text-left">Category</th>
                  <th className="px-4 py-2 text-right">Default Salary</th>
                  <th className="px-4 py-2 text-center">Status</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {positions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-500">
                      No positions found. Click "New Position" to add one.
                    </td>
                  </tr>
                ) : (
                  positions.map((pos) => (
                    <tr key={pos.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2 font-medium">{pos.name}</td>
                      <td className="px-4 py-2">
                        <Badge color={
                          pos.category === 'security' ? 'blue' :
                          pos.category === 'admin' ? 'purple' :
                          pos.category === 'management' ? 'gold' : 'gray'
                        }>
                          {pos.category}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-right font-mono">
                        {formatKwacha(pos.default_salary)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <Badge color={pos.is_active ? 'green' : 'gray'}>
                          {pos.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleEditPosition(pos)}
                            className="w-7 h-7 rounded-lg hover:bg-slate-100 text-amber-600"
                            title="Edit Position"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeletePosition(pos)}
                            className="w-7 h-7 rounded-lg hover:bg-red-50 text-red-500"
                            title="Delete Position"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      
      {tab === 'users' && <UserManagement />}
      
      {tab === 'roles' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-800">User Roles & Permissions</h3>
              <p className="text-xs text-slate-500">Manage access control and system privileges</p>
            </div>
            <Button variant="secondary" onClick={handleNewRole}><Plus size={14} /> New Role</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((r, i) => (
              <Card key={i} className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-bold text-slate-800">{r.name}</h4>
                    <p className="text-xs text-slate-500">{r.users} active users</p>
                  </div>
                  <Badge color={r.color as any}>{r.name === 'Administrator' ? 'Admin' : 'Standard'}</Badge>
                </div>
                <ul className="text-xs text-slate-600 space-y-1.5 mb-4">
                  {r.perms.map((p: string, j: number) => <li key={j} className="flex items-start gap-2"><CheckCircle size={12} className="text-emerald-600 shrink-0 mt-0.5" />{p}</li>)}
                </ul>
                <div className="flex gap-2 pt-3 border-t border-slate-100">
                  <Button variant="outline" className="text-xs py-1.5 flex-1" onClick={() => handleEditRole(r)}>
                    <Edit2 size={12} /> Edit
                  </Button>
                  <Button variant="ghost" className="text-xs py-1.5 text-red-600" onClick={() => handleDeleteRole(r.id, r.name)}>
                    <Trash2 size={12} /> Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
      
      {tab === 'system' && (
        <Card className="p-6">
          <h3 className="font-semibold text-slate-800 mb-4">System Preferences</h3>
          <div className="space-y-3">
            {['Email notifications', 'SMS notifications', 'Auto-attendance sync', 'Two-factor authentication', 'Audit logging', 'Data encryption'].map((label, i) => (
              <div key={i} className="flex items-start justify-between p-3 rounded-lg hover:bg-slate-50">
                <div>
                  <p className="text-sm font-medium text-slate-800">{label}</p>
                  <p className="text-xs text-slate-500">System setting</p>
                </div>
                <button 
                  onClick={() => handleToggleSetting(i)}
                  className={`w-11 h-6 rounded-full relative transition-colors ${Object.values(systemSettings)[i] ? 'bg-[#D4A017]' : 'bg-slate-300'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${Object.values(systemSettings)[i] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}
      
      <RoleModal />
      <PositionModal />
    </div>
  );
}


/* ----------------- SECURITY PERSONNEL ----------------- */

export function SecurityPage() {
  const [securityData, setSecurityData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showAddGuard, setShowAddGuard] = useState(false);
  const [editingGuard, setEditingGuard] = useState<any>(null);
  
  const [guardForm, setGuardForm] = useState({
    full_name: '',
    employee_number: '',
    position: 'Security Guard',
    phone: '',
    deployment_site: '',
    status: 'Active'
  });

  const statusList = ['Active', 'On Leave', 'Suspended'];
  const positionList = ['Security Guard', 'Senior Security Officer', 'Patrol Officer', 'Supervisor'];

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

  const fetchSecurityData = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('employees')
        .select('*')
        .or('position.ilike.%guard%,position.ilike.%security%,position.ilike.%officer%');
      
      if (!userProfile?.is_super_admin && userProfile?.region_id) {
        query = query.eq('region_id', userProfile.region_id);
      }
      
      const { data, error } = await query.order('full_name');
      if (error) throw error;
      
      const mappedData = (data || []).map((emp: any) => ({
        id: emp.id,
        full_name: emp.full_name,
        employee_number: emp.employee_number,
        position: emp.position,
        status: emp.status || 'Active',
        phone: emp.phone || '',
        region_id: emp.region_id,
        deployment_site: emp.workstation || emp.company || 'Not Assigned',
      }));
      
      setSecurityData(mappedData);
    } catch (err: any) {
      console.error('Error fetching security data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userProfile) {
      fetchSecurityData();
    }
  }, [userProfile]);

  const handleAddGuard = async () => {
    if (!guardForm.full_name) {
      alert('Please enter guard name');
      return;
    }
    
    const assignedRegionId = editingGuard 
      ? editingGuard.region_id 
      : (!userProfile?.is_super_admin ? userProfile?.region_id : null);
    
    try {
      if (editingGuard) {
        const { error } = await supabase
          .from('employees')
          .update({
            full_name: guardForm.full_name,
            employee_number: guardForm.employee_number,
            position: guardForm.position,
            phone: guardForm.phone,
            status: guardForm.status,
            workstation: guardForm.deployment_site
          })
          .eq('id', editingGuard.id);
        if (error) throw error;
        alert(`${guardForm.full_name} updated successfully`);
      } else {
        const { error } = await supabase
          .from('employees')
          .insert([{
            full_name: guardForm.full_name,
            employee_number: guardForm.employee_number || `G${Date.now()}`,
            position: guardForm.position,
            phone: guardForm.phone,
            status: guardForm.status,
            region_id: assignedRegionId,
            workstation: guardForm.deployment_site,
            hire_date: new Date().toISOString().split('T')[0],
            department: 'Operations'
          }]);
        if (error) throw error;
        alert(`${guardForm.full_name} added to security personnel`);
      }
      
      setShowAddGuard(false);
      setEditingGuard(null);
      setGuardForm({
        full_name: '',
        employee_number: '',
        position: 'Security Guard',
        phone: '',
        deployment_site: '',
        status: 'Active'
      });
      fetchSecurityData();
    } catch (err: any) {
      console.error('Error saving guard:', err);
      alert('Error saving guard: ' + err.message);
    }
  };

  const handleEdit = (guard: any) => {
    setEditingGuard(guard);
    setGuardForm({
      full_name: guard.full_name,
      employee_number: guard.employee_number,
      position: guard.position,
      phone: guard.phone || '',
      deployment_site: guard.deployment_site || '',
      status: guard.status
    });
    setShowAddGuard(true);
  };

  const handleDelete = async (guard: any) => {
    if (confirm(`Are you sure you want to remove ${guard.full_name}?`)) {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', guard.id);
      if (error) {
        alert('Error deleting guard: ' + error.message);
      } else {
        alert(`${guard.full_name} removed`);
        fetchSecurityData();
      }
    }
  };

  const filtered = securityData.filter(g => 
    g.full_name?.toLowerCase().includes(search.toLowerCase()) || 
    g.position?.toLowerCase().includes(search.toLowerCase()) ||
    g.deployment_site?.toLowerCase().includes(search.toLowerCase())
  );

  const isSuperAdmin = userProfile?.is_super_admin;
  const userRegion = userProfile?.regions;
  const activeGuards = securityData.filter(g => g.status === 'Active').length;

  if (loading) {
    return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-[#D4A017] border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title="Security Personnel" 
        subtitle={isSuperAdmin ? "Security personnel management" : `${userRegion?.name || ''} Region - Security`} 
        actions={
          <Button variant="secondary" onClick={() => setShowAddGuard(true)}><Shield size={16} /> Add Guard</Button>
        } 
      />

      {!isSuperAdmin && userRegion && (
        <Card className="p-3 bg-gradient-to-r from-[#081C3A]/5 to-transparent border-[#081C3A]/20">
          <p className="text-sm text-slate-600">
            Viewing security personnel in <strong className="text-[#081C3A]">{userRegion.name}</strong> region
          </p>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div><p className="text-xs text-slate-500">Total Guards</p><p className="text-2xl font-bold text-slate-800 mt-1">{securityData.length}</p><p className="text-xs text-slate-500 mt-1">{activeGuards} active</p></div>
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center"><Shield size={18} /></div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div><p className="text-xs text-slate-500">Sites</p><p className="text-2xl font-bold text-slate-800 mt-1">{new Set(securityData.map(g => g.deployment_site).filter(Boolean)).size}</p><p className="text-xs text-slate-500 mt-1">Active locations</p></div>
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center"><MapPin size={18} /></div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div><p className="text-xs text-slate-500">Uniforms</p><p className="text-2xl font-bold text-slate-800 mt-1">{securityData.length}</p><p className="text-xs text-slate-500 mt-1">Full kit issued</p></div>
            <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center"><Shield size={18} /></div>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search guards..." className="w-full pl-10 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#081C3A]" />
        </div>
      </Card>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <THead>
              <TR hover={false}> 
                <img> </img>
                <TH>Guard</TH>
                <TH>ID</TH>
                <TH className="hidden md:table-cell">Site</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {filtered.slice(0, 50).map((emp) => (
                <TR key={emp.id}>
                  <TD>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#081C3A] text-white flex items-center justify-center"><Shield size={14} /></div>
                      <div><p className="text-sm font-medium">{emp.full_name}</p><p className="text-xs text-slate-500">{emp.position}</p></div>
                    </div>
                  </TD>
                  <TD className="font-mono text-xs">{emp.employee_number}</TD>
                  <TD className="hidden md:table-cell text-xs">{emp.deployment_site || '-'}</TD>
                  <TD><Badge color={emp.status === 'Active' ? 'green' : 'yellow'}>{emp.status}</Badge></TD>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => handleEdit(emp)} className="w-8 h-8 rounded-lg hover:bg-slate-100 text-amber-600"><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(emp)} className="w-8 h-8 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </TR>
              ))}
            </TBody>
          </table>
        </div>
      </div>

      <Modal open={showAddGuard} onClose={() => { setShowAddGuard(false); setEditingGuard(null); }} title={editingGuard ? 'Edit Guard' : 'Add Guard'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name *</label><input type="text" value={guardForm.full_name} onChange={(e) => setGuardForm({...guardForm, full_name: e.target.value})} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Employee Number</label><input type="text" value={guardForm.employee_number} onChange={(e) => setGuardForm({...guardForm, employee_number: e.target.value})} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Position</label><select value={guardForm.position} onChange={(e) => setGuardForm({...guardForm, position: e.target.value})} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg">{positionList.map(p => <option key={p}>{p}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label><input type="text" value={guardForm.phone} onChange={(e) => setGuardForm({...guardForm, phone: e.target.value})} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Site</label><input type="text" value={guardForm.deployment_site} onChange={(e) => setGuardForm({...guardForm, deployment_site: e.target.value})} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label><select value={guardForm.status} onChange={(e) => setGuardForm({...guardForm, status: e.target.value})} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg">{statusList.map(s => <option key={s}>{s}</option>)}</select></div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => { setShowAddGuard(false); setEditingGuard(null); }}>Cancel</Button>
          <Button variant="secondary" onClick={handleAddGuard}><Shield size={14} className="mr-1" /> {editingGuard ? 'Update' : 'Add'}</Button>
        </div>
      </Modal>
    </div>
  );
}

/* ----------------- FUTURE FEATURES ----------------- */
export function FeaturesPage() {
  const features = [{ title: 'project i', desc: 'project description', icon: Map, color: 'navy' }, { title: 'project ii', desc: 'description', icon: Building2, color: 'gold' }, { title: 'project iii', desc: 'project description', icon: ClipboardList, color: 'red' }, { title: 'project ii', desc: 'description', icon: Car, color: 'blue' }, { title: 'Project ##', desc: 'description', icon: Bot, color: 'purple' }, { title: 'project iv', desc: 'description', icon: Camera, color: 'emerald' }];
  const colorMap: Record<string, string> = { navy: 'from-[#081C3A] to-[#1a2f5c]', gold: 'from-[#8B6F0F] to-[#D4A017]', red: 'from-[#7F1D1D] to-[#EF4444]', blue: 'from-[#1E40AF] to-[#3B82F6]', purple: 'from-[#5B21B6] to-[#8B5CF6]', emerald: 'from-[#065F46] to-[#10B981]' };
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Future Features Roadmap" subtitle="Upcoming enhancements" />
      <Card className="p-6 bg-gradient-to-br from-[#081C3A] to-[#1a2f5c] text-white border-0"><div className="flex items-start gap-4"><div className="w-14 h-14 rounded-2xl bg-[#D4A017] flex items-center justify-center"><Sparkles size={28} className="text-[#081C3A]" /></div><div><h2 className="text-2xl font-bold mb-2">Scaling to 1,000+ Employees</h2><p className="text-white/80">Enterprise-ready architecture for future growth</p></div></div></Card>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">{features.map((f, i) => { const Icon = f.icon; return (<Card key={i} className="overflow-hidden"><div className={`h-2 bg-gradient-to-r ${colorMap[f.color]}`} /><div className="p-6"><div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorMap[f.color]} flex items-center justify-center text-white mb-4`}><Icon size={22} /></div><h3 className="text-lg font-bold text-slate-800 mb-2">{f.title}</h3><p className="text-sm text-slate-600 mb-3">{f.desc}</p><Badge color="gold">Coming Soon</Badge></div></Card>); })}</div>
    </div>
  );
}

export default SettingsPage;