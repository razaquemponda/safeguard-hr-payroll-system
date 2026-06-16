// Simple notification function
export const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
  alert(message);
};

// Store employees data
let employeesCache: any[] = [];

export function setEmployeesData(employees: any[]) {
  employeesCache = employees;
}

// REAL Payroll Processing Function
export const handleProcessPayroll = (
  employees: any[], 
  setEmployees: (emps: any[]) => void, 
  setProcessingStatus?: (status: string) => void
) => {
  const processedEmployees = employees.map(emp => {
    const basicSalary = emp.basicSalary || 0;
    const allowances = emp.allowances || (basicSalary * 0.15);
    const overtime = emp.overtime || (basicSalary * 0.05);
    const bonus = emp.bonus || (basicSalary * 0.02);
    
    const grossPay = basicSalary + allowances + overtime + bonus;
    
    let paye = 0;
    if (grossPay > 100000) {
      paye = grossPay * 0.25;
    } else if (grossPay > 50000) {
      paye = grossPay * 0.15;
    } else {
      paye = grossPay * 0.10;
    }
    
    const pension = basicSalary * 0.05;
    const nhis = 5000;
    const insurance = 2000;
    const totalDeductions = paye + pension + nhis + insurance;
    const netPay = grossPay - totalDeductions;
    
    return {
      ...emp,
      basicSalary,
      allowances,
      overtime,
      bonus,
      grossPay,
      paye,
      pension,
      nhis,
      insurance,
      totalDeductions,
      netPay,
      payrollProcessed: new Date().toISOString(),
      payrollMonth: new Date().toLocaleString('default', { month: 'long', year: 'numeric' })
    };
  });
  
  setEmployees(processedEmployees);
  if (setProcessingStatus) setProcessingStatus('Completed');
  
  const totalPayroll = processedEmployees.reduce((sum, emp) => sum + emp.netPay, 0);
  const employeeCount = processedEmployees.length;
  
  const message = `✅ Payroll processed for ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}!\n\n📊 Total Employees: ${employeeCount}\n💰 Total Payroll: MK ${totalPayroll.toLocaleString()}\n📈 Average Salary: MK ${Math.round(totalPayroll / employeeCount).toLocaleString()}`;
  
  showNotification(message, 'success');
  return processedEmployees;
};

// PDF Report Generation Function
export const handleExportPDF = (reportType: string) => {
  const employees = employeesCache;
  
  if (!employees || employees.length === 0) {
    showNotification('No data available for report generation. Please refresh the page.', 'error');
    return;
  }
  
  // Dynamically import jsPDF
  import('jspdf').then(jsPDFModule => {
    const jsPDF = jsPDFModule.default;
    const pdf = new jsPDF();
    let y = 20;
    
    // Header
    pdf.setFontSize(18);
    pdf.setTextColor(8, 28, 58);
    pdf.setFont('helvetica', 'bold');
    pdf.text('SAFEGUARD SECURITY SERVICES', 105, y, { align: 'center' });
    
    y += 10;
    pdf.setFontSize(14);
    pdf.setTextColor(212, 160, 23);
    pdf.text(reportType, 105, y, { align: 'center' });
    
    y += 8;
    pdf.setFontSize(9);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`Generated: ${new Date().toLocaleString()}`, 105, y, { align: 'center' });
    
    y += 15;
    
    // Statistics
    const totalEmployees = employees.length;
    const totalPayroll = employees.reduce((sum, emp) => sum + (emp.netPay || emp.basicSalary || 0), 0);
    const averageSalary = totalPayroll / totalEmployees;
    const departments = [...new Set(employees.map(emp => emp.department))];
    const activeEmployees = employees.filter(emp => emp.status === 'Active').length;
    
    pdf.setFontSize(11);
    pdf.setTextColor(8, 28, 58);
    pdf.setFont('helvetica', 'bold');
    pdf.text('EXECUTIVE SUMMARY', 20, y);
    
    y += 8;
    pdf.setFontSize(9);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Total Employees: ${totalEmployees}`, 25, y);
    y += 6;
    pdf.text(`Active Employees: ${activeEmployees}`, 25, y);
    y += 6;
    pdf.text(`Total Departments: ${departments.length}`, 25, y);
    y += 6;
    pdf.text(`Total Payroll: MK ${Math.round(totalPayroll).toLocaleString()}`, 25, y);
    y += 6;
    pdf.text(`Average Salary: MK ${Math.round(averageSalary).toLocaleString()}`, 25, y);
    
    y += 15;
    
    // Department Breakdown
    pdf.setFontSize(11);
    pdf.setTextColor(8, 28, 58);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DEPARTMENT BREAKDOWN', 20, y);
    
    y += 8;
    pdf.setFontSize(9);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');
    
    departments.forEach(dept => {
      const deptEmployees = employees.filter(emp => emp.department === dept);
      const deptPayroll = deptEmployees.reduce((sum, emp) => sum + (emp.netPay || emp.basicSalary || 0), 0);
      pdf.text(`${dept}: ${deptEmployees.length} employees | MK ${Math.round(deptPayroll).toLocaleString()}`, 25, y);
      y += 6;
      
      if (y > 270) {
        pdf.addPage();
        y = 20;
      }
    });
    
    // Footer
    y = 270;
    pdf.setDrawColor(212, 160, 23);
    pdf.setLineWidth(0.3);
    pdf.line(20, y, 190, y);
    y += 5;
    pdf.setFontSize(7);
    pdf.setTextColor(156, 163, 175);
    pdf.text('This report is system-generated and requires no signature.', 105, y, { align: 'center' });
    
    pdf.save(`${reportType.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    
    showNotification(`📄 ${reportType} generated successfully!\n\n📊 Total Employees: ${totalEmployees}\n💰 Total Payroll: MK ${Math.round(totalPayroll).toLocaleString()}\n📁 PDF downloaded to your computer`, 'success');
  }).catch(error => {
    console.error('Failed to load jsPDF:', error);
    showNotification('PDF generation failed. Please try again.', 'error');
  });
};

// Other handlers
export const handleExportExcel = handleExportPDF;
export const handleExportCSV = handleExportPDF;
export const handleAddEmployee = (setModalOpen: (open: boolean) => void) => { setModalOpen(true); };
export const handleEditEmployee = (employee: any, setSelectedEmployee: (emp: any) => void, setModalOpen: (open: boolean) => void) => {
  setSelectedEmployee(employee);
  setModalOpen(true);
};
export const handleDeleteEmployee = (employeeId: string, employees: any[], setEmployees: (emps: any[]) => void) => {
  if (confirm('Are you sure you want to delete this employee?')) {
    const updated = employees.filter(emp => emp.id !== employeeId);
    setEmployees(updated);
    showNotification('Employee deleted successfully', 'success');
  }
};
export const handleHireEmployee = (applicant: any, employees: any[], setEmployees: (emps: any[]) => void, setApplicants: (apps: any[]) => void) => {
  const newEmployee = {
    id: Date.now(),
    employeeId: `SG-${Math.floor(Math.random() * 10000)}`,
    fullName: applicant.name || applicant.fullName,
    position: applicant.position,
    department: applicant.department || 'Security Operations',
    status: 'Active',
    basicSalary: applicant.expectedSalary || 300000,
    email: applicant.email || `${applicant.name?.toLowerCase().replace(/\s/g, '.')}@safeguard.mw`,
    phone: applicant.phone || '+265 888 XXX XXX',
    hireDate: new Date().toISOString().split('T')[0],
    guardId: `G-${Math.floor(Math.random() * 1000)}`,
    deploymentSite: 'To be assigned',
    shift: 'Rotational'
  };
  setEmployees([...employees, newEmployee]);
  setApplicants(applicants.filter(a => a.id !== applicant.id));
  showNotification(`🎉 ${applicant.name || applicant.fullName} has been hired!`, 'success');
};
export const handleDownloadPayslip = (employee: any, month: string) => {
  showNotification(`📄 Preparing payslip for ${employee.fullName} - ${month}`, 'info');
};
export const handleShortlist = (applicantId: string, applicants: any[], setApplicants: (apps: any[]) => void) => {
  const updated = applicants.map(app => app.id === applicantId ? { ...app, interviewStatus: 'Shortlisted' } : app);
  setApplicants(updated);
  showNotification('📋 Applicant shortlisted', 'success');
};
export const handleScheduleInterview = (applicantId: string, applicants: any[], setApplicants: (apps: any[]) => void) => {
  const updated = applicants.map(app => app.id === applicantId ? { ...app, interviewStatus: 'Interview Scheduled' } : app);
  setApplicants(updated);
  showNotification('📅 Interview scheduled', 'info');
};
export const handleAccept = (applicantId: string, applicants: any[], setApplicants: (apps: any[]) => void) => {
  const updated = applicants.map(app => app.id === applicantId ? { ...app, decision: 'Accepted', interviewStatus: 'Passed' } : app);
  setApplicants(updated);
  showNotification('✅ Applicant accepted', 'success');
};
export const handleReject = (applicantId: string, applicants: any[], setApplicants: (apps: any[]) => void) => {
  const updated = applicants.map(app => app.id === applicantId ? { ...app, decision: 'Rejected', interviewStatus: 'Failed' } : app);
  setApplicants(updated);
  showNotification('❌ Applicant rejected', 'error');
};