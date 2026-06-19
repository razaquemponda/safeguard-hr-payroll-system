import { useState, useEffect } from 'react';
import { Search, Calendar, CheckCircle2, XCircle, Clock, Plane, FileText, RefreshCw, Scissors, Sparkles } from 'lucide-react';
import { Card, Button, Badge, PageHeader, THead, TBody, TR, TH, TD, Modal } from '../components/ui';
import { supabase } from '../lib/supabase';
import { getAvailableMonths, getCurrentMonth, getDateRangeFromMonth, isFutureMonth } from '../utils/dateUtils';
import { MonthSelector } from '../components/MonthSelector';
import { EmptyState } from '../components/EmptyState';
import { CopyFromPreviousModal } from '../components/CopyFromPreviousModal';
// ===== NEW: Import sanitization =====
import { sanitizeInput } from '../utils/securityHeaders';

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

// NEW: Deduction settings interface
interface DeductionSettings {
  absentDeduction: number;
  lateDeduction: number;
  lectureDeduction: number;
  lectureFullMonthDeduction: number;
  appearanceDeduction: number;
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
  
  // NEW: Deduction settings state with defaults
  const [deductionSettings, setDeductionSettings] = useState<DeductionSettings>({
    absentDeduction: 4200,
    lateDeduction: 4200,
    lectureDeduction: 3000,
    lectureFullMonthDeduction: 15000,
    appearanceDeduction: 2000
  });

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
    
    // NEW: Load deduction settings from localStorage or database
    loadDeductionSettings();
  }, []);

  // NEW: Load deduction settings
  const loadDeductionSettings = async () => {
    try {
      // Try to load from localStorage first
      const saved = localStorage.getItem('attendanceDeductionSettings');
      if (saved) {
        const parsed = JSON.parse(saved);
        setDeductionSettings(parsed);
      }
    } catch (err) {
      console.error('Error loading deduction settings:', err);
    }
  };

  // NEW: Save deduction settings
  const saveDeductionSettings = async (settings: DeductionSettings) => {
    try {
      localStorage.setItem('attendanceDeductionSettings', JSON.stringify(settings));
      setDeductionSettings(settings);
    } catch (err) {
      console.error('Error saving deduction settings:', err);
    }
  };

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
      let employeesQuery = supabase
        .from('employees')
        .select('id, employee_number, full_name, position, department, status, region_id');
      
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

  // NEW: Calculate deductions for an employee
  const calculateEmployeeDeductions = (employeeId: string) => {
    const employeeAttendance = attendance.filter(a => a.employee_id === employeeId);
    const counts = { A: 0, L: 0 };
    let lectureMissedCount = 0;
    
    employeeAttendance.forEach(record => {
      if (record.status === 'A') counts.A++;
      if (record.status === 'L') counts.L++;
    });
    
    // Count lectures missed (Wednesdays and Thursdays)
    const dates = getDatesForMonth(selectedMonth);
    dates.forEach(date => {
      const dateObj = new Date(date);
      const dayOfWeek = dateObj.getDay(); // 3 = Wednesday, 4 = Thursday
      if (dayOfWeek === 3 || dayOfWeek === 4) {
        const status = getAttendanceStatus(employeeId, date);
        if (status === 'A') {
          lectureMissedCount++;
        }
      }
    });
    
    // Calculate deductions
    const absentLateCount = counts.A + counts.L;
    const absentDeduction = counts.A * deductionSettings.absentDeduction;
    const lateDeduction = counts.L * deductionSettings.lateDeduction;
    const attendanceDeduction = absentDeduction + lateDeduction;
    
    // Lecture deductions
    let lectureDeduction = 0;
    if (lectureMissedCount > 0) {
      // Check if missed all lectures in month
      const totalLectures = dates.filter(d => {
        const dayOfWeek = new Date(d).getDay();
        return dayOfWeek === 3 || dayOfWeek === 4;
      }).length;
      
      if (lectureMissedCount === totalLectures && totalLectures > 0) {
        lectureDeduction = deductionSettings.lectureFullMonthDeduction;
      } else {
        lectureDeduction = lectureMissedCount * deductionSettings.lectureDeduction;
      }
    }
    
    // Appearance deduction (deducted monthly if employee is active)
    const appearanceDeduction = deductionSettings.appearanceDeduction;
    
    const totalDeductions = attendanceDeduction + lectureDeduction + appearanceDeduction;
    
    return {
      absentDays: counts.A,
      lateDays: counts.L,
      absentDeduction,
      lateDeduction,
      attendanceDeduction,
      lectureMissedCount,
      lectureDeduction,
      appearanceDeduction,
      totalDeductions
    };
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
  
  // ===== UPDATED: Filter employees with sanitized search =====
  const filteredEmployees = employees.filter(e => {
    const safeSearch = sanitizeInput(search).toLowerCase();
    return e.full_name?.toLowerCase().includes(safeSearch) ||
           e.employee_number?.toLowerCase().includes(safeSearch);
  });

  const exportReport = () => {
    let csv = 'Employee,Position,Department,';
    dates.forEach((_, i) => { csv += `Day ${i + 1},`; });
    csv += 'Present,Absent,Late,Leave,Sick,Absent Deduction,Late Deduction,Lecture Deduction,Appearance Deduction,Total Deductions\n';
    filteredEmployees.forEach(emp => {
      const stats = getEmployeeStats(emp.id);
      const deductions = calculateEmployeeDeductions(emp.id);
      csv += `"${emp.full_name}","${emp.position}","${emp.department}",`;
      dates.forEach(date => {
        const status = getAttendanceStatus(emp.id, date);
        csv += `${status},`;
      });
      csv += `${stats.P},${stats.A},${stats.L},${stats.LV},${stats.SL},`;
      csv += `${deductions.absentDeduction},${deductions.lateDeduction},${deductions.lectureDeduction},${deductions.appearanceDeduction},${deductions.totalDeductions}\n`;
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

  // NEW: Enhanced Employee Modal with editable deductions
  const EmployeeModal = () => {
    if (!selectedEmployee) return null;
    const stats = getEmployeeStats(selectedEmployee.id);
    const deductions = calculateEmployeeDeductions(selectedEmployee.id);
    const [editableDeductions, setEditableDeductions] = useState({
      absentDays: deductions.absentDays,
      lateDays: deductions.lateDays,
      absentDeduction: deductions.absentDeduction,
      lateDeduction: deductions.lateDeduction,
      lectureMissed: deductions.lectureMissedCount,
      lectureDeduction: deductions.lectureDeduction,
      appearanceDeduction: deductions.appearanceDeduction,
      totalDeductions: deductions.totalDeductions
    });
    const [saving, setSaving] = useState(false);
    const [savedSuccess, setSavedSuccess] = useState(false);
    
    // Update deductions when stats change
    useEffect(() => {
      const newDeductions = calculateEmployeeDeductions(selectedEmployee.id);
      setEditableDeductions({
        absentDays: newDeductions.absentDays,
        lateDays: newDeductions.lateDays,
        absentDeduction: newDeductions.absentDeduction,
        lateDeduction: newDeductions.lateDeduction,
        lectureMissed: newDeductions.lectureMissedCount,
        lectureDeduction: newDeductions.lectureDeduction,
        appearanceDeduction: newDeductions.appearanceDeduction,
        totalDeductions: newDeductions.totalDeductions
      });
      setSavedSuccess(false);
    }, [selectedEmployee, attendance]);

    const handleDeductionChange = (field: string, value: number) => {
      // ===== NEW: Sanitize deduction values =====
      const safeValue = Math.max(0, Number(value) || 0);
      setEditableDeductions(prev => {
        const updated = { ...prev, [field]: safeValue };
        // Recalculate total
        updated.totalDeductions = 
          (updated.absentDeduction || 0) + 
          (updated.lateDeduction || 0) + 
          (updated.lectureDeduction || 0) + 
          (updated.appearanceDeduction || 0);
        return updated;
      });
      setSavedSuccess(false);
    };

    // FIXED: Save deductions to database
    const saveDeductions = async () => {
      if (!selectedEmployee) return;
      
      setSaving(true);
      try {
        // Check if a deduction record already exists for this employee and month
        const { data: existingRecord, error: checkError } = await supabase
          .from('employee_deductions')
          .select('id')
          .eq('employee_id', selectedEmployee.id)
          .eq('month', selectedMonth)
          .maybeSingle();

        if (checkError) throw checkError;

        const deductionData = {
          employee_id: selectedEmployee.id,
          month: selectedMonth,
          absent_days: editableDeductions.absentDays,
          late_days: editableDeductions.lateDays,
          absent_deduction: editableDeductions.absentDeduction,
          late_deduction: editableDeductions.lateDeduction,
          lecture_missed: editableDeductions.lectureMissed,
          lecture_deduction: editableDeductions.lectureDeduction,
          appearance_deduction: editableDeductions.appearanceDeduction,
          total_deductions: editableDeductions.totalDeductions,
          updated_at: new Date().toISOString()
        };

        let result;
        if (existingRecord) {
          // Update existing record
          result = await supabase
            .from('employee_deductions')
            .update(deductionData)
            .eq('id', existingRecord.id);
        } else {
          // Insert new record
          result = await supabase
            .from('employee_deductions')
            .insert([{
              ...deductionData,
              created_at: new Date().toISOString()
            }]);
        }

        if (result.error) throw result.error;

        setSavedSuccess(true);
        alert(`Deductions saved for ${selectedEmployee.full_name}`);
        
        // Optionally refresh the page data
        await fetchData();
        
        // Close modal after 2 seconds
        setTimeout(() => {
          setSelectedEmployee(null);
        }, 2000);
      } catch (err: any) {
        console.error('Error saving deductions:', err);
        alert('Failed to save deductions: ' + err.message);
      } finally {
        setSaving(false);
      }
    };

    // Load saved deductions if they exist
    const loadSavedDeductions = async () => {
      if (!selectedEmployee) return;
      
      try {
        const { data, error } = await supabase
          .from('employee_deductions')
          .select('*')
          .eq('employee_id', selectedEmployee.id)
          .eq('month', selectedMonth)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setEditableDeductions({
            absentDays: data.absent_days || 0,
            lateDays: data.late_days || 0,
            absentDeduction: data.absent_deduction || 0,
            lateDeduction: data.late_deduction || 0,
            lectureMissed: data.lecture_missed || 0,
            lectureDeduction: data.lecture_deduction || 0,
            appearanceDeduction: data.appearance_deduction || 0,
            totalDeductions: data.total_deductions || 0
          });
          setSavedSuccess(true);
        }
      } catch (err) {
        console.error('Error loading saved deductions:', err);
      }
    };

    // Load saved deductions when modal opens
    useEffect(() => {
      if (selectedEmployee) {
        loadSavedDeductions();
      }
    }, [selectedEmployee]);

    return (
      <Modal open={!!selectedEmployee} onClose={() => setSelectedEmployee(null)} title="Attendance & Deductions Summary" size="xl">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#081C3A] text-white text-lg font-bold flex items-center justify-center">
              {selectedEmployee.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
            </div>
            <div>
              <h3 className="font-bold text-slate-800">{selectedEmployee.full_name}</h3>
              <p className="text-sm text-slate-500">{selectedEmployee.position} · {selectedEmployee.employee_number}</p>
              {savedSuccess && (
                <Badge color="green" className="mt-1">✓ Saved</Badge>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="p-3 bg-emerald-50 rounded-lg flex justify-between items-center">
              <span className="text-sm">Present</span>
              <span className="font-bold text-emerald-600">{stats.P} days</span>
            </div>
            <div className="p-3 bg-red-50 rounded-lg flex justify-between items-center">
              <span className="text-sm">Absent</span>
              <span className="font-bold text-red-600">{stats.A} days</span>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg flex justify-between items-center">
              <span className="text-sm">Late</span>
              <span className="font-bold text-yellow-600">{stats.L} days</span>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg flex justify-between items-center">
              <span className="text-sm">Leave</span>
              <span className="font-bold text-blue-600">{stats.LV} days</span>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg flex justify-between items-center">
              <span className="text-sm">Sick</span>
              <span className="font-bold text-purple-600">{stats.SL} days</span>
            </div>
          </div>

          {/* Editable Deductions Section */}
          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-slate-800">Deductions Summary</h4>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={loadSavedDeductions}
                  disabled={saving}
                  size="sm"
                >
                  <RefreshCw size={14} className="mr-1" /> Reload
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={saveDeductions}
                  disabled={saving || savedSuccess}
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </span>
                  ) : savedSuccess ? (
                    '✓ Saved'
                  ) : (
                    'Save Deductions'
                  )}
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-slate-700">Absent Days</label>
                    <input
                      type="number"
                      value={editableDeductions.absentDays}
                      onChange={(e) => handleDeductionChange('absentDays', parseInt(e.target.value) || 0)}
                      className="w-20 px-2 py-1 text-sm border border-slate-200 rounded text-right"
                      min="0"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-slate-700">Absent Deduction (MK)</label>
                    <input
                      type="number"
                      value={editableDeductions.absentDeduction}
                      onChange={(e) => handleDeductionChange('absentDeduction', parseInt(e.target.value) || 0)}
                      className="w-28 px-2 py-1 text-sm border border-slate-200 rounded text-right"
                      min="0"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-slate-700">Late Days</label>
                    <input
                      type="number"
                      value={editableDeductions.lateDays}
                      onChange={(e) => handleDeductionChange('lateDays', parseInt(e.target.value) || 0)}
                      className="w-20 px-2 py-1 text-sm border border-slate-200 rounded text-right"
                      min="0"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-slate-700">Late Deduction (MK)</label>
                    <input
                      type="number"
                      value={editableDeductions.lateDeduction}
                      onChange={(e) => handleDeductionChange('lateDeduction', parseInt(e.target.value) || 0)}
                      className="w-28 px-2 py-1 text-sm border border-slate-200 rounded text-right"
                      min="0"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-slate-700">Lectures Missed</label>
                    <input
                      type="number"
                      value={editableDeductions.lectureMissed}
                      onChange={(e) => handleDeductionChange('lectureMissed', parseInt(e.target.value) || 0)}
                      className="w-20 px-2 py-1 text-sm border border-slate-200 rounded text-right"
                      min="0"
                    />
                    <span className="text-xs text-slate-400">(Wed/Thu)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-slate-700">Lecture Deduction (MK)</label>
                    <input
                      type="number"
                      value={editableDeductions.lectureDeduction}
                      onChange={(e) => handleDeductionChange('lectureDeduction', parseInt(e.target.value) || 0)}
                      className="w-28 px-2 py-1 text-sm border border-slate-200 rounded text-right"
                      min="0"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-slate-700">Appearance/Hygiene (MK)</label>
                    <input
                      type="number"
                      value={editableDeductions.appearanceDeduction}
                      onChange={(e) => handleDeductionChange('appearanceDeduction', parseInt(e.target.value) || 0)}
                      className="w-28 px-2 py-1 text-sm border border-slate-200 rounded text-right"
                      min="0"
                    />
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                    <span className="font-semibold text-slate-800">Total Deductions</span>
                    <span className="font-bold text-red-600 text-lg">
                      MK {editableDeductions.totalDeductions.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-xs text-amber-700 flex items-center gap-2">
                <Scissors size={14} />
                <strong>Note:</strong> Appearance deduction (MK 2,000) is applied monthly for uniform cleaning, shaving, and keeping hair short and smart. 
                Lecture deductions (MK 3,000 each) apply for missed Wednesday/Thursday lectures. Full month absence from lectures incurs MK 15,000 deduction.
              </p>
            </div>
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

// Helper function for notifications (add this if not already available)
function showNotification(message: string, type: 'success' | 'error' | 'info') {
  // Simple alert for now - replace with your actual notification system
  if (type === 'success') {
    console.log('✅', message);
  } else if (type === 'error') {
    console.error('❌', message);
  } else {
    console.info('ℹ️', message);
  }
}