import { useState, useEffect, lazy, Suspense } from "react";
import { Toaster } from "sonner";
import { LoginPage } from "./pages/Login";
import { Sidebar, TopBar, BottomNav, NavKey } from "./components/Sidebar";
import { supabase } from "./lib/supabase";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { startMonitoring } from "./utils/alerts";
import { logger } from "./utils/logger";
import { PageLoader } from "./components/PageLoader";
import { measurePerformance } from "./utils/performance";

// ===== LAZY LOAD PAGES =====
const Dashboard = lazy(() => import("./pages/Dashboard"));
const EmployeesPage = lazy(() => import("./pages/Employees"));
const RecruitmentPage = lazy(() => import("./pages/Recruitment"));
const AttendancePage = lazy(() => import("./pages/Attendance"));
const PayrollPage = lazy(() => import("./pages/Payroll"));
const PayslipsPage = lazy(() => import("./pages/Payslips"));
const PaymentsPage = lazy(() => import("./pages/Payments"));
const ReportsPage = lazy(() => import("./pages/Reports"));
const SecurityPage = lazy(() => import("./pages/Security"));
const SettingsPage = lazy(() => import("./pages/Misc"));
const AuditLogsPage = lazy(() => import("./pages/AuditLogs"));
const TerminalDuesPage = lazy(() => import("./pages/TerminalDues"));

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [nav, setNav] = useState<NavKey>("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userRoleLevel, setUserRoleLevel] = useState<number>(4);

  useEffect(() => {
    const perf = measurePerformance('App Initial Load');
    startMonitoring();
    if (process.env.NODE_ENV === 'production') {
      logger.info('Application started', { version: '2.0.0' });
    }
    perf.end();
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      const perf = measurePerformance('Session Check');
      try {
        // ===== FIX: Add timeout to prevent infinite loading =====
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session check timeout')), 5000)
        );
        
        const sessionPromise = supabase.auth.getSession();
        const result = await Promise.race([sessionPromise, timeoutPromise]) as any;
        
        const { data: { session } } = result;
        setLoggedIn(!!session);

        if (session?.user) {
          const { data, error } = await supabase
            .from("profiles")
            .select("role_level")
            .eq("id", session.user.id)
            .single();

          if (error) {
            console.error("Error fetching role:", error);
            setUserRoleLevel(4);
          } else {
            setUserRoleLevel(data?.role_level || 4);
            if (process.env.NODE_ENV === 'production') {
              logger.info('User logged in', { userId: session.user.id, role: data?.role_level });
            }
          }
        }
      } catch (error: any) {
        // ===== FIX: Handle timeout or other errors =====
        console.error('Session check failed:', error);
        if (error.message === 'Session check timeout') {
          console.warn('Session check timed out, redirecting to login...');
        }
        // If session check fails, show login page
        setLoggedIn(false);
      } finally {
        setLoading(false);
        perf.end();
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setLoggedIn(!!session);
      if (session?.user) {
        const { data } = await supabase
          .from("profiles")
          .select("role_level")
          .eq("id", session.user.id)
          .single();
        setUserRoleLevel(data?.role_level || 4);
      } else {
        setUserRoleLevel(4);
      }
      // ===== FIX: Ensure loading is false when auth state changes =====
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ===== FIX: Add a fallback timeout to force loading to complete =====
  useEffect(() => {
    const forceLoadingTimeout = setTimeout(() => {
      if (loading) {
        console.warn('Loading forced to complete after 5 seconds');
        setLoading(false);
      }
    }, 5000);

    return () => clearTimeout(forceLoadingTimeout);
  }, [loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#081C3A] to-[#1a2f5c] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#D4A017] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/80">Loading secure portal...</p>
        </div>
      </div>
    );
  }

  if (!loggedIn) {
    return <LoginPage onLogin={() => setLoggedIn(true)} />;
  }

  const rolePages: Record<number, NavKey[]> = {
    1: [
      "dashboard", "employees", "recruitment", "attendance",
      "payroll", "payslips", "payments", "terminal-dues",
      "reports", "settings", "security", "features", "auditlogs",
    ],
    2: [
      "dashboard", "employees", "recruitment", "attendance",
      "payments", "terminal-dues", "reports", "security",
    ],
    3: ["dashboard", "attendance", "security"],
    4: ["dashboard", "payslips"],
  };

  const allowedPages = rolePages[userRoleLevel] || rolePages[4];

  if (!allowedPages.includes(nav)) {
    setTimeout(() => setNav("dashboard"), 0);
  }

  const titles: Record<NavKey, { title: string; breadcrumb: string }> = {
    dashboard: { title: "Dashboard Overview", breadcrumb: "Dashboard" },
    employees: { title: "Employee Management", breadcrumb: "Employees" },
    recruitment: { title: "Recruitment Pipeline", breadcrumb: "Recruitment" },
    attendance: { title: "Attendance Management", breadcrumb: "Attendance" },
    payroll: { title: "Payroll Management", breadcrumb: "Payroll" },
    payslips: { title: "Payslips", breadcrumb: "Payslips" },
    payments: { title: "Payment Management", breadcrumb: "Payments" },
    "terminal-dues": { title: "Terminal Dues Calculator", breadcrumb: "Terminal Dues" },
    reports: { title: "Reports & Analytics", breadcrumb: "Reports" },
    settings: { title: "System Settings", breadcrumb: "Settings" },
    security: { title: "Security Personnel", breadcrumb: "Security" },
    features: { title: "Future Features", breadcrumb: "Roadmap" },
    auditlogs: { title: "Audit Logs", breadcrumb: "Audit Logs" },
  };

  const renderPage = () => {
    if (!allowedPages.includes(nav)) {
      return <Dashboard />;
    }

    return (
      <Suspense fallback={<PageLoader />}>
        {nav === "dashboard" && <Dashboard />}
        {nav === "employees" && <EmployeesPage />}
        {nav === "recruitment" && <RecruitmentPage />}
        {nav === "attendance" && <AttendancePage />}
        {nav === "payroll" && <PayrollPage />}
        {nav === "payslips" && <PayslipsPage />}
        {nav === "payments" && <PaymentsPage />}
        {nav === "terminal-dues" && <TerminalDuesPage />}
        {nav === "reports" && <ReportsPage />}
        {nav === "settings" && <SettingsPage />}
        {nav === "security" && <SecurityPage />}
        {nav === "features" && <SettingsPage />}
        {nav === "auditlogs" && <AuditLogsPage />}
      </Suspense>
    );
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#F8FAFC] flex">
        <Sidebar
          active={nav}
          onNavigate={(k) => {
            setNav(k);
            setMobileOpen(false);
          }}
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />
        <div className="flex-1 flex flex-col w-0">
          <TopBar
            title={titles[nav]?.title || "Dashboard"}
            breadcrumb={titles[nav]?.breadcrumb}
            onMenuClick={() => setMobileOpen(true)}
          />
          <main className="flex-1 overflow-auto p-4 md:p-6">
            {renderPage()}
          </main>
          <BottomNav active={nav} onNavigate={setNav} />
        </div>
        <Toaster position="top-right" richColors />
      </div>
    </ErrorBoundary>
  );
}