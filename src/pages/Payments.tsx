import { useState, useEffect } from 'react';
import { 
  Search, Download, DollarSign, CheckCircle, XCircle, Clock, 
  Banknote, Smartphone, CreditCard, Edit2, Save, X, Filter,
  Building2, MapPin, Wallet, RefreshCw, AlertCircle, Undo, Repeat
} from 'lucide-react';
import { Card, Button, Badge, PageHeader, THead, TBody, TR, TH, TD, Modal, Input } from '../components/ui';
import { supabase } from '../lib/supabase';
import { formatKwacha } from '../data';
import { showNotification } from '../utils/clickHandlers';

export function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRegion, setFilterRegion] = useState('all');
  const [filterCompany, setFilterCompany] = useState('');
  const [filterWorkstation, setFilterWorkstation] = useState('');
  const [filterPayPoint, setFilterPayPoint] = useState('all');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [regions, setRegions] = useState<any[]>([]);
  const [companies, setCompanies] = useState<string[]>([]);
  const [workstations, setWorkstations] = useState<string[]>([]);
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [processingBulk, setProcessingBulk] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusToChange, setStatusToChange] = useState<{ employeeId: string; currentStatus: string; newStatus: string } | null>(null);

  const statusOptions = ['all', 'pending', 'processing', 'paid', 'confirmed', 'failed'];
  const payPointOptions = ['all', 'national_bank', 'standard_bank', 'nbs_bank', 'centenary_bank', 'fdh_bank', 'first_capital_bank', 'airtel_money', 'tnm_mpamba'];

  // Status order for progression
  const statusOrder = ['pending', 'processing', 'paid', 'confirmed'];
  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    processing: 'bg-blue-100 text-blue-800 border-blue-200',
    paid: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    confirmed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    failed: 'bg-red-100 text-red-800 border-red-200',
  };

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

  // Fetch regions
  useEffect(() => {
    const fetchRegions = async () => {
      const { data } = await supabase.from('regions').select('*');
      setRegions(data || []);
    };
    fetchRegions();
  }, []);

  // Fetch payment data
  useEffect(() => {
    if (userProfile) {
      fetchPaymentData();
    }
  }, [userProfile, selectedMonth, filterStatus, filterRegion, filterCompany, filterWorkstation, filterPayPoint]);

  const fetchPaymentData = async () => {
    setLoading(true);
    try {
      let employeesQuery = supabase.from('employees').select('*');
      
      if (!userProfile?.is_super_admin && userProfile?.region_id) {
        employeesQuery = employeesQuery.eq('region_id', userProfile.region_id);
      }
      if (filterRegion !== 'all' && userProfile?.is_super_admin) {
        employeesQuery = employeesQuery.eq('region_id', filterRegion);
      }
      if (filterCompany) {
        employeesQuery = employeesQuery.ilike('company', `%${filterCompany}%`);
      }
      if (filterWorkstation) {
        employeesQuery = employeesQuery.ilike('workstation', `%${filterWorkstation}%`);
      }
      if (filterPayPoint !== 'all') {
        employeesQuery = employeesQuery.eq('pay_point', filterPayPoint);
      }
      
      const { data: employeesData, error: empError } = await employeesQuery;
      if (empError) throw empError;

      const employeesWithPay = (employeesData || []).map(emp => ({
        ...emp,
        net_pay: Math.round((emp.basic_salary || 0) * 0.65)
      }));

      setEmployees(employeesWithPay);

      const uniqueCompanies = [...new Set(employeesWithPay.map(e => e.company).filter(Boolean))];
      setCompanies(uniqueCompanies);

      const uniqueWorkstations = [...new Set(employeesWithPay.map(e => e.workstation).filter(Boolean))];
      setWorkstations(uniqueWorkstations);

      const { data: paymentData, error: payError } = await supabase
        .from('payment_status')
        .select('*')
        .eq('month', `${selectedMonth}-01`);

      if (payError && payError.code !== '42P01') {
        console.error('Payment table error:', payError);
      }

      const merged = employeesWithPay.map(emp => {
        const existing = paymentData?.find(p => p.employee_id === emp.id);
        return {
          id: existing?.id || '',
          employee_id: emp.id,
          full_name: emp.full_name,
          employee_number: emp.employee_number,
          phone: emp.phone,
          region_id: emp.region_id,
          company: emp.company,
          workstation: emp.workstation,
          pay_point: emp.pay_point,
          account_number: existing?.account_number || emp.account_number || '',
          net_pay: existing?.net_pay || emp.net_pay,
          status: existing?.status || 'pending',
          payment_date: existing?.payment_date || '',
          transaction_id: existing?.transaction_id || '',
          notes: existing?.notes || '',
        };
      });

      let filtered = merged;
      if (filterStatus !== 'all') {
        filtered = merged.filter(p => p.status === filterStatus);
      }
      if (search) {
        filtered = filtered.filter(p => 
          p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
          p.employee_number?.toLowerCase().includes(search.toLowerCase()) ||
          p.company?.toLowerCase().includes(search.toLowerCase())
        );
      }

      setPayments(filtered);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const updatePaymentStatus = async (employeeId: string, newStatus: string) => {
    try {
      const existing = payments.find(p => p.employee_id === employeeId);
      
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };
      
      if (newStatus === 'paid' && existing?.status !== 'paid') {
        updateData.payment_date = new Date().toISOString().split('T')[0];
      }
      
      if (existing?.id) {
        await supabase
          .from('payment_status')
          .update(updateData)
          .eq('id', existing.id);
      } else {
        await supabase
          .from('payment_status')
          .insert([{
            employee_id: employeeId,
            month: `${selectedMonth}-01`,
            net_pay: existing?.net_pay,
            status: newStatus,
            payment_date: newStatus === 'paid' ? new Date().toISOString().split('T')[0] : null,
          }]);
      }
      
      const statusMessages: Record<string, string> = {
        pending: 'marked as Pending',
        processing: 'moved to Processing',
        paid: 'marked as Paid',
        confirmed: 'confirmed receipt',
        failed: 'marked as Failed'
      };
      
      showNotification(`Payment ${statusMessages[newStatus] || `updated to ${newStatus}`}`, 'success');
      fetchPaymentData();
    } catch (err) {
      console.error('Error updating status:', err);
      showNotification('Failed to update status', 'error');
    }
  };

  const updatePaymentDetails = async (payment: any) => {
    try {
      const existing = payments.find(p => p.employee_id === payment.employee_id);
      
      const updateData = {
        account_number: payment.account_number,
        notes: payment.notes,
        transaction_id: payment.transaction_id,
        updated_at: new Date().toISOString()
      };
      
      if (existing?.id) {
        await supabase
          .from('payment_status')
          .update(updateData)
          .eq('id', existing.id);
      } else {
        await supabase
          .from('payment_status')
          .insert([{
            employee_id: payment.employee_id,
            month: `${selectedMonth}-01`,
            net_pay: payment.net_pay,
            account_number: payment.account_number,
            notes: payment.notes,
            transaction_id: payment.transaction_id,
            status: 'pending',
          }]);
      }
      
      showNotification('Payment details updated', 'success');
      setShowEditModal(false);
      setEditingPayment(null);
      fetchPaymentData();
    } catch (err) {
      console.error('Error updating:', err);
      showNotification('Failed to update payment details', 'error');
    }
  };

  const bulkUpdateStatus = async (newStatus: string) => {
    if (selectedEmployees.length === 0) {
      showNotification('Please select employees to process', 'error');
      return;
    }
    
    setProcessingBulk(true);
    let successCount = 0;
    
    for (const employeeId of selectedEmployees) {
      const payment = payments.find(p => p.employee_id === employeeId);
      try {
        const updateData: any = { status: newStatus, updated_at: new Date().toISOString() };
        if (newStatus === 'paid' && payment?.status !== 'paid') {
          updateData.payment_date = new Date().toISOString().split('T')[0];
        }
        
        if (payment?.id) {
          await supabase
            .from('payment_status')
            .update(updateData)
            .eq('id', payment.id);
        } else {
          await supabase
            .from('payment_status')
            .insert([{
              employee_id: employeeId,
              month: `${selectedMonth}-01`,
              net_pay: payment?.net_pay,
              status: newStatus,
              payment_date: newStatus === 'paid' ? new Date().toISOString().split('T')[0] : null,
            }]);
        }
        successCount++;
      } catch (err) {
        console.error('Error in bulk update:', err);
      }
    }
    
    showNotification(`Updated ${successCount} of ${selectedEmployees.length} employees`, 'success');
    setSelectedEmployees([]);
    fetchPaymentData();
    setProcessingBulk(false);
  };

  const exportPayments = () => {
    const csv = [
      ['Employee Name', 'Employee #', 'Region', 'Company', 'Workstation', 'Pay Point', 'Account Number', 'Transaction ID', 'Net Pay', 'Status', 'Payment Date', 'Notes'],
      ...payments.map(p => [
        p.full_name,
        p.employee_number,
        regions.find(r => r.id === p.region_id)?.name || '',
        p.company || '',
        p.workstation || '',
        p.pay_point || '',
        p.account_number || '',
        p.transaction_id || '',
        formatKwacha(p.net_pay),
        p.status,
        p.payment_date || '',
        p.notes || ''
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments_${selectedMonth}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Payments exported successfully', 'success');
  };

  const toggleSelectAll = () => {
    if (selectedEmployees.length === payments.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(payments.map(p => p.employee_id));
    }
  };

  const toggleSelectEmployee = (employeeId: string) => {
    if (selectedEmployees.includes(employeeId)) {
      setSelectedEmployees(selectedEmployees.filter(id => id !== employeeId));
    } else {
      setSelectedEmployees([...selectedEmployees, employeeId]);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusIcons: Record<string, string> = {
      pending: '⏰',
      processing: '⏳',
      paid: '💰',
      confirmed: '✓',
      failed: '❌'
    };
    
    const statusLabels: Record<string, string> = {
      pending: 'Pending',
      processing: 'Processing',
      paid: 'Paid',
      confirmed: 'Confirmed',
      failed: 'Failed'
    };
    
    return (
      <Badge color={
        status === 'confirmed' ? 'green' :
        status === 'paid' ? 'blue' :
        status === 'processing' ? 'gold' :
        status === 'pending' ? 'yellow' : 'red'
      }>
        {statusIcons[status]} {statusLabels[status]}
      </Badge>
    );
  };

  const getPaymentMethodIcon = (method: string) => {
    if (!method) return <Wallet size={14} className="text-gray-400" />;
    if (method.includes('bank')) return <Banknote size={14} className="text-blue-500" />;
    if (method.includes('money')) return <Smartphone size={14} className="text-green-500" />;
    return <CreditCard size={14} className="text-purple-500" />;
  };

  const canGoBack = (currentStatus: string) => {
    const currentIndex = statusOrder.indexOf(currentStatus);
    return currentIndex > 0;
  };

  const canGoForward = (currentStatus: string) => {
    const currentIndex = statusOrder.indexOf(currentStatus);
    return currentIndex < statusOrder.length - 1 && currentStatus !== 'failed';
  };

  const stats = {
    total: payments.length,
    pending: payments.filter(p => p.status === 'pending').length,
    processing: payments.filter(p => p.status === 'processing').length,
    paid: payments.filter(p => p.status === 'paid').length,
    confirmed: payments.filter(p => p.status === 'confirmed').length,
    failed: payments.filter(p => p.status === 'failed').length,
    totalAmount: payments.reduce((sum, p) => sum + p.net_pay, 0)
  };

  const isSuperAdmin = userProfile?.is_super_admin;
  const userRegion = userProfile?.regions;

  if (loading) {
    return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-[#D4A017] border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader 
        title="Payment Management" 
        subtitle={isSuperAdmin ? "Process and track employee payments" : `${userRegion?.name || ''} Region - Payment Management`}
        actions={
          <div className="flex gap-2">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
            <Button variant="secondary" onClick={exportPayments}>
              <Download size={16} className="mr-1" /> Export
            </Button>
          </div>
        }
      />

      {!isSuperAdmin && userRegion && (
        <Card className="p-3 bg-gradient-to-r from-[#081C3A]/5 to-transparent border-[#081C3A]/20">
          <p className="text-sm text-slate-600">
            Managing payments for <strong className="text-[#081C3A]">{userRegion.name}</strong> region
          </p>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
        <Card className="p-3 text-center">
          <p className="text-xs text-slate-500">Total</p>
          <p className="text-xl font-bold text-slate-800">{stats.total}</p>
          <p className="text-[10px] text-slate-400">{formatKwacha(stats.totalAmount)}</p>
        </Card>
        <Card className="p-3 text-center bg-yellow-50">
          <p className="text-xs text-yellow-600">Pending</p>
          <p className="text-xl font-bold text-yellow-700">{stats.pending}</p>
        </Card>
        <Card className="p-3 text-center bg-blue-50">
          <p className="text-xs text-blue-600">Processing</p>
          <p className="text-xl font-bold text-blue-700">{stats.processing}</p>
        </Card>
        <Card className="p-3 text-center bg-indigo-50">
          <p className="text-xs text-indigo-600">Paid</p>
          <p className="text-xl font-bold text-indigo-700">{stats.paid}</p>
        </Card>
        <Card className="p-3 text-center bg-emerald-50">
          <p className="text-xs text-emerald-600">Confirmed</p>
          <p className="text-xl font-bold text-emerald-700">{stats.confirmed}</p>
        </Card>
        <Card className="p-3 text-center bg-red-50">
          <p className="text-xs text-red-600">Failed</p>
          <p className="text-xl font-bold text-red-700">{stats.failed}</p>
        </Card>
        <Card className="p-3 text-center bg-[#FFF1CC]">
          <p className="text-xs text-[#D4A017]">Total Amount</p>
          <p className="text-sm font-bold text-[#D4A017]">{formatKwacha(stats.totalAmount)}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          <div className="relative md:col-span-2">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, employee #..."
              className="w-full pl-10 pr-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
          >
            {statusOptions.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
          </select>
          <select
            value={filterPayPoint}
            onChange={e => setFilterPayPoint(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
          >
            {payPointOptions.map(p => <option key={p} value={p}>{p === 'all' ? 'All Pay Points' : p.replace('_', ' ').toUpperCase()}</option>)}
          </select>
          {isSuperAdmin && (
            <select
              value={filterRegion}
              onChange={e => setFilterRegion(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
            >
              <option value="all">All Regions</option>
              {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          )}
          <input
            type="text"
            value={filterCompany}
            onChange={e => setFilterCompany(e.target.value.toUpperCase())}
            placeholder="Company..."
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
          />
          <input
            type="text"
            value={filterWorkstation}
            onChange={e => setFilterWorkstation(e.target.value.toUpperCase())}
            placeholder="Workstation..."
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg"
          />
          <Button variant="outline" onClick={() => {
            setFilterCompany('');
            setFilterWorkstation('');
            setFilterStatus('all');
            setFilterPayPoint('all');
            if (isSuperAdmin) setFilterRegion('all');
            setSearch('');
          }} className="text-sm">
            <RefreshCw size={14} className="mr-1" /> Clear
          </Button>
        </div>
      </Card>

      {/* Bulk Actions */}
      {selectedEmployees.length > 0 && (
        <Card className="p-3 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm font-medium text-blue-700">
              {selectedEmployees.length} employee(s) selected
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setSelectedEmployees([])}>
                Clear
              </Button>
              <Button size="sm" onClick={() => bulkUpdateStatus('processing')} disabled={processingBulk}>
                <Clock size={14} className="mr-1" /> Mark Processing
              </Button>
              <Button size="sm" variant="secondary" onClick={() => bulkUpdateStatus('paid')} disabled={processingBulk}>
                <DollarSign size={14} className="mr-1" /> Mark Paid
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Payments Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <THead>
              <TR hover={false}>
                <TH className="w-8">
                  <input
                    type="checkbox"
                    checked={selectedEmployees.length === payments.length && payments.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300"
                  />
                </TH>
                <TH>Employee</TH>
                <TH className="hidden lg:table-cell">Company</TH>
                <TH className="hidden xl:table-cell">Workstation</TH>
                <TH>Pay Point</TH>
                <TH className="text-right">Net Pay</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {payments.map((p) => (
                <TR key={p.employee_id} className="hover:bg-slate-50">
                  <TD className="w-8">
                    <input
                      type="checkbox"
                      checked={selectedEmployees.includes(p.employee_id)}
                      onChange={() => toggleSelectEmployee(p.employee_id)}
                      className="w-4 h-4 rounded border-slate-300"
                    />
                  </TD>
                  <TD>
                    <div>
                      <p className="font-medium text-slate-800">{p.full_name}</p>
                      <p className="text-xs text-slate-500">{p.employee_number}</p>
                      <p className="text-xs text-slate-400">{p.phone}</p>
                    </div>
                  </TD>
                  <TD className="hidden lg:table-cell">
                    <span className="text-xs">{p.company || '-'}</span>
                  </TD>
                  <TD className="hidden xl:table-cell">
                    <span className="text-xs">{p.workstation || '-'}</span>
                  </TD>
                  <TD>
                    <div className="flex items-center gap-1">
                      {getPaymentMethodIcon(p.pay_point)}
                      <span className="text-xs capitalize">
                        {p.pay_point?.replace('_', ' ') || '-'}
                      </span>
                    </div>
                  </TD>
                  <TD className="text-right font-semibold text-[#D4A017]">
                    {formatKwacha(p.net_pay)}
                  </TD>
                  <TD>{getStatusBadge(p.status)}</TD>
                  <TD className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* Edit button - always visible */}
                      <button
                        onClick={() => {
                          setEditingPayment(p);
                          setShowEditModal(true);
                        }}
                        className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-600"
                        title="Edit Details"
                      >
                        <Edit2 size={14} />
                      </button>
                      
                      {/* Status change buttons */}
                      {p.status === 'pending' && (
                        <button
                          onClick={() => updatePaymentStatus(p.employee_id, 'processing')}
                          className="w-7 h-7 rounded-lg hover:bg-blue-100 text-blue-600"
                          title="Move to Processing"
                        >
                          <Clock size={14} />
                        </button>
                      )}
                      
                      {p.status === 'processing' && (
                        <>
                          <button
                            onClick={() => updatePaymentStatus(p.employee_id, 'pending')}
                            className="w-7 h-7 rounded-lg hover:bg-yellow-100 text-yellow-600"
                            title="Move back to Pending"
                          >
                            <Undo size={14} />
                          </button>
                          <button
                            onClick={() => updatePaymentStatus(p.employee_id, 'paid')}
                            className="w-7 h-7 rounded-lg hover:bg-emerald-100 text-emerald-600"
                            title="Mark as Paid"
                          >
                            <DollarSign size={14} />
                          </button>
                        </>
                      )}
                      
                      {p.status === 'paid' && (
                        <>
                          <button
                            onClick={() => updatePaymentStatus(p.employee_id, 'processing')}
                            className="w-7 h-7 rounded-lg hover:bg-blue-100 text-blue-600"
                            title="Move back to Processing"
                          >
                            <Undo size={14} />
                          </button>
                          <button
                            onClick={() => updatePaymentStatus(p.employee_id, 'confirmed')}
                            className="w-7 h-7 rounded-lg hover:bg-green-100 text-green-600"
                            title="Confirm Receipt"
                          >
                            <CheckCircle size={14} />
                          </button>
                        </>
                      )}
                      
                      {p.status === 'confirmed' && (
                        <>
                          <button
                            onClick={() => updatePaymentStatus(p.employee_id, 'paid')}
                            className="w-7 h-7 rounded-lg hover:bg-indigo-100 text-indigo-600"
                            title="Move back to Paid"
                          >
                            <Undo size={14} />
                          </button>
                          <button
                            onClick={() => updatePaymentStatus(p.employee_id, 'failed')}
                            className="w-7 h-7 rounded-lg hover:bg-red-100 text-red-600"
                            title="Mark as Failed"
                          >
                            <XCircle size={14} />
                          </button>
                        </>
                      )}
                      
                      {/* Failed status - can reset */}
                      {p.status === 'failed' && (
                        <button
                          onClick={() => updatePaymentStatus(p.employee_id, 'pending')}
                          className="w-7 h-7 rounded-lg hover:bg-yellow-100 text-yellow-600"
                          title="Reset to Pending"
                        >
                          <Repeat size={14} />
                        </button>
                      )}
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </table>
        </div>
        {payments.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <Wallet size={32} className="mx-auto mb-2 text-slate-300" />
            No payment records found
          </div>
        )}
      </div>

      {/* Edit Payment Modal */}
      <Modal open={showEditModal} onClose={() => { setShowEditModal(false); setEditingPayment(null); }} title="Edit Payment Details" size="md">
        {editingPayment && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Employee</label>
                <input
                  type="text"
                  value={editingPayment.full_name}
                  disabled
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Employee #</label>
                <input
                  type="text"
                  value={editingPayment.employee_number}
                  disabled
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Account Number</label>
              <input
                type="text"
                value={editingPayment.account_number || ''}
                onChange={(e) => setEditingPayment({...editingPayment, account_number: e.target.value})}
                placeholder="Enter bank account number or mobile money number"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Transaction ID (Optional)</label>
              <input
                type="text"
                value={editingPayment.transaction_id || ''}
                onChange={(e) => setEditingPayment({...editingPayment, transaction_id: e.target.value})}
                placeholder="Enter bank transaction reference"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea
                value={editingPayment.notes || ''}
                onChange={(e) => setEditingPayment({...editingPayment, notes: e.target.value})}
                placeholder="Add notes about this payment..."
                rows={3}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => { setShowEditModal(false); setEditingPayment(null); }}>
                Cancel
              </Button>
              <Button variant="secondary" onClick={() => updatePaymentDetails(editingPayment)}>
                <Save size={14} className="mr-1" /> Save Changes
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}