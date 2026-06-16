import { useState, useEffect } from 'react';
import { Users, Wallet, UserMinus, ClipboardList, CheckCircle2, TrendingUp, ArrowRight, Bell, ShieldCheck, Calendar, Shield, MapPin } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Card, StatCard, Button, Badge, Table, THead, TBody, TR, TH, TD } from '../components/ui';
import { formatKwacha } from '../data';
import { supabase } from '../lib/supabase';

const COLORS = ['#081C3A', '#D4A017', '#3B82F6', '#10B981', '#EF4444', '#8B5CF6', '#F59E0B', '#64748B', '#06B6D4'];

export function Dashboard() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [applicantsCount, setApplicantsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [userInitials, setUserInitials] = useState('');
  const [greeting, setGreeting] = useState('Good morning');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [stats, setStats] = useState({
    total: 0,
    activeGuards: 0,
    supervisorsOnDuty: 0,
    sitesCount: 0,
    expiringLicenses: 0,
    totalPayroll: 0,
    onLeave: 0,
    pendingRecruitment: 0,
    attendanceRate: 0,
    notifications: 0
  });
  const [payrollHistory, setPayrollHistory] = useState<any[]>([]);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [pieData, setPieData] = useState<any[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [growthData, setGrowthData] = useState<any[]>([]);

  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  useEffect(() => {
    const getUserInfo = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, is_super_admin, region_id, regions(*)')
          .eq('id', user.id)
          .single();
        setUserProfile(profile);
        const name = profile?.full_name || user.email?.split('@')[0] || 'User';
        setUserName(name);
        const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
        setUserInitials(initials || 'U');
      }
    };
    getUserInfo();
    setGreeting(getTimeBasedGreeting());
    
    const interval = setInterval(() => {
      setGreeting(getTimeBasedGreeting());
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (userProfile) {
      fetchDashboardData();
    }
  }, [userProfile]);

  const fetchDashboardData = async () => {
    setLoading(true);
    
    try {
      // Build employees query with region filter
      let employeesQuery = supabase.from('employees').select('*');
      
      // ✅ CRITICAL: Apply region filter for non-super admins
      if (!userProfile?.is_super_admin && userProfile?.region_id) {
        employeesQuery = employeesQuery.eq('region_id', userProfile.region_id);
      }
      
      const [employeesRes, applicantsRes] = await Promise.all([
        employeesQuery,
        supabase.from('applicants').select('id', { count: 'exact', head: false }).eq('interview_status', 'Pending')
      ]);
      
      const employeesData = employeesRes.data || [];
      setEmployees(employeesData);
      
      // Calculate stats from filtered employees
      const activeGuards = employeesData.filter((e: any) => 
        (e.position?.toLowerCase().includes('guard') || 
         e.position?.toLowerCase().includes('security') ||
         e.position?.toLowerCase().includes('officer')) && 
        e.status === 'Active'
      ).length;
      
      const supervisorsOnDuty = employeesData.filter((e: any) => 
        (e.position?.toLowerCase().includes('supervisor') || 
         e.position?.toLowerCase().includes('manager')) && 
        e.status === 'Active'
      ).length;
      
      const uniqueSites = [...new Set(employeesData.map((e: any) => e.workstation).filter(Boolean))];
      const expiringLicenses = employeesData.filter((e: any) => e.license_status === 'Expiring' || e.license_status === 'Expired').length;
      const totalPayroll = employeesData.reduce((sum: number, e: any) => sum + (e.basic_salary || 0), 0);
      const onLeave = employeesData.filter((e: any) => e.status === 'On Leave').length;
      
      // Calculate attendance rate
      let attendanceRate = 0;
      if (employeesData.length > 0) {
        const employeeIds = employeesData.map(e => e.id);
        
        let attendanceQuery = supabase
          .from('attendance')
          .select('status')
          .gte('date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
        
        if (employeeIds.length > 0) {
          attendanceQuery = attendanceQuery.in('employee_id', employeeIds);
        }
        
        const { data: attendanceRecords } = await attendanceQuery;
        
        if (attendanceRecords && attendanceRecords.length > 0) {
          let presentCount = 0;
          let totalRecords = 0;
          attendanceRecords.forEach(record => {
            if (record.status !== '-') {
              totalRecords++;
              if (record.status === 'P') presentCount++;
            }
          });
          attendanceRate = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;
        }
      }
      
      const notifications = 0;
      
      setStats({
        total: employeesData.length,
        activeGuards,
        supervisorsOnDuty,
        sitesCount: uniqueSites.length,
        expiringLicenses,
        totalPayroll,
        onLeave,
        pendingRecruitment: applicantsRes.count || 0,
        attendanceRate,
        notifications
      });
      
      // Department distribution
      const deptCount: Record<string, number> = {};
      employeesData.forEach((emp: any) => {
        if (emp.department) {
          deptCount[emp.department] = (deptCount[emp.department] || 0) + 1;
        }
      });
      setPieData(Object.entries(deptCount).map(([name, value]) => ({ name, value })));
      
      // Recent employees
      setRecent(employeesData.slice(0, 6));
      
      // Employee growth
      const growth = [];
      const years = ['2022', '2023', '2024', '2025'];
      let cumulative = 0;
      for (const year of years) {
        const count = employeesData.filter((e: any) => e.hire_date?.startsWith(year)).length;
        cumulative += count;
        growth.push({ year, employees: cumulative || (year === '2022' ? 0 : growth[growth.length-1]?.employees || 0) });
      }
      setGrowthData(growth);
      
      // Payroll history
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      setPayrollHistory(months.map((month, i) => ({
        month,
        amount: totalPayroll > 0 ? totalPayroll * (0.7 + (i * 0.06)) : 0
      })));
      
      // Attendance data
      const attendanceDataTemp = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthName = date.toLocaleString('default', { month: 'short' });
        
        const startDate = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
        const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
        
        let recordsQuery = supabase
          .from('attendance')
          .select('status')
          .gte('date', startDate)
          .lte('date', endDate);
        
        const employeeIds = employeesData.map(e => e.id);
        if (employeeIds.length > 0) {
          recordsQuery = recordsQuery.in('employee_id', employeeIds);
        }
        
        const { data: records } = await recordsQuery;
        
        let present = 0;
        let total = 0;
        records?.forEach(r => {
          if (r.status !== '-') {
            total++;
            if (r.status === 'P') present++;
          }
        });
        const rate = total > 0 ? Math.round((present / total) * 100) : 0;
        attendanceDataTemp.push({ month: monthName, rate });
      }
      setAttendanceData(attendanceDataTemp);
      
    } catch (err: any) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const pendingTasks = [
    { title: 'Approve Payroll', due: 'Today', priority: 'high', icon: Wallet },
    { title: 'Review Job Applications', due: 'Tomorrow', priority: 'medium', icon: ClipboardList },
    { title: 'Process Leave Requests', due: '2 days', priority: 'medium', icon: Calendar },
    { title: 'Renew Expiring Licenses', due: 'This Week', priority: 'high', icon: Shield }
  ];

  const isSuperAdmin = userProfile?.is_super_admin;
  const userRegion = userProfile?.regions;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#D4A017] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero greeting */}
      <Card className="p-6 bg-gradient-to-r from-[#081C3A] to-[#1a2f5c] text-white border-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-[#D4A017] text-sm font-medium mb-1">{greeting}, {userName || 'User'}</p>
            <h2 className="text-2xl md:text-3xl font-bold mb-2">Welcome to Safeguard Control Center</h2>
            <p className="text-white/70 text-sm md:text-base max-w-2xl">
              {isSuperAdmin 
                ? `Real-time overview of all ${stats.total} employees across all regions.`
                : `Real-time overview of ${stats.total} employees in ${userRegion?.name || 'your'} region.`}
              {stats.activeGuards} security personnel deployed.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" className="font-semibold"><Wallet size={16} /> Run Payroll</Button>
            <Button variant="ghost" className="bg-white/10 text-white hover:bg-white/20">View Reports</Button>
          </div>
        </div>
      </Card>

      {/* Region indicator for non-admin */}
      {!isSuperAdmin && userRegion && (
        <Card className="p-3 bg-gradient-to-r from-[#081C3A]/5 to-transparent border-[#081C3A]/20">
          <p className="text-sm text-slate-600">
            Viewing dashboard for <strong className="text-[#081C3A]">{userRegion.name}</strong> region only
          </p>
        </Card>
      )}

      {/* Main stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Employees" value={String(stats.total)} icon={Users} accent="navy" change="↑ from last month" sub={`${stats.activeGuards} Active Guards`} />
        <StatCard title="Monthly Payroll" value={stats.totalPayroll > 0 ? formatKwacha(stats.totalPayroll) : 'MK 0'} icon={Wallet} accent="gold" change="↑ from last month" sub="Period: Current Month" />
        <StatCard title="Absent Employees" value={String(stats.onLeave)} icon={UserMinus} accent="red" change="↓ from yesterday" sub="On leave today" />
        <StatCard title="Pending Recruitment" value={String(stats.pendingRecruitment)} icon={ClipboardList} accent="blue" change="3 shortlisted today" sub="5 Interviews Scheduled" />
      </div>

      {/* Security Personnel Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active Guards" value={String(stats.activeGuards)} icon={Shield} accent="green" sub="On duty now" />
        <StatCard title="Sites Covered" value={String(stats.sitesCount)} icon={MapPin} accent="navy" sub="Across region" />
        <StatCard title="Supervisors on Duty" value={String(stats.supervisorsOnDuty)} icon={ShieldCheck} accent="blue" sub="Active monitoring" />
        <StatCard title="Attendance Rate" value={`${stats.attendanceRate}%`} icon={CheckCircle2} accent="gold" sub="This month" />
      </div>

      {/* Quick status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600"><CheckCircle2 size={20} /></div>
          <div><p className="text-xs text-slate-500">Payroll Status</p><p className="font-semibold text-slate-800 text-sm">Ready</p></div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600"><TrendingUp size={20} /></div>
          <div><p className="text-xs text-slate-500">Attendance Rate</p><p className="font-semibold text-slate-800 text-sm">{stats.attendanceRate}%</p></div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#FFF1CC] flex items-center justify-center text-[#D4A017]"><ShieldCheck size={20} /></div>
          <div><p className="text-xs text-slate-500">On Duty Guards</p><p className="font-semibold text-slate-800 text-sm">{stats.activeGuards}</p></div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600"><Bell size={20} /></div>
          <div><p className="text-xs text-slate-500">System Status</p><p className="font-semibold text-slate-800 text-sm">Online</p></div>
        </Card>
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div><h3 className="font-semibold text-slate-800">Monthly Payroll Trend</h3><p className="text-xs text-slate-500">Last 6 months payroll expenditure</p></div>
            <Badge color="gold">MK Millions</Badge>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={payrollHistory.map(d => ({ ...d, amount: d.amount / 1000000 }))} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}M`} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} formatter={(v: any) => [`MK ${v}M`, 'Payroll']} />
                <Line type="monotone" dataKey="amount" stroke="#D4A017" strokeWidth={3} dot={{ fill: '#D4A017', strokeWidth: 2, r: 4, stroke: '#fff' }} activeDot={{ r: 6, fill: '#081C3A' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div><h3 className="font-semibold text-slate-800">Department Distribution</h3><p className="text-xs text-slate-500">Employees by department</p></div>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={1}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-1 mt-2">
            {pieData.slice(0, 4).map((d, i) => (
              <div key={d.name} className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i] }} />
                <span className="text-slate-600 truncate">{d.name}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div><h3 className="font-semibold text-slate-800">Attendance Trend</h3><p className="text-xs text-slate-500">Workforce attendance percentage</p></div>
            <Badge color="green">+2.0%</Badge>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} formatter={(v: any) => [`${v}%`, 'Attendance']} />
                <Bar dataKey="rate" fill="#081C3A" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div><h3 className="font-semibold text-slate-800">Employee Growth</h3><p className="text-xs text-slate-500">Year-on-year workforce expansion</p></div>
            <Badge color="navy">Scaling to 1000+</Badge>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} formatter={(v: any) => [`${v} employees`, 'Workforce']} />
                <Line type="monotone" dataKey="employees" stroke="#D4A017" strokeWidth={3} dot={{ fill: '#081C3A', strokeWidth: 2, r: 4, stroke: '#fff' }} fill="#FFF1CC" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Employees + tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <div><h3 className="font-semibold text-slate-800">Recent Hires</h3><p className="text-xs text-slate-500">Latest additions to your workforce</p></div>
            <Button variant="outline" className="text-xs py-1.5">View all <ArrowRight size={14} /></Button>
          </div>
          <Table className="border-0 rounded-none">
            <THead><TR hover={false}><TH>Name</TH><TH>Position</TH><TH>Department</TH><TH>Status</TH></TR></THead>
            <TBody>
              {recent.map((emp: any) => (
                <TR key={emp.id}>
                  <TD>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#081C3A] flex items-center justify-center text-white text-xs font-bold">
                        {emp.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{emp.full_name}</p>
                        <p className="text-xs text-slate-500">{emp.employee_number}</p>
                      </div>
                    </div>
                  </TD>
                  <TD>{emp.position}</TD>
                  <TD>{emp.department}</TD>
                  <TD><Badge color={emp.status === 'Active' ? 'green' : emp.status === 'On Leave' ? 'yellow' : 'red'}>{emp.status}</Badge></TD>
                </TR>
              ))}
              {recent.length === 0 && (
                <TR><TD colSpan={4} className="text-center py-4 text-slate-500">No recent hires</TD></TR>
              )}
            </TBody>
          </Table>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">Pending Tasks</h3><span className="text-xs text-slate-500">4 items</span>
          </div>
          <div className="p-3 space-y-2">
            {pendingTasks.map((t, i) => {
              const Icon = t.icon;
              const priorityClass = t.priority === 'high' ? 'bg-red-100 text-red-600' : t.priority === 'medium' ? 'bg-[#FFF1CC] text-[#D4A017]' : 'bg-slate-100 text-slate-600';
              return (
                <div key={i} className="p-3 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${priorityClass}`}>
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">{t.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">Due: {t.due}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}