import { useState, useEffect } from 'react';
import { Search, Calendar, CheckCircle2, XCircle, Clock, Plane, FileText, RefreshCw } from 'lucide-react';
import { Card, Button, Badge, PageHeader, THead, TBody, TR, TH, TD, Modal } from '../components/ui';
import { supabase } from '../lib/supabase';
import { getAvailableMonths, getCurrentMonth, getDateRangeFromMonth, isFutureMonth } from '../utils/dateUtils';
import { MonthSelector } from '../components/MonthSelector';
import { EmptyState } from '../components/EmptyState';
import { CopyFromPreviousModal } from '../components/CopyFromPreviousModal';

const statusColors: Record<string, string> = {
  P: 'bg-emerald-500', 
  A: 'bg-red-500', 
  L: 'bg-yellow-400', 
  LV: 'bg-blue-500', 
  SL: 'bg-purple-500', 
  '-': 'bg-slate-200'
};
const statusLabels: Record<string, string> = { 
  P: 'Present', 
  A: 'Absent', 
  L: 'Late', 
  LV: 'Leave', 
  SL: 'Sick', 
  '-': 'Off' 
};

const statusCycle = ['P', 'A', 'L', 'LV', 'SL', '-'];

interface Employee {
  id: string;
  employee_number: string;
  full_name: string;
  position: string;
  department: string;
  status: string;
  region_id?: string;
}

interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  status: string;
}

export function AttendancePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCopyModal, setShowCopyModal] = useState(false);
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
        console.log('User Profile:', profile);
        console.log('User Region ID:', profile?.region_id);
        console.log('Is Super Admin:', profile?.is_super_admin);
        setUserProfile(profile);
      }
    };
    fetchUserProfile();
  }, []);

  function getDatesForMonth(monthYear: string) {
    const { startDate, endDate, daysInMonth } = getDateRangeFromMonth(monthYear);
    const dates = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${startDate.slice(0, 8)}${String(i).padStart(2, '0')}`;
      dates.push(dateStr);
    }
    return dates;
  }

  const checkDataExists = async (month: string) => {
    const dates = getDatesForMonth(month);
    if (dates.length === 0) return false;
    
    let query = supabase
      .from('attendance')
      .select('id', { count: 'exact', head: true })
      .gte('date', dates[0])
      .lte('date', dates[dates.length - 1]);
    
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
    if (error) {
      console.error('Error checking data:', error);
      return false;
    }
    return (count || 0) > 0;
  };

  const handleMonthChange = async (newMonth: string) => {
    if (isFutureMonth(newMonth)) {
      setError('Cannot load future months. Please select a current or past month.');
      return;
    }
    setSelectedMonth(newMonth);
    setLoading(true);
    setError(null);
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
    const sourceDates = getDatesForMonth(sourceMonth);
    const targetDates = getDatesForMonth(selectedMonth);
    
    let sourceQuery = supabase
      .from('attendance')
      .select('*')
      .gte('date', sourceDates[0])
      .lte('date', sourceDates[sourceDates.length - 1]);
    
    // Apply region filter for source data
    if (!userProfile?.is_super_admin && userProfile?.region_id) {
      const { data: regionEmployees } = await supabase
        .from('employees')
        .select('id')
        .eq('region_id', userProfile.region_id);
      const employeeIds = regionEmployees?.map(e => e.id) || [];
      if (employeeIds.length > 0) {
        sourceQuery = sourceQuery.in('employee_id', employeeIds);
      }
    }
    
    const { data: sourceData, error: sourceError } = await sourceQuery;
    
    if (sourceError) {
      console.error('Error fetching source data:', sourceError);
      return;
    }
    
    if (sourceData && sourceData.length > 0) {
      const newRecords = sourceData.map(record => {
        const originalDate = new Date(record.date);
        const dayOfMonth = originalDate.getDate();
        return {
          employee_id: record.employee_id,
          date: targetDates[dayOfMonth - 1],
          status: record.status
        };
      }).filter(record => record.date);
      
      const { error: insertError } = await supabase
        .from('attendance')
        .insert(newRecords);
      
      if (insertError) {
        console.error('Error copying data:', insertError);
      } else {
        await fetchData();
        setHasData(true);
      }
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Build employees query with region filter
      let employeesQuery = supabase
        .from('employees')
        .select('id, employee_number, full_name, position, department, status, region_id');
      
      // Apply region filter for employees based on logged-in user
      if (!userProfile?.is_super_admin && userProfile?.region_id) {
        console.log('Filtering employees by region:', userProfile.region_id);
        employeesQuery = employeesQuery.eq('region_id', userProfile.region_id);
      }
      
      const { data: employeesData, error: empError } = await employeesQuery;
      if (empError) throw empError;
      
      console.log('Employees fetched:', employeesData?.length);
      setEmployees(employeesData || []);
      
      const dates = getDatesForMonth(selectedMonth);
      if (dates.length > 0 && employeesData && employeesData.length > 0) {
        const employeeIds = employeesData.map(e => e.id);
        
        let attendanceQuery = supabase
          .from('attendance')
          .select('*')
          .gte('date', dates[0])
          .lte('date', dates[dates.length - 1])
          .in('employee_id', employeeIds);
        
        const { data: attendanceData, error: attError } = await attendanceQuery;
        if (attError) throw attError;
        setAttendance(attendanceData || []);
      }
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userProfile) {
      fetchData();
    }
  }, [selectedMonth, userProfile]);

  const getAttendanceStatus = (employeeId: string, date: string): string => {
    const record = attendance.find(a => a.employee_id === employeeId && a.date === date);
    return record?.status || '-';
  };

  const updateAttendance = async (employeeId: string, date: string, currentStatus: string) => {
    // Check if user has permission for this employee
    const employee = employees.find(e => e.id === employeeId);
    if (!userProfile?.is_super_admin && employee?.region_id !== userProfile?.region_id) {
      alert('You can only edit attendance for employees in your region');
      return;
    }
    
    const currentIndex = statusCycle.indexOf(currentStatus);
    const nextIndex = (currentIndex + 1) % statusCycle.length;
    const nextStatus = statusCycle[nextIndex];
    
    try {
      const { data: existingRecord } = await supabase
        .from('attendance')
        .select('id')
        .eq('employee_id', employeeId)
        .eq('date', date)
        .maybeSingle();
      
      let result;
      if (existingRecord) {
        result = await supabase
          .from('attendance')
          .update({ status: nextStatus })
          .eq('id', existingRecord.id);
      } else {
        result = await supabase
          .from('attendance')
          .insert({ employee_id: employeeId, date, status: nextStatus });
      }
      
      if (result.error) throw result.error;
      await fetchData();
    } catch (err: any) {
      console.error('Error updating attendance:', err);
      alert('Failed to update attendance: ' + err.message);
    }
  };

  const getEmployeeStats = (employeeId: string) => {
    const employeeAttendance = attendance.filter(a => a.employee_id === employeeId);
    const counts = { P: 0, A: 0, L: 0, LV: 0, SL: 0 };
    employeeAttendance.forEach(record => {
      if (record.status && counts[record.status as keyof typeof counts] !== undefined) {
        counts[record.status as keyof typeof counts]++;
      }
    });
    const total = counts.P + counts.A + counts.L + counts.LV + counts.SL;
    return { ...counts, total };
  };

  const calculateMetrics = () => {
    let totalDays = 0;
    let presentDays = 0;
    let absentDays = 0;
    let lateDays = 0;
    let leaveDays = 0;
    attendance.forEach(record => {
      if (record.status !== '-') {
        totalDays++;
        if (record.status === 'P') presentDays++;
        if (record.status === 'A') absentDays++;
        if (record.status === 'L') lateDays++;
        if (record.status === 'LV') leaveDays++;
      }
    });
    const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;
    const absenteeism = totalDays > 0 ? (absentDays / totalDays) * 100 : 0;
    return { attendanceRate: attendanceRate.toFixed(1), absenteeism: absenteeism.toFixed(1), late: lateDays, leaveRequests: leaveDays };
  };

  const metrics = calculateMetrics();
  const dates = getDatesForMonth(selectedMonth);
  const filteredEmployees = employees.filter(e =>
    e.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.employee_number?.toLowerCase().includes(search.toLowerCase())
  );

  const exportReport = () => {
    let csv = 'Employee,Position,Department,';
    dates.forEach((_, i) => { csv += `Day ${i + 1},`; });
    csv += 'Present,Absent,Late,Leave,Sick\n';
    filteredEmployees.forEach(emp => {
      const stats = getEmployeeStats(emp.id);
      csv += `"${emp.full_name}","${emp.position}","${emp.department}",`;
      dates.forEach(date => {
        const status = getAttendanceStatus(emp.id, date);
        csv += `${status},`;
      });
      csv += `${stats.P},${stats.A},${stats.L},${stats.LV},${stats.SL}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${selectedMonth.replace(/\s/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    alert('Attendance report exported!');
  };

  const isSuperAdmin = userProfile?.is_super_admin;
  const userRegion = userProfile?.regions;

  if (loading) {
    return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-[#D4A017] border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (error) {
    return <div className="text-center py-12 text-red-500">{error}</div>;
  }

  const EmployeeModal = () => {
    if (!selectedEmployee) return null;
    const stats = getEmployeeStats(selectedEmployee.id);
    return (
      <Modal open={!!selectedEmployee} onClose={() => setSelectedEmployee(null)} title="Attendance Summary" size="md">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#081C3A] text-white text-lg font-bold flex items-center justify-center">
              {selectedEmployee.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
            </div>
            <div><h3 className="font-bold text-slate-800">{selectedEmployee.full_name}</h3><p className="text-sm text-slate-500">{selectedEmployee.position} · {selectedEmployee.employee_number}</p></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-emerald-50 rounded-lg flex justify-between items-center"><span className="text-sm">Present</span><span className="font-bold text-emerald-600">{stats.P} days</span></div>
            <div className="p-3 bg-red-50 rounded-lg flex justify-between items-center"><span className="text-sm">Absent</span><span className="font-bold text-red-600">{stats.A} days</span></div>
            <div className="p-3 bg-yellow-50 rounded-lg flex justify-between items-center"><span className="text-sm">Late</span><span className="font-bold text-yellow-600">{stats.L} days</span></div>
            <div className="p-3 bg-blue-50 rounded-lg flex justify-between items-center"><span className="text-sm">Leave</span><span className="font-bold text-blue-600">{stats.LV} days</span></div>
            <div className="p-3 bg-purple-50 rounded-lg flex justify-between items-center col-span-2"><span className="text-sm">Sick</span><span className="font-bold text-purple-600">{stats.SL} days</span></div>
          </div>
        </div>
      </Modal>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Attendance Management"
        subtitle={isSuperAdmin ? "Monthly attendance tracker for all security personnel" : `${userRegion?.name || ''} Region - Attendance Tracker`}
        actions={
          <div className="flex gap-2">
            <MonthSelector
              selectedMonth={selectedMonth}
              onMonthChange={handleMonthChange}
              availableMonths={availableMonths}
              isLoading={loading}
            />
            <Button variant="secondary" onClick={exportReport}><FileText size={16} /> Export Report</Button>
          </div>
        }
      />

      {!isSuperAdmin && userRegion && (
        <Card className="p-3 bg-gradient-to-r from-[#081C3A]/5 to-transparent border-[#081C3A]/20">
          <p className="text-sm text-slate-600">
            Viewing attendance for <strong className="text-[#081C3A]">{userRegion.name}</strong> region
          </p>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-5"><div className="flex items-center justify-between"><div><p className="text-xs text-slate-500">Attendance Rate</p><p className="text-2xl font-bold text-slate-800 mt-1">{metrics.attendanceRate}%</p><Badge color="green">↑ Excellent</Badge></div><div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center"><CheckCircle2 size={22} /></div></div></Card>
        <Card className="p-5"><div className="flex items-center justify-between"><div><p className="text-xs text-slate-500">Absenteeism</p><p className="text-2xl font-bold text-slate-800 mt-1">{metrics.absenteeism}%</p><Badge color="yellow">Manageable</Badge></div><div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center"><XCircle size={22} /></div></div></Card>
        <Card className="p-5"><div className="flex items-center justify-between"><div><p className="text-xs text-slate-500">Late Arrivals</p><p className="text-2xl font-bold text-slate-800 mt-1">{metrics.late}</p><p className="text-xs text-slate-500 mt-1">this month</p></div><div className="w-12 h-12 rounded-xl bg-[#FFF1CC] text-[#D4A017] flex items-center justify-center"><Clock size={22} /></div></div></Card>
        <Card className="p-5"><div className="flex items-center justify-between"><div><p className="text-xs text-slate-500">Leave Requests</p><p className="text-2xl font-bold text-slate-800 mt-1">{metrics.leaveRequests}</p><Badge color="blue">3 Approved</Badge></div><div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center"><Plane size={22} /></div></div></Card>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          {Object.keys(statusColors).filter(k => k !== '-').map(k => (<div key={k} className="flex items-center gap-2"><span className={`w-4 h-4 rounded ${statusColors[k]}`} /><span className="text-slate-700">{statusLabels[k]}</span></div>))}
          <div className="flex items-center gap-2"><span className="w-4 h-4 rounded bg-slate-200" /><span className="text-slate-700">Weekend / Off</span></div>
          <div className="ml-auto text-xs text-slate-400">Click on any status to change (cycles through all options)</div>
        </div>
      </Card>

      <Card className="p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employees..." className="w-full pl-10 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#081C3A]" /></div>
      </Card>

      {!hasData && dates.length > 0 ? (
        <EmptyState
          title="No Attendance Records"
          message={`No attendance data found for ${selectedMonth}. Would you like to copy from a previous month?`}
          actionLabel="Copy from Previous Month"
          onAction={() => setShowCopyModal(true)}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <THead>
                <TR hover={false}>
                  <TH className="sticky left-0 bg-[#F8FAFC] z-10">Employee</TH>
                  <TH className="hidden md:table-cell">Position</TH>
                  {dates.map((_, i) => (<TH key={i} className="text-center text-[10px]">{i + 1}</TH>))}
                  <TH className="text-center bg-emerald-50">P</TH>
                  <TH className="text-center bg-red-50">A</TH>
                  <TH className="text-center bg-yellow-50">L</TH>
                  <TH className="text-center">Total</TH>
                </TR>
              </THead>
              <TBody>
                {filteredEmployees.slice(0, 30).map(emp => {
                  const stats = getEmployeeStats(emp.id);
                  return (
                    <TR key={emp.id} onClick={() => setSelectedEmployee(emp)} className="cursor-pointer">
                      <TD className="sticky left-0 bg-white z-10">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#081C3A] text-white text-[10px] font-bold flex items-center justify-center">
                            {emp.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-800">{emp.full_name}</p>
                            <p className="text-[10px] text-slate-500">{emp.employee_number}</p>
                          </div>
                        </div>
                      </TD>
                      <TD className="hidden md:table-cell text-xs">{emp.position}</TD>
                      {dates.map((date, i) => {
                        const status = getAttendanceStatus(emp.id, date);
                        return (
                          <td key={i} className="px-1 py-3 text-center" onClick={(e) => { e.stopPropagation(); updateAttendance(emp.id, date, status); }}>
                            <div className={`w-6 h-6 mx-auto rounded text-[10px] font-semibold text-white flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity ${statusColors[status]}`}>
                              {status}
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-center font-semibold text-emerald-700 bg-emerald-50/50">{stats.P}</td>
                      <td className="px-4 py-3 text-center font-semibold text-red-700 bg-red-50/50">{stats.A}</td>
                      <td className="px-4 py-3 text-center font-semibold text-yellow-700 bg-yellow-50/50">{stats.L}</td>
                      <td className="px-4 py-3 text-center font-bold text-slate-800">{stats.total} days</td>
                    </TR>
                  );
                })}
              </TBody>
            </table>
          </div>
        </div>
      )}

      <EmployeeModal />
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