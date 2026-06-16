export type UserRole = 'admin' | 'hr_manager' | 'accounts_officer' | 'supervisor' | 'staff';

// Define what each role can access
export const rolePermissions = {
  admin: {
    pages: ['dashboard', 'employees', 'recruitment', 'attendance', 'payroll', 'payslips', 'reports', 'settings', 'security', 'features'],
    canEdit: true,
    canDelete: true,
    canExport: true,
    canProcessPayroll: true,
    label: 'Administrator',
    color: 'purple'
  },
  hr_manager: {
    pages: ['dashboard', 'employees', 'recruitment', 'attendance', 'reports', 'security'],
    canEdit: true,
    canDelete: false,
    canExport: true,
    canProcessPayroll: false,
    label: 'HR Manager',
    color: 'blue'
  },
  accounts_officer: {
    pages: ['dashboard', 'payroll', 'payslips', 'reports'],
    canEdit: false,
    canDelete: false,
    canExport: true,
    canProcessPayroll: true,
    label: 'Accounts Officer',
    color: 'gold'
  },
  supervisor: {
    pages: ['dashboard', 'attendance', 'security'],
    canEdit: true,
    canDelete: false,
    canExport: false,
    canProcessPayroll: false,
    label: 'Supervisor',
    color: 'green'
  },
  staff: {
    pages: ['dashboard', 'payslips'],
    canEdit: false,
    canDelete: false,
    canExport: false,
    canProcessPayroll: false,
    label: 'Staff',
    color: 'gray'
  }
};

export const hasPermission = (role: UserRole, permission: keyof typeof rolePermissions.admin) => {
  return rolePermissions[role]?.[permission] || false;
};

export const canViewPage = (role: UserRole, page: string) => {
  return rolePermissions[role]?.pages.includes(page) || false;
};

export const getUserRoleLabel = (role: UserRole) => {
  return rolePermissions[role]?.label || 'Staff';
};

export const getUserRoleColor = (role: UserRole) => {
  return rolePermissions[role]?.color || 'gray';
};