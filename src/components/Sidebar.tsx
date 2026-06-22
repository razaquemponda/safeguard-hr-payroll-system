import {
  LayoutDashboard,
  Users,
  ClipboardList,
  CalendarCheck,
  Wallet,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  Shield,
  ChevronRight,
  DollarSign,
  Calculator,
  Menu,
  X,
} from "lucide-react";
import { cn } from "../utils/cn";
import { supabase } from "../lib/supabase";
import { useEffect, useState } from "react";

export type NavKey =
  | "dashboard"
  | "employees"
  | "recruitment"
  | "attendance"
  | "payroll"
  | "payslips"
  | "payments"
  | "terminal-dues"
  | "reports"
  | "settings"
  | "security"
  | "features"
  | "auditlogs";

export const allNavItems: { id: NavKey; label: string; icon: any }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "employees", label: "Employees", icon: Users },
  { id: "terminal-dues", label: "Terminal Dues", icon: Calculator },
  { id: "recruitment", label: "Recruitment", icon: ClipboardList },
  { id: "attendance", label: "Attendance", icon: CalendarCheck },
  { id: "payroll", label: "Payroll", icon: Wallet },
  { id: "payslips", label: "Payslips", icon: FileText },
  { id: "payments", label: "Payments", icon: DollarSign },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
];

const roleMenuItems: Record<number, NavKey[]> = {
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

export function Sidebar({
  active,
  onNavigate,
  open,
  onClose,
}: {
  active: NavKey;
  onNavigate: (k: NavKey) => void;
  open: boolean;
  onClose: () => void;
}) {
  const [userRoleLevel, setUserRoleLevel] = useState<number>(4);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>("User");

  useEffect(() => {
    const getUserInfo = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data: profile, error } = await supabase
            .from("profiles")
            .select("full_name, role_level")
            .eq("id", user.id)
            .single();

          if (error) {
            console.error("Error fetching profile:", error);
            setUserName(user.email?.split("@")[0] || "User");
            setUserRoleLevel(4);
          } else {
            setUserName(
              profile?.full_name || user.email?.split("@")[0] || "User",
            );
            setUserRoleLevel(profile?.role_level || 4);
          }
        }
      } catch (err) {
        console.error("Failed to get user info:", err);
      } finally {
        setLoading(false);
      }
    };
    getUserInfo();
  }, []);

  const allowedMenuIds = roleMenuItems[userRoleLevel] || roleMenuItems[4];
  const visibleNavItems = allNavItems.filter((item) =>
    allowedMenuIds.includes(item.id),
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const getRoleDisplay = () => {
    if (userRoleLevel === 1) return "Administrator";
    if (userRoleLevel === 2) return "Manager";
    if (userRoleLevel === 3) return "Supervisor";
    return "Staff";
  };

  const NavLink = ({ item }: { item: (typeof allNavItems)[number] }) => {
    const Icon = item.icon;
    const isActive = active === item.id;
    return (
      <button
        onClick={() => {
          onNavigate(item.id);
          onClose(); // Close sidebar on navigation
        }}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
          isActive
            ? "bg-[#081C3A] text-white shadow-sm"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
        )}
      >
        <Icon size={18} className={isActive ? "text-[#D4A017]" : ""} />
        <span className="flex-1 text-left">{item.label}</span>
        {isActive && <ChevronRight size={14} />}
      </button>
    );
  };

  const content = (
    <>
      <div className="p-5 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#081C3A] flex items-center justify-center shadow-md">
            <Shield size={20} className="text-[#D4A017]" />
          </div>
          <div>
            <p className="font-bold text-slate-800 text-sm leading-tight">
              Safeguard
            </p>
            <p className="text-xs text-slate-500">HR & Payroll</p>
          </div>
        </div>
        {/* Close button for mobile */}
        <button
          onClick={onClose}
          className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-700"
          aria-label="Close menu"
        >
          <X size={24} />
        </button>
      </div>

      <div className="p-3 flex-1 overflow-y-auto space-y-1">
        <p className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Main
        </p>
        {!loading &&
          visibleNavItems.map((item) => <NavLink key={item.id} item={item} />)}
        {loading && (
          <div className="px-3 py-2 text-sm text-slate-500">Loading...</div>
        )}

        {!loading && userRoleLevel === 1 && (
          <>
            <p className="px-3 py-2 mt-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Special
            </p>
            <button
              onClick={() => {
                onNavigate("security");
                onClose();
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                active === "security"
                  ? "bg-[#081C3A] text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100",
              )}
            >
              <Shield
                size={18}
                className={active === "security" ? "text-[#D4A017]" : ""}
              />
              <span>Security Personnel</span>
            </button>
            <button
              onClick={() => {
                onNavigate("features");
                onClose();
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                active === "features"
                  ? "bg-[#081C3A] text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100",
              )}
            >
              <span className="w-[18px] h-[18px] rounded bg-[#D4A017] text-white text-[10px] flex items-center justify-center font-bold">
                ★
              </span>
              <span>Future Features</span>
            </button>
          </>
        )}
      </div>

      <div className="p-3 border-t border-slate-200">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 mb-2">
          <div className="w-9 h-9 rounded-full bg-[#D4A017] flex items-center justify-center text-white font-bold text-sm">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">
              {userName}
            </p>
            <p className="text-xs text-slate-500 truncate">
              {getRoleDisplay()}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 h-screen sticky top-0">
        {content}
      </aside>

      {/* Mobile Sidebar (Overlay + Slide) */}
      <div
        className={`lg:hidden fixed inset-0 z-50 transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Overlay */}
        <div
          className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
          onClick={onClose}
        />
        {/* Sidebar */}
        <aside
          className={`absolute left-0 top-0 bottom-0 w-72 bg-white flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {content}
        </aside>
      </div>
    </>
  );
}

export function BottomNav({
  active,
  onNavigate,
}: {
  active: NavKey;
  onNavigate: (k: NavKey) => void;
}) {
  const [userRoleLevel, setUserRoleLevel] = useState<number>(4);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUserRole = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from("profiles")
            .select("role_level")
            .eq("id", user.id)
            .single();
          setUserRoleLevel(data?.role_level || 4);
        }
      } catch (err) {
        console.error("Failed to get role:", err);
      } finally {
        setLoading(false);
      }
    };
    getUserRole();
  }, []);

  const roleBottomItems: Record<number, NavKey[]> = {
    1: ["dashboard", "employees", "payroll", "payments", "terminal-dues", "attendance", "settings"],
    2: ["dashboard", "employees", "terminal-dues", "attendance", "reports"],
    3: ["dashboard", "employees", "attendance","terminal-dues", "reports"],
    4: ["dashboard", "employees", "payments", "payslips", "reports"],
  };

  const allowedBottomMenus =
    roleBottomItems[userRoleLevel] || roleBottomItems[4];

  const allItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "employees", label: "Employees", icon: Users },
    { id: "payroll", label: "Payroll", icon: Wallet },
    { id: "payments", label: "Payments", icon: DollarSign },
    { id: "terminal-dues", label: "Terminal Dues", icon: Calculator },
    { id: "attendance", label: "Attendance", icon: CalendarCheck },
    { id: "settings", label: "Settings", icon: Settings },
    { id: "reports", label: "Reports", icon: BarChart3 },
    { id: "security", label: "Security", icon: Shield },
    { id: "payslips", label: "Payslips", icon: FileText },
  ];

  const items = allItems.filter((item) =>
    allowedBottomMenus.includes(item.id as NavKey),
  );

  if (loading) return null;

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around p-1 z-40 pb-safe">
      {items.slice(0, 5).map((item) => {
        const Icon = item.icon;
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id as NavKey)}
            className={cn(
              "flex flex-col items-center gap-0.5 p-2 rounded-lg text-[10px] font-medium transition-colors min-w-[44px] min-h-[44px]",
              isActive ? "text-[#081C3A]" : "text-slate-500",
            )}
          >
            <Icon size={18} />
            <span className="whitespace-nowrap">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function TopBar({
  onMenuClick,
  title,
  breadcrumb,
}: {
  onMenuClick: () => void;
  title: string;
  breadcrumb?: string;
}) {
  return (
    <div className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-200">
      <div className="flex items-center justify-between px-4 md:px-6 py-3">
        <div className="flex items-center gap-3">
          {/* Hamburger Menu Button - Mobile Only */}
          <button
            className="lg:hidden w-10 h-10 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors"
            onClick={onMenuClick}
            aria-label="Toggle menu"
          >
            <Menu size={24} />
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="hidden sm:inline">Safeguard</span>
              {breadcrumb && (
                <>
                  <span>/</span>
                  <span>{breadcrumb}</span>
                </>
              )}
            </div>
            <h1 className="text-base md:text-lg font-semibold text-slate-800">
              {title}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg bg-[#E6F7F0] text-[#10B981] text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
            System Online
          </div>
          <div className="w-10 h-10 rounded-full bg-[#D4A017] flex items-center justify-center text-white font-bold text-sm">
            WB
          </div>
        </div>
      </div>
    </div>
  );
}