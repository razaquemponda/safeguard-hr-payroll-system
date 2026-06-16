import jsPDF from 'jspdf';

export async function generateEnhancedPayslipPDF(
  employeeName: string,
  employeeId: string,
  position: string,
  department: string,
  basicSalary: number,
  allowances: number,
  overtime: number,
  bonus: number,
  paye: number,
  pension: number,
  netPay: string,
  month: string
) {
  const pdf = new jsPDF();
  let y = 20;
  
  // Header
  pdf.setFontSize(18);
  pdf.setTextColor(8, 28, 58);
  pdf.setFont('helvetica', 'bold');
  pdf.text('SAFEGUARD SECURITY SERVICES', 105, y, { align: 'center' });
  
  y += 8;
  pdf.setFontSize(11);
  pdf.setTextColor(212, 160, 23);
  pdf.text('OFFICIAL PAYSLIP', 105, y, { align: 'center' });
  
  y += 12;
  
  // Divider line
  pdf.setDrawColor(212, 160, 23);
  pdf.setLineWidth(0.5);
  pdf.line(20, y, 190, y);
  y += 8;
  
  // Employee Details Section
  pdf.setFontSize(11);
  pdf.setTextColor(8, 28, 58);
  pdf.setFont('helvetica', 'bold');
  pdf.text('EMPLOYEE INFORMATION', 20, y);
  
  y += 8;
  pdf.setFontSize(9);
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'normal');
  
  pdf.text(`Name: ${employeeName}`, 20, y);
  pdf.text(`Employee ID: ${employeeId}`, 120, y);
  y += 6;
  
  pdf.text(`Position: ${position}`, 20, y);
  pdf.text(`Department: ${department}`, 120, y);
  y += 6;
  
  pdf.text(`Pay Period: ${month}`, 20, y);
  pdf.text(`Payment Date: ${new Date().toLocaleDateString()}`, 120, y);
  
  y += 12;
  
  pdf.setDrawColor(212, 160, 23);
  pdf.line(20, y, 190, y);
  y += 8;
  
  // Earnings Section
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(8, 28, 58);
  pdf.text('EARNINGS', 20, y);
  pdf.text('AMOUNT (MK)', 170, y, { align: 'right' });
  
  y += 6;
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  
  const grossPay = basicSalary + allowances + overtime + bonus;
  
  const earningsRows = [
    ['Basic Salary', basicSalary],
    ['Housing Allowance', Math.round(allowances * 0.4)],
    ['Transport Allowance', Math.round(allowances * 0.3)],
    ['Medical Allowance', Math.round(allowances * 0.3)],
    ['Overtime Pay', overtime],
    ['Performance Bonus', bonus]
  ];
  
  earningsRows.forEach(([label, amount]) => {
    pdf.text(label as string, 25, y);
    pdf.text(formatMoney(amount as number), 170, y, { align: 'right' });
    y += 5.5;
  });
  
  y += 2;
  pdf.setDrawColor(200, 200, 200);
  pdf.line(20, y, 190, y);
  y += 4;
  
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(8, 28, 58);
  pdf.text('TOTAL GROSS PAY', 20, y);
  pdf.text(formatMoney(grossPay), 170, y, { align: 'right' });
  
  y += 10;
  
  // Deductions Section
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(8, 28, 58);
  pdf.text('DEDUCTIONS', 20, y);
  pdf.text('AMOUNT (MK)', 170, y, { align: 'right' });
  
  y += 6;
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  
  const totalDeductions = paye + pension + 5000 + 2000;
  
  const deductionsRows = [
    ['PAYE Tax (30%)', paye],
    ['Pension Contribution (5%)', pension],
    ['NHIS Contribution', 5000],
    ['Group Life Insurance', 2000]
  ];
  
  deductionsRows.forEach(([label, amount]) => {
    pdf.text(label as string, 25, y);
    pdf.text(`-${formatMoney(amount as number)}`, 170, y, { align: 'right' });
    y += 5.5;
  });
  
  y += 2;
  pdf.setDrawColor(200, 200, 200);
  pdf.line(20, y, 190, y);
  y += 4;
  
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(220, 38, 38);
  pdf.text('TOTAL DEDUCTIONS', 20, y);
  pdf.text(`-${formatMoney(totalDeductions)}`, 170, y, { align: 'right' });
  
  y += 18; // Increased spacing before Net Payable
  
  // === FIXED NET PAYABLE SECTION - No overlapping ===
  // Gold background box
  pdf.setFillColor(212, 160, 23);
  pdf.rect(20, y, 170, 16, 'F'); // Taller box (16 instead of 14)
  
  // Net Pay label - moved higher
  pdf.setTextColor(8, 28, 58);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('NET PAYABLE', 105, y + 6, { align: 'center' });
  
  // Net Pay amount - moved lower with more space
  pdf.setFontSize(16);
  pdf.text(netPay, 105, y + 14, { align: 'center' });
  
  y += 24; // More space after Net Payable
  
  // Footer
  const verificationCode = `SG-${employeeId}-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.floor(Math.random() * 10000)}`;
  
  pdf.setDrawColor(212, 160, 23);
  pdf.setLineWidth(0.3);
  pdf.line(20, y, 190, y);
  y += 5;
  
  pdf.setFontSize(8);
  pdf.setTextColor(100, 116, 139);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Verification Code: ${verificationCode}`, 105, y, { align: 'center' });
  
  y += 5;
  pdf.text('This is a computer-generated payslip. No signature required.', 105, y, { align: 'center' });
  
  y += 4;
  pdf.text(`Generated: ${new Date().toLocaleString()}`, 105, y, { align: 'center' });
  
  pdf.save(`Safeguard_Payslip_${employeeName.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  
  return true;
}

function formatMoney(amount: number): string {
  return amount.toLocaleString('en-MW');
}

export async function generatePayslipPDF(employeeName: string, employeeId: string, amount: string) {
  return generateEnhancedPayslipPDF(
    employeeName, employeeId, 'Security Guard', 'Operations',
    300000, 50000, 20000, 0,
    90000, 15000, amount, new Date().toLocaleString('default', { month: 'long', year: 'numeric' })
  );
}