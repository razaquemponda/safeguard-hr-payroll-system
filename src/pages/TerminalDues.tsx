import { useState, useEffect } from 'react';
import { 
  Calculator, Users, Search, Download, Printer, FileText,
  Calendar, Clock, AlertCircle, CheckCircle, XCircle,
  User, Building2, Wallet, Percent, Receipt, Briefcase, Eye, Edit2, Save, X
} from 'lucide-react';
import { Card, Button, Badge, PageHeader, THead, TBody, TR, TH, TD, Modal, Input } from '../components/ui';
import { formatKwacha } from '../data';
import { supabase } from '../lib/supabase';
import { showNotification } from '../utils/clickHandlers';

interface Employee {
  id: string;
  employeeNumber: string;
  fullName: string;
  position: string;
  department: string;
  basicSalary: number;
  hire_date: string;
  region_id: string;
  phone: string;
  email: string;
  status: string;
}

interface TerminalDue {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_number: string;
  position: string;
  date_joined: string;
  date_left: string;
  reason_for_termination: string;
  period_months: number;
  basic_salary: number;
  gratuity: number;
  annual_leave: number;
  uniform_refund: number;
  other_benefits: number;
  subtotal: number;
  deductions: number;
  total_payable: number;
  status: 'pending' | 'approved' | 'paid';
  termination_type: string;
  created_at: string;
}

const terminationReasons = [
  'Habitual Absenteeism',
  'Attempted Theft',
  'Gross Misconduct',
  'Breach of Trust',
  'Insubordination',
  'Negligence of Duty',
  'Redundancy',
  'Resignation',
  'Retirement',
  'Medical Grounds',
  'End of Contract'
];

const terminationTypes = [
  { value: 'disciplinary', label: 'Disciplinary Hearing' },
  { value: 'redundancy', label: 'Redundancy / Retrenchment' },
  { value: 'resignation', label: 'Resignation' },
  { value: 'retirement', label: 'Retirement' },
  { value: 'medical', label: 'Medical Grounds' },
  { value: 'end_of_contract', label: 'End of Contract' }
];

export function TerminalDuesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [calculations, setCalculations] = useState<TerminalDue[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCalculateModal, setShowCalculateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState<TerminalDue | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCalculation, setEditingCalculation] = useState<TerminalDue | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [formData, setFormData] = useState({
    employee_id: '',
    date_left: new Date().toISOString().split('T')[0],
    reason: '',
    termination_type: 'disciplinary',
    deductions: 0,
    uniform_refund: 80000,
    other_benefits: 0
  });
  const [filterStatus, setFilterStatus] = useState('all');

  // Fetch user profile
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

  // Fetch employees and calculations
  useEffect(() => {
    if (userProfile) {
      fetchEmployees();
      fetchCalculations();
    }
  }, [userProfile]);

  const fetchEmployees = async () => {
    try {
      let query = supabase
        .from('employees')
        .select('*')
        .eq('status', 'Active');

      if (!userProfile?.is_super_admin && userProfile?.region_id) {
        query = query.eq('region_id', userProfile.region_id);
      }

      const { data, error } = await query.order('full_name');
      if (error) throw error;
      setEmployees(data || []);
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  const fetchCalculations = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('terminal_dues')
        .select('*')
        .order('created_at', { ascending: false });

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

      const { data, error } = await query;
      if (error) throw error;
      
      console.log('Fetched calculations:', data);
      setCalculations(data || []);
    } catch (err) {
      console.error('Error fetching calculations:', err);
      showNotification('Failed to load calculations', 'error');
    } finally {
      setLoading(false);
    }
  };

  const calculateTerminalDues = async () => {
  if (!selectedEmployee) {
    showNotification('Please select an employee', 'error');
    return;
  }

  const dateJoined = new Date(selectedEmployee.hire_date);
  const dateLeft = new Date(formData.date_left);
  const monthsDiff = (dateLeft.getFullYear() - dateJoined.getFullYear()) * 12 + 
                     (dateLeft.getMonth() - dateJoined.getMonth());

  const basicSalary = selectedEmployee.basicSalary || 150000;
  const gratuityRate = 0.10;
  const gratuity = (monthsDiff * basicSalary * gratuityRate) / 100;

  const annualLeaveDays = 26;
  const dailyRate = basicSalary / 26;
  const annualLeave = dailyRate * annualLeaveDays;

  const subtotal = gratuity + annualLeave + formData.uniform_refund + formData.other_benefits;
  const totalPayable = subtotal - formData.deductions;

  const calculation = {
    employee_id: selectedEmployee.id,
    employee_name: selectedEmployee.fullName,
    employee_number: selectedEmployee.employeeNumber,
    position: selectedEmployee.position,
    date_joined: selectedEmployee.hire_date,
    date_left: formData.date_left,
    reason_for_termination: formData.reason,
    period_months: monthsDiff,
    basic_salary: basicSalary,
    gratuity: gratuity,
    annual_leave: annualLeave,
    uniform_refund: formData.uniform_refund,
    other_benefits: formData.other_benefits,
    subtotal: subtotal,
    deductions: formData.deductions,
    total_payable: totalPayable,
    status: 'pending' as const,
    termination_type: formData.termination_type
  };

  console.log('Saving calculation:', calculation);

  const { data, error } = await supabase
    .from('terminal_dues')
    .insert([calculation])
    .select();

  if (error) {
    showNotification('Error saving calculation: ' + error.message, 'error');
    console.error('Error:', error);
  } else {
    console.log('Saved data:', data);
    showNotification('Terminal dues calculated successfully', 'success');
    setShowCalculateModal(false);
    await fetchCalculations();
  }
};

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from('terminal_dues')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      showNotification('Error updating status', 'error');
    } else {
      showNotification(`Status updated to ${status}`, 'success');
      fetchCalculations();
    }
  };

  const updateCalculation = async () => {
    if (!editingCalculation) return;

    const subtotal = editingCalculation.gratuity + editingCalculation.annual_leave + 
                     editingCalculation.uniform_refund + editingCalculation.other_benefits;
    const totalPayable = subtotal - editingCalculation.deductions;

    const { error } = await supabase
      .from('terminal_dues')
      .update({
        deductions: editingCalculation.deductions,
        uniform_refund: editingCalculation.uniform_refund,
        other_benefits: editingCalculation.other_benefits,
        reason_for_termination: editingCalculation.reason_for_termination,
        termination_type: editingCalculation.termination_type,
        status: editingCalculation.status,
        subtotal: subtotal,
        total_payable: totalPayable,
        updated_at: new Date().toISOString()
      })
      .eq('id', editingCalculation.id);

    if (error) {
      showNotification('Error updating: ' + error.message, 'error');
    } else {
      showNotification('Calculation updated successfully', 'success');
      setShowEditModal(false);
      setEditingCalculation(null);
      fetchCalculations();
    }
  };

  // FIX: Apply filters correctly
  const getFilteredCalculations = () => {
    let result = calculations;
    
    // Apply status filter
    if (filterStatus !== 'all') {
      result = result.filter(c => c.status === filterStatus);
    }
    
    // Apply search filter
    if (search) {
      result = result.filter(c =>
        c.employee_name?.toLowerCase().includes(search.toLowerCase()) ||
        c.employee_number?.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    return result;
  };

  const displayedCalculations = getFilteredCalculations();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'green';
      case 'paid': return 'blue';
      case 'pending': return 'yellow';
      default: return 'gray';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'disciplinary': return 'red';
      case 'redundancy': return 'orange';
      case 'resignation': return 'blue';
      case 'retirement': return 'gold';
      case 'medical': return 'purple';
      default: return 'gray';
    }
  };

  const isSuperAdmin = userProfile?.is_super_admin;
  const userRegion = userProfile?.regions;

  if (loading) {
    return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-[#D4A017] border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Terminal Dues Calculator"
        subtitle="Calculate and manage employee termination benefits"
        actions={
          <Button variant="secondary" onClick={() => setShowCalculateModal(true)}>
            <Calculator size={16} className="mr-1" /> New Calculation
          </Button>
        }
      />

      {!isSuperAdmin && userRegion && (
        <Card className="p-3 bg-gradient-to-r from-[#081C3A]/5 to-transparent border-[#081C3A]/20">
          <p className="text-sm text-slate-600">
            Managing terminal dues for <strong className="text-[#081C3A]">{userRegion.name}</strong> region
          </p>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-3 text-center">
          <p className="text-xs text-slate-500">Total Calculations</p>
          <p className="text-xl font-bold text-slate-800">{calculations.length}</p>
        </Card>
        <Card className="p-3 text-center bg-yellow-50">
          <p className="text-xs text-yellow-600">Pending</p>
          <p className="text-xl font-bold text-yellow-700">
            {calculations.filter(c => c.status === 'pending').length}
          </p>
        </Card>
        <Card className="p-3 text-center bg-emerald-50">
          <p className="text-xs text-emerald-600">Approved</p>
          <p className="text-xl font-bold text-emerald-700">
            {calculations.filter(c => c.status === 'approved').length}
          </p>
        </Card>
        <Card className="p-3 text-center bg-blue-50">
          <p className="text-xs text-blue-600">Paid</p>
          <p className="text-xl font-bold text-blue-700">
            {calculations.filter(c => c.status === 'paid').length}
          </p>
        </Card>
        <Card className="p-3 text-center bg-[#FFF1CC]">
          <p className="text-xs text-[#D4A017]">Total Payable</p>
          <p className="text-sm font-bold text-[#D4A017]">
            {formatKwacha(calculations.reduce((sum, c) => sum + (c.total_payable || 0), 0))}
          </p>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or employee #..."
              className="w-full pl-10 pr-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="paid">Paid</option>
          </select>
          <Button variant="outline" onClick={() => {
            setSearch('');
            setFilterStatus('all');
          }} className="text-sm">
            Clear Filters
          </Button>
        </div>
      </Card>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <THead>
              <TR hover={false}>
                <TH>Employee</TH>
                <TH>Position</TH>
                <TH>Date Left</TH>
                <TH className="text-right">Total Payable</TH>
                <TH>Status</TH>
                <TH>Type</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {displayedCalculations.length === 0 ? (
                <TR>
                  <TD colSpan={7} className="text-center py-8 text-slate-500">
                    <Calculator size={32} className="mx-auto mb-2 text-slate-300" />
                    {calculations.length === 0 ? 'No terminal due calculations found' : 'No matching calculations found'}
                    {calculations.length > 0 && (
                      <p className="text-xs text-slate-400 mt-1">
                        Total: {calculations.length} calculations available. Try clearing filters.
                      </p>
                    )}
                  </TD>
                </TR>
              ) : (
                displayedCalculations.map((calc) => (
                  <TR key={calc.id} className="hover:bg-slate-50">
                    <TD>
                      <div>
                        <p className="font-medium text-slate-800">{calc.employee_name}</p>
                        <p className="text-xs text-slate-500">{calc.employee_number}</p>
                      </div>
                    </TD>
                    <TD>{calc.position}</TD>
                    <TD>{new Date(calc.date_left).toLocaleDateString()}</TD>
                    <TD className="text-right font-semibold text-[#D4A017]">
                      {formatKwacha(calc.total_payable)}
                    </TD>
                    <TD>
                      <Badge color={getStatusColor(calc.status)}>
                        {calc.status.toUpperCase()}
                      </Badge>
                    </TD>
                    <TD>
                      <Badge color={getTypeColor(calc.termination_type)}>
                        {calc.termination_type?.replace('_', ' ') || 'N/A'}
                      </Badge>
                    </TD>
                    <TD className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setShowDetailModal(calc)}
                          className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-600"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => {
                            setEditingCalculation(calc);
                            setShowEditModal(true);
                          }}
                          className="w-7 h-7 rounded-lg hover:bg-slate-100 text-amber-600"
                        >
                          <Edit2 size={14} />
                        </button>
                        {calc.status === 'pending' && (
                          <>
                            <button
                              onClick={() => updateStatus(calc.id, 'approved')}
                              className="w-7 h-7 rounded-lg hover:bg-emerald-100 text-emerald-600"
                            >
                              <CheckCircle size={14} />
                            </button>
                            <button
                              onClick={() => updateStatus(calc.id, 'paid')}
                              className="w-7 h-7 rounded-lg hover:bg-blue-100 text-blue-600"
                            >
                              <Wallet size={14} />
                            </button>
                          </>
                        )}
                        {calc.status === 'approved' && (
                          <button
                            onClick={() => updateStatus(calc.id, 'paid')}
                            className="w-7 h-7 rounded-lg hover:bg-blue-100 text-blue-600"
                          >
                            <Wallet size={14} />
                          </button>
                        )}
                      </div>
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </table>
        </div>
      </div>

      {/* Calculate Modal */}
      <Modal open={showCalculateModal} onClose={() => setShowCalculateModal(false)} title="Calculate Terminal Dues" size="lg">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Select Employee</label>
            <select
              value={formData.employee_id}
              onChange={(e) => {
                const emp = employees.find(em => em.id === e.target.value);
                setSelectedEmployee(emp || null);
                setFormData({ ...formData, employee_id: e.target.value });
              }}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            >
              <option value="">-- Select Employee --</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName} - {emp.employeeNumber} ({emp.position})
                </option>
              ))}
            </select>
          </div>

          {selectedEmployee && (
            <div className="p-3 bg-slate-50 rounded-lg text-sm">
              <p><strong>Employee:</strong> {selectedEmployee.fullName}</p>
              <p><strong>Employee #:</strong> {selectedEmployee.employeeNumber}</p>
              <p><strong>Position:</strong> {selectedEmployee.position}</p>
              <p><strong>Basic Salary:</strong> {formatKwacha(selectedEmployee.basicSalary || 150000)}</p>
              <p><strong>Date Joined:</strong> {new Date(selectedEmployee.hire_date).toLocaleDateString()}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date Left</label>
              <input
                type="date"
                value={formData.date_left}
                onChange={(e) => setFormData({ ...formData, date_left: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Termination Type</label>
              <select
                value={formData.termination_type}
                onChange={(e) => setFormData({ ...formData, termination_type: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              >
                {terminationTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Reason for Termination</label>
              <select
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              >
                <option value="">-- Select Reason --</option>
                {terminationReasons.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Deductions (MK)</label>
              <input
                type="number"
                value={formData.deductions}
                onChange={(e) => setFormData({ ...formData, deductions: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Uniform Refund (MK)</label>
              <input
                type="number"
                value={formData.uniform_refund}
                onChange={(e) => setFormData({ ...formData, uniform_refund: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowCalculateModal(false)}>Cancel</Button>
            <Button variant="secondary" onClick={calculateTerminalDues}>
              <Calculator size={14} className="mr-1" /> Calculate & Save
            </Button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal open={!!showDetailModal} onClose={() => setShowDetailModal(null)} title="Terminal Dues Details" size="lg">
        {showDetailModal && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-slate-500">Employee</p><p className="font-semibold">{showDetailModal.employee_name}</p></div>
              <div><p className="text-slate-500">Employee #</p><p className="font-semibold">{showDetailModal.employee_number}</p></div>
              <div><p className="text-slate-500">Position</p><p className="font-semibold">{showDetailModal.position}</p></div>
              <div><p className="text-slate-500">Status</p><Badge color={getStatusColor(showDetailModal.status)}>{showDetailModal.status.toUpperCase()}</Badge></div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold text-slate-800 mb-3">Breakdown</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-slate-600">Gratuity ({showDetailModal.period_months} months)</span>
                  <span className="font-medium">{formatKwacha(showDetailModal.gratuity)}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-slate-600">Annual Leave</span>
                  <span className="font-medium">{formatKwacha(showDetailModal.annual_leave)}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-slate-600">Uniform Refund</span>
                  <span className="font-medium">{formatKwacha(showDetailModal.uniform_refund)}</span>
                </div>
                {showDetailModal.other_benefits > 0 && (
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-slate-600">Other Benefits</span>
                    <span className="font-medium">{formatKwacha(showDetailModal.other_benefits)}</span>
                  </div>
                )}
                <div className="flex justify-between border-b pb-2 font-semibold">
                  <span>Subtotal</span>
                  <span>{formatKwacha(showDetailModal.subtotal)}</span>
                </div>
                <div className="flex justify-between border-b pb-2 text-red-600">
                  <span>Deductions</span>
                  <span>-{formatKwacha(showDetailModal.deductions)}</span>
                </div>
                <div className="flex justify-between pt-2 font-bold text-lg text-[#D4A017]">
                  <span>Total Payable</span>
                  <span>{formatKwacha(showDetailModal.total_payable)}</span>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-xs text-slate-500">Reason: {showDetailModal.reason_for_termination}</p>
              <p className="text-xs text-slate-500">Type: {showDetailModal.termination_type?.replace('_', ' ') || 'N/A'}</p>
              <p className="text-xs text-slate-500">Date Left: {new Date(showDetailModal.date_left).toLocaleDateString()}</p>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              {showDetailModal.status === 'pending' && (
                <>
                  <Button variant="secondary" onClick={() => { updateStatus(showDetailModal.id, 'approved'); setShowDetailModal(null); }}>
                    <CheckCircle size={14} className="mr-1" /> Approve
                  </Button>
                  <Button variant="secondary" onClick={() => { updateStatus(showDetailModal.id, 'paid'); setShowDetailModal(null); }}>
                    <Wallet size={14} className="mr-1" /> Mark Paid
                  </Button>
                </>
              )}
              {showDetailModal.status === 'approved' && (
                <Button variant="secondary" onClick={() => { updateStatus(showDetailModal.id, 'paid'); setShowDetailModal(null); }}>
                  <Wallet size={14} className="mr-1" /> Mark Paid
                </Button>
              )}
              <Button variant="outline" onClick={() => setShowDetailModal(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal open={showEditModal} onClose={() => { setShowEditModal(false); setEditingCalculation(null); }} title="Edit Terminal Dues" size="lg">
        {editingCalculation && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-slate-500">Employee</p><p className="font-semibold">{editingCalculation.employee_name}</p></div>
              <div><p className="text-slate-500">Employee #</p><p className="font-semibold">{editingCalculation.employee_number}</p></div>
              <div><p className="text-slate-500">Position</p><p className="font-semibold">{editingCalculation.position}</p></div>
              <div><p className="text-slate-500">Status</p>
                <select
                  value={editingCalculation.status}
                  onChange={(e) => setEditingCalculation({ ...editingCalculation, status: e.target.value as any })}
                  className="w-full px-2 py-1 text-sm border border-slate-200 rounded-lg"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold text-slate-800 mb-3">Edit Breakdown</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Deductions (MK)</label>
                  <input
                    type="number"
                    value={editingCalculation.deductions}
                    onChange={(e) => setEditingCalculation({ ...editingCalculation, deductions: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Uniform Refund (MK)</label>
                  <input
                    type="number"
                    value={editingCalculation.uniform_refund}
                    onChange={(e) => setEditingCalculation({ ...editingCalculation, uniform_refund: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Other Benefits (MK)</label>
                  <input
                    type="number"
                    value={editingCalculation.other_benefits}
                    onChange={(e) => setEditingCalculation({ ...editingCalculation, other_benefits: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Reason for Termination</label>
                  <select
                    value={editingCalculation.reason_for_termination}
                    onChange={(e) => setEditingCalculation({ ...editingCalculation, reason_for_termination: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  >
                    {terminationReasons.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Termination Type</label>
                  <select
                    value={editingCalculation.termination_type}
                    onChange={(e) => setEditingCalculation({ ...editingCalculation, termination_type: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  >
                    {terminationTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => { setShowEditModal(false); setEditingCalculation(null); }}>Cancel</Button>
              <Button variant="secondary" onClick={updateCalculation}>
                <Save size={14} className="mr-1" /> Save Changes
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}