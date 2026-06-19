import { useState, useEffect } from "react";
import { Toaster } from "sonner";
import { LoginPage } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { EmployeesPage } from "./pages/Employees";
import { RecruitmentPage } from "./pages/Recruitment";
import { AttendancePage } from "./pages/Attendance";
import { PayrollPage } from "./pages/Payroll";
import { PayslipsPage } from "./pages/Payslips";
import { PaymentsPage } from "./pages/Payments";
import { ReportsPage } from "./pages/Reports";
import { SecurityPage } from "./pages/Security";
import { SettingsPage, FeaturesPage } from "./pages/Misc";
import { Sidebar, TopBar, BottomNav, NavKey } from "./components/Sidebar";
import { supabase } from "./lib/supabase";
import { AuditLogsPage } from "./pages/AuditLogs";
import { TerminalDuesPage } from './pages/TerminalDues';

// ===== NEW IMPORTS =====
import { ErrorBoundary } from "./components/ErrorBoundary";
import { startMonitoring } from "./utils/alerts";
import { logger } from "./utils/logger";

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [nav, setNav] = useState<NavKey>("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userRoleLevel, setUserRoleLevel] = useState<number>(4);

  // ===== NEW: Start monitoring on app load =====
  useEffect(() => {
    // Start monitoring for errors and alerts
    startMonitoring();
    logger.info('Application started', { version: '2.0.0' });
  }, []);

  // Check if user is logged in and get their role
  useEffect(() => {
    const checkSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setLoggedIn(!!session);

        if (session?.user) {
          // Fetch user role from profiles table
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
            console.log("User role level in App:", data?.role_level);
            logger.info('User logged in', { userId: session.user.id, role: data?.role_level });
          }
        }
      } catch (error) {
        logger.error('Session check failed', error);
      }
      setLoading(false);
    };

    checkSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setLoggedIn(!!session);
      if (session?.user) {
        const { data } = await supabase
          .from("profiles")
          .select("role_level")
          .eq("id", session.user.id)
          .single();
        setUserRoleLevel(data?.role_level || 4);
        logger.info('Auth state changed', { event: _event, userId: session.user.id });
      } else {
        setUserRoleLevel(4);
        logger.info('User logged out');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#081C3A] to-[#1a2f5c] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#D4A017] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/80">Loading secure portal...</p>
        </div>
      </div>
    );
  }

  if (!loggedIn) {
    return <LoginPage onLogin={() => setLoggedIn(true)} />;
  }

  // Define which pages each role can access
  const rolePages: Record<number, NavKey[]> = {
    1: [
      "dashboard",
      "employees",
      "recruitment",
      "attendance",
      "payroll",
      "payslips",
      "payments",
      "terminal-dues",
      "reports",
      "settings",
      "security",
      "features",
      "auditlogs",
    ],
    2: [
      "dashboard",
      "employees",
      "recruitment",
      "attendance",
      "payments",
      "terminal-dues",
      "reports",
      "security",
    ],
    3: ["dashboard", "attendance", "security"],
    4: ["dashboard", "payslips"],
  };

  const allowedPages = rolePages[userRoleLevel] || rolePages[4];

  // If current page is not allowed, redirect to dashboard
  if (!allowedPages.includes(nav)) {
    // Don't redirect immediately, let the effect handle it
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

    switch (nav) {
      case "dashboard":
        return <Dashboard />;
      case "employees":
        return <EmployeesPage />;
      case "recruitment":
        return <RecruitmentPage />;
      case "payments":
        return <PaymentsPage />;
      case "terminal-dues":
        return <TerminalDuesPage />;
      case "attendance":
        return <AttendancePage />;
      case "payroll":
        return <PayrollPage />;
      case "payslips":
        return <PayslipsPage />;
      case "reports":
        return <ReportsPage />;
      case "settings":
        return <SettingsPage />;
      case "security":
        return <SecurityPage />;
      case "features":
        return <FeaturesPage />;
      case "auditlogs":
        return <AuditLogsPage />;
      default:
        return <Dashboard />;
    }
  };

  // ===== WRAP EVERYTHING WITH ERROR BOUNDARY =====
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
          <main className="flex-1 overflow-auto p-4 md:p-6">{renderPage()}</main>
          <BottomNav active={nav} onNavigate={setNav} />
        </div>
        <Toaster position="top-right" richColors />
      </div>
    </ErrorBoundary>
  );
}