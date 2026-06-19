import { useState, useEffect } from 'react';
import { Shield, FileDown, FileText, Download, Printer, Search, CheckSquare, Square, AlertCircle } from 'lucide-react';
import { Card, Button, Badge, PageHeader, Modal } from '../components/ui';
import { formatKwacha } from '../data';
import { supabase } from '../lib/supabase';
import { showNotification } from '../utils/clickHandlers';
import { getAvailableMonths, getCurrentMonth, isFutureMonth } from '../utils/dateUtils';
import { MonthSelector } from '../components/MonthSelector';
import { EmptyState } from '../components/EmptyState';
import jsPDF from 'jspdf';
// ===== NEW: Import sanitization =====
import { sanitizeInput } from '../utils/securityHeaders';

interface Employee {
  id: string;
  employee_number: string;
  full_name: string;
  position: string;
  department: string;
  basic_salary: number;
  status: string;
  region_id?: string;
  account_number?: string;
}

interface PayrollRecord {
  id: string;
  employee_id: string;
  month: string;
  basic_salary: number;
  allowances: number;
  overtime: number;
  bonus: number;
  gross_pay: number;
  paye: number;
  pension: number;
  uniform_deduction: number;
  net_pay: number;
  processed_at: string;
}

// NEW: Interface for employee deductions
interface EmployeeDeduction {
  id: string;
  employee_id: string;
  month: string;
  absent_days: number;
  late_days: number;
  absent_deduction: number;
  late_deduction: number;
  lecture_missed: number;
  lecture_deduction: number;
  appearance_deduction: number;
  total_deductions: number;
}

export function PayslipsPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [employeeDeductions, setEmployeeDeductions] = useState<EmployeeDeduction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [viewPayslip, setViewPayslip] = useState<{ employee: Employee; payroll: PayrollRecord | null } | null>(null);
  const [hasData, setHasData] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);
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
        setUserProfile(profile);
      }
    };
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (userProfile) {
      fetchData();
    }
  }, [selectedMonth, userProfile]);

  const checkDataExists = async (month: string) => {
    let query = supabase
      .from('payroll')
      .select('id', { count: 'exact', head: true })
      .eq('month', month);
    
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
    if (error) return false;
    return (count || 0) > 0;
  };

  const handleMonthChange = async (newMonth: string) => {
    if (isFutureMonth(newMonth)) {
      alert('Cannot view future months. Please select a current or past month.');
      return;
    }
    setSelectedMonth(newMonth);
    setLoading(true);
    try {
      const exists = await checkDataExists(newMonth);
      setHasData(exists);
      await fetchData();
    } finally {
      setLoading(false);
    }
  };

  // NEW: Fetch employee deductions for the selected month
  const fetchEmployeeDeductions = async () => {
    try {
      const { data, error } = await supabase
        .from('employee_deductions')
        .select('*')
        .eq('month', selectedMonth);

      if (error) throw error;
      setEmployeeDeductions(data || []);
      return data || [];
    } catch (err) {
      console.error('Error fetching employee deductions:', err);
      return [];
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      let employeesQuery = supabase
        .from('employees')
        .select('id, employee_number, full_name, position, department, basic_salary, status, region_id, account_number');
      
      if (!userProfile?.is_super_admin && userProfile?.region_id) {
        employeesQuery = employeesQuery.eq('region_id', userProfile.region_id);
      }
      
      const { data: employeesData, error: empError } = await employeesQuery;
      if (empError) throw empError;
      setEmployees(employeesData || []);
      
      let payrollQuery = supabase
        .from('payroll')
        .select('*')
        .eq('month', selectedMonth);
      
      if (!userProfile?.is_super_admin && userProfile?.region_id) {
        const employeeIds = (employeesData || []).map(e => e.id);
        if (employeeIds.length > 0) {
          payrollQuery = payrollQuery.in('employee_id', employeeIds);
        }
      }
      
      const { data: payrollData, error: payError } = await payrollQuery;
      if (payError) throw payError;
      setPayrollRecords(payrollData || []);
      
      // NEW: Fetch employee deductions
      await fetchEmployeeDeductions();
      
      setHasData((payrollData?.length || 0) > 0);
    } catch (err: any) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPayrollForEmployee = (employeeId: string): PayrollRecord | null => {
    return payrollRecords.find(p => p.employee_id === employeeId) || null;
  };

  // NEW: Get employee deductions for a specific employee
  const getEmployeeDeduction = (employeeId: string): EmployeeDeduction | null => {
    return employeeDeductions.find(d => d.employee_id === employeeId) || null;
  };

  // UPDATED: Calculate payroll with attendance deductions
  const calculatePayroll = (employee: Employee): PayrollRecord => {
    const basicSalary = employee.basic_salary || 0;
    const allowances = Math.round(basicSalary * 0.10);
    const overtime = Math.round(basicSalary * 0.05);
    const bonus = Math.round(basicSalary * 0.02);
    const grossPay = basicSalary + allowances + overtime + bonus;
    const paye = Math.round(grossPay * 0.30);
    const pension = Math.round(grossPay * 0.05);
    
    // NEW: Get attendance deductions for this employee
    const deduction = getEmployeeDeduction(employee.id);
    const uniformDeduction = deduction?.total_deductions || 0;
    
    // NEW: Net pay = gross - paye - pension - uniform/attendance deductions
    const netPay = grossPay - paye - pension - uniformDeduction;
    
    return {
      id: '',
      employee_id: employee.id,
      month: selectedMonth,
      basic_salary: basicSalary,
      allowances,
      overtime,
      bonus,
      gross_pay: grossPay,
      paye,
      pension,
      uniform_deduction: uniformDeduction,
      net_pay: netPay,
      processed_at: new Date().toISOString()
    };
  };

  const getDisplayPayroll = (employee: Employee): PayrollRecord => {
    const existing = getPayrollForEmployee(employee.id);
    if (existing) return existing;
    return calculatePayroll(employee);
  };

  // ===== UPDATED: Filter employees with sanitized search =====
  const filteredEmployees = employees.filter(e => {
    const safeSearch = sanitizeInput(search).toLowerCase();
    return e.full_name?.toLowerCase().includes(safeSearch) ||
           e.employee_number?.toLowerCase().includes(safeSearch);
  });

  // UPDATED: Generate payslip HTML for print with sanitization
  const generatePayslipHTML = (employee: Employee, payroll: PayrollRecord): string => {
    const p = payroll;
    const hasDeductions = p.uniform_deduction > 0;
    const totalDeductions = p.paye + p.pension + p.uniform_deduction;
    const deduction = getEmployeeDeduction(employee.id);
    
    // ===== NEW: Sanitize employee data for HTML =====
    const safeEmployee = {
      full_name: sanitizeInput(employee.full_name),
      employee_number: sanitizeInput(employee.employee_number),
      position: sanitizeInput(employee.position),
      department: sanitizeInput(employee.department),
    };
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payslip - ${safeEmployee.full_name}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; background: white; padding: 40px; display: flex; justify-content: center; min-height: 100vh; }
            .payslip { max-width: 800px; width: 100%; background: white; padding: 40px; border: 2px solid #e2e8f0; border-radius: 12px; }
            .header { display: flex; justify-content: space-between; border-bottom: 3px solid #081C3A; padding-bottom: 15px; margin-bottom: 20px; }
            .header-left h1 { font-size: 24px; font-weight: bold; color: #081C3A; margin: 0; }
            .header-left p { font-size: 12px; color: #666; margin: 5px 0 0 0; }
            .header-right { text-align: right; }
            .header-right h2 { font-size: 18px; font-weight: bold; color: #081C3A; margin: 0; }
            .header-right p { font-size: 12px; color: #999; margin: 5px 0 0 0; }
            .employee-info { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; font-size: 12px; border-bottom: 1px solid #eee; padding-bottom: 15px; margin-bottom: 15px; }
            .employee-info .label { color: #666; margin: 0; }
            .employee-info .value { font-weight: bold; margin: 5px 0 0 0; }
            .details { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; padding: 15px 0; }
            .details h3 { font-size: 11px; font-weight: bold; color: #081C3A; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #ddd; padding-bottom: 8px; margin-bottom: 10px; }
            .details .row { display: flex; justify-content: space-between; font-size: 12px; padding: 4px 0; line-height: 1.8; }
            .details .row .label-text { color: #666; }
            .details .row.total { font-weight: bold; border-top: 2px solid #ddd; padding-top: 8px; margin-top: 5px; }
            .details .row.total .amount { color: #081C3A; }
            .details .row.deduction .amount { color: #dc2626; }
            ${hasDeductions ? `
            .deduction-section { background: #fef2f2; padding: 12px 15px; border-radius: 8px; margin: 10px 0; border: 1px solid #fecaca; }
            .deduction-section .row { display: flex; justify-content: space-between; font-size: 12px; padding: 3px 0; }
            .deduction-section .total-deduction { font-weight: bold; color: #dc2626; border-top: 2px solid #fecaca; padding-top: 8px; margin-top: 5px; }
            ` : ''}
            .total-box { background: linear-gradient(to right, #081C3A, #1a2f5c); padding: 20px 25px; border-radius: 8px; margin-top: 15px; display: flex; justify-content: space-between; align-items: center; }
            .total-box .label-text { font-size: 12px; opacity: 0.8; text-transform: uppercase; letter-spacing: 1px; color: white; margin: 0; }
            .total-box .amount { font-size: 32px; font-weight: bold; color: #D4A017; margin: 5px 0 0 0; }
            .total-box .right-text { text-align: right; font-size: 12px; color: rgba(255,255,255,0.8); }
            .footer { text-align: center; font-size: 10px; color: #999; margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee; }
            @media print { body { padding: 20px; } .payslip { border: none; box-shadow: none; } }
            @media (max-width: 600px) { body { padding: 20px; } .payslip { padding: 20px; } .employee-info { grid-template-columns: 1fr 1fr; } .details { grid-template-columns: 1fr; gap: 20px; } .header { flex-direction: column; align-items: flex-start; gap: 10px; } .header-right { text-align: left; } }
          </style>
        </head>
        <body>
          <div class="payslip">
            <div class="header">
              <div class="header-left"><h1>SAFEGUARD SECURITY SERVICES</h1><p>Lilongwe, Malawi · (+265) 1 234 567</p></div>
              <div class="header-right"><h2>PAYSLIP</h2><p>${selectedMonth}</p></div>
            </div>
            <div class="employee-info">
              <div><p class="label">Employee</p><p class="value">${safeEmployee.full_name}</p></div>
              <div><p class="label">Employee No.</p><p class="value">${safeEmployee.employee_number}</p></div>
              <div><p class="label">Position</p><p class="value">${safeEmployee.position}</p></div>
              <div><p class="label">Department</p><p class="value">${safeEmployee.department}</p></div>
            </div>
            
            ${hasDeductions ? `
            <div class="deduction-section">
              <h3 style="font-size: 11px; font-weight: bold; color: #dc2626; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Attendance & Uniform Deductions</h3>
              ${deduction?.absent_days ? `<div class="row"><span class="label-text">Absent Days (${deduction.absent_days})</span><span class="amount" style="color: #dc2626;">-${formatKwacha(deduction.absent_deduction || 0)}</span></div>` : ''}
              ${deduction?.late_days ? `<div class="row"><span class="label-text">Late Days (${deduction.late_days})</span><span class="amount" style="color: #dc2626;">-${formatKwacha(deduction.late_deduction || 0)}</span></div>` : ''}
              ${deduction?.lecture_missed ? `<div class="row"><span class="label-text">Lectures Missed (${deduction.lecture_missed})</span><span class="amount" style="color: #dc2626;">-${formatKwacha(deduction.lecture_deduction || 0)}</span></div>` : ''}
              ${deduction?.appearance_deduction ? `<div class="row"><span class="label-text">Appearance/Hygiene</span><span class="amount" style="color: #dc2626;">-${formatKwacha(deduction.appearance_deduction || 0)}</span></div>` : ''}
              <div class="row total-deduction"><span class="label-text">Total Attendance/Uniform</span><span class="amount" style="color: #dc2626; font-weight: bold;">-${formatKwacha(p.uniform_deduction)}</span></div>
            </div>
            ` : ''}
            
            <div class="details">
              <div>
                <h3>Earnings</h3>
                <div class="row"><span class="label-text">Basic Salary</span><span class="amount">${formatKwacha(p.basic_salary)}</span></div>
                <div class="row"><span class="label-text">Allowances (10%)</span><span class="amount">${formatKwacha(p.allowances)}</span></div>
                <div class="row"><span class="label-text">Overtime (5%)</span><span class="amount">${formatKwacha(p.overtime)}</span></div>
                <div class="row"><span class="label-text">Bonus</span><span class="amount">${formatKwacha(p.bonus)}</span></div>
                <div class="row total"><span class="label-text">Gross Pay</span><span class="amount">${formatKwacha(p.gross_pay)}</span></div>
              </div>
              <div>
                <h3>Deductions</h3>
                <div class="row deduction"><span class="label-text">PAYE Tax</span><span class="amount">-${formatKwacha(p.paye)}</span></div>
                <div class="row deduction"><span class="label-text">Pension (5%)</span><span class="amount">-${formatKwacha(p.pension)}</span></div>
                ${hasDeductions ? `
                <div class="row deduction" style="font-weight: bold; border-top: 1px dashed #fecaca; padding-top: 4px; margin-top: 4px;">
                  <span class="label-text">Attendance/Uniform</span>
                  <span class="amount" style="color: #dc2626;">-${formatKwacha(p.uniform_deduction)}</span>
                </div>
                ` : ''}
                <div class="row total deduction"><span class="label-text">Total Deductions</span><span class="amount">-${formatKwacha(totalDeductions)}</span></div>
              </div>
            </div>
            <div class="total-box">
              <div><p class="label-text">Total Net Pay</p><p class="amount">${formatKwacha(p.net_pay)}</p></div>
              <div class="right-text"><p>Payment Method: Bank Transfer</p><p>Authorized: William Banda (Admin)</p></div>
            </div>
            <div class="footer">This is a system-generated payslip. No signature required.</div>
          </div>
        </body>
      </html>
    `;
  };

  // UPDATED: Generate PDF using jsPDF with sanitization
  const generatePDF = (employee: Employee, payroll: PayrollRecord): string => {
    try {
      console.log('Starting PDF generation for:', employee.full_name);
      const p = payroll;
      const hasDeductions = p.uniform_deduction > 0;
      const totalDeductions = p.paye + p.pension + p.uniform_deduction;
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      let y = margin;

      // ===== NEW: Sanitize employee data for PDF =====
      const safeEmployee = {
        full_name: sanitizeInput(employee.full_name),
        employee_number: sanitizeInput(employee.employee_number),
        position: sanitizeInput(employee.position),
        department: sanitizeInput(employee.department),
      };

      // Title
      doc.setFontSize(18);
      doc.setTextColor('#081C3A');
      doc.text('SAFEGUARD SECURITY SERVICES', pageWidth / 2, y, { align: 'center' });
      y += 8;
      
      doc.setFontSize(10);
      doc.setTextColor('#666666');
      doc.text('Blantyre, Malawi · (+265) 0888 348 787', pageWidth / 2, y, { align: 'center' });
      y += 12;

      // Payslip header
      doc.setFontSize(14);
      doc.setTextColor('#081C3A');
      doc.text('PAYSLIP', pageWidth - margin, y, { align: 'right' });
      y += 6;
      doc.setFontSize(10);
      doc.setTextColor('#999999');
      doc.text(selectedMonth, pageWidth - margin, y, { align: 'right' });
      y += 10;

      // Line
      doc.setDrawColor('#081C3A');
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageWidth - margin, y);
      y += 10;

      // Employee info - using sanitized data
      doc.setFontSize(9);
      const infoLabels = ['Employee', 'Employee No.', 'Position', 'Department'];
      const infoValues = [safeEmployee.full_name, safeEmployee.employee_number, safeEmployee.position, safeEmployee.department];
      const colWidth = (pageWidth - 2 * margin) / 4;
      
      infoLabels.forEach((label, i) => {
        const x = margin + i * colWidth;
        doc.setTextColor('#666666');
        doc.text(label, x, y);
        doc.setTextColor('#000000');
        doc.setFont('helvetica', 'bold');
        doc.text(infoValues[i], x, y + 5);
        doc.setFont('helvetica', 'normal');
      });
      y += 18;

      // Line
      doc.setDrawColor('#dddddd');
      doc.line(margin, y, pageWidth - margin, y);
      y += 10;

      // NEW: Deductions section if there are any
      if (hasDeductions) {
        doc.setFillColor('#fef2f2');
        doc.rect(margin, y, pageWidth - 2 * margin, 30, 'F');
        doc.setDrawColor('#fecaca');
        doc.rect(margin, y, pageWidth - 2 * margin, 30, 'D');
        
        doc.setFontSize(9);
        doc.setTextColor('#dc2626');
        doc.setFont('helvetica', 'bold');
        doc.text('Attendance & Uniform Deductions', margin + 5, y + 6);
        doc.setFont('helvetica', 'normal');
        
        let deductionY = y + 12;
        const deduction = getEmployeeDeduction(employee.id);
        if (deduction) {
          if (deduction.absent_days > 0) {
            doc.setTextColor('#666666');
            doc.text(`Absent Days (${deduction.absent_days})`, margin + 5, deductionY);
            doc.setTextColor('#dc2626');
            doc.text(`-${formatKwacha(deduction.absent_deduction || 0)}`, pageWidth - margin - 5, deductionY, { align: 'right' });
            deductionY += 5;
          }
          if (deduction.late_days > 0) {
            doc.setTextColor('#666666');
            doc.text(`Late Days (${deduction.late_days})`, margin + 5, deductionY);
            doc.setTextColor('#dc2626');
            doc.text(`-${formatKwacha(deduction.late_deduction || 0)}`, pageWidth - margin - 5, deductionY, { align: 'right' });
            deductionY += 5;
          }
          if (deduction.lecture_missed > 0) {
            doc.setTextColor('#666666');
            doc.text(`Lectures Missed (${deduction.lecture_missed})`, margin + 5, deductionY);
            doc.setTextColor('#dc2626');
            doc.text(`-${formatKwacha(deduction.lecture_deduction || 0)}`, pageWidth - margin - 5, deductionY, { align: 'right' });
            deductionY += 5;
          }
          if (deduction.appearance_deduction > 0) {
            doc.setTextColor('#666666');
            doc.text('Appearance/Hygiene', margin + 5, deductionY);
            doc.setTextColor('#dc2626');
            doc.text(`-${formatKwacha(deduction.appearance_deduction || 0)}`, pageWidth - margin - 5, deductionY, { align: 'right' });
            deductionY += 5;
          }
        }
        
        doc.setDrawColor('#fecaca');
        doc.line(margin + 5, deductionY, pageWidth - margin - 5, deductionY);
        deductionY += 5;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor('#dc2626');
        doc.text('Total Attendance/Uniform', margin + 5, deductionY);
        doc.text(`-${formatKwacha(p.uniform_deduction)}`, pageWidth - margin - 5, deductionY, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        
        y += 38;
      }

      // Earnings and Deductions
      const leftCol = margin;
      const rightCol = pageWidth / 2 + 5;
      
      // Earnings
      doc.setFontSize(10);
      doc.setTextColor('#081C3A');
      doc.setFont('helvetica', 'bold');
      doc.text('EARNINGS', leftCol, y);
      doc.setFont('helvetica', 'normal');
      y += 8;

      const earnings = [
        ['Basic Salary', formatKwacha(p.basic_salary)],
        ['Allowances (10%)', formatKwacha(p.allowances)],
        ['Overtime (5%)', formatKwacha(p.overtime)],
        ['Bonus', formatKwacha(p.bonus)],
        ['Gross Pay', formatKwacha(p.gross_pay)]
      ];
      
      earnings.forEach(([label, amount], i) => {
        const isTotal = i === earnings.length - 1;
        doc.setFontSize(9);
        doc.setTextColor('#666666');
        doc.text(label, leftCol, y);
        doc.setTextColor(isTotal ? '#081C3A' : '#000000');
        doc.setFont('helvetica', isTotal ? 'bold' : 'normal');
        doc.text(amount, leftCol + 60, y, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        y += 6;
      });
      y += 4;

      // Deductions
      doc.setFontSize(10);
      doc.setTextColor('#081C3A');
      doc.setFont('helvetica', 'bold');
      doc.text('DEDUCTIONS', rightCol, y - 12);
      doc.setFont('helvetica', 'normal');
      y -= 4;

      const deductions = [
        ['PAYE Tax', `-${formatKwacha(p.paye)}`],
        ['Pension (5%)', `-${formatKwacha(p.pension)}`],
        ...(hasDeductions ? [['Attendance/Uniform', `-${formatKwacha(p.uniform_deduction)}`]] : []),
        ['Total Deductions', `-${formatKwacha(totalDeductions)}`]
      ];
      
      deductions.forEach(([label, amount], i) => {
        const isTotal = i === deductions.length - 1;
        const isAttendance = label === 'Attendance/Uniform';
        doc.setFontSize(9);
        doc.setTextColor('#666666');
        doc.text(label, rightCol, y);
        doc.setTextColor(isAttendance ? '#dc2626' : (isTotal ? '#dc2626' : '#000000'));
        doc.setFont('helvetica', (isTotal || isAttendance) ? 'bold' : 'normal');
        doc.text(amount, rightCol + 60, y, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        y += 6;
      });
      y += 10;

      // Line
      doc.setDrawColor('#dddddd');
      doc.line(margin, y, pageWidth - margin, y);
      y += 12;

      // Total Net Pay
      const boxHeight = 30;
      doc.setFillColor('#081C3A');
      doc.rect(margin, y, pageWidth - 2 * margin, boxHeight, 'F');
      
      doc.setTextColor('#FFFFFF');
      doc.setFontSize(10);
      doc.text('Total Net Pay', margin + 10, y + 10);
      
      doc.setTextColor('#D4A017');
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text(formatKwacha(p.net_pay), margin + 10, y + 26);
      
      doc.setTextColor('#CCCCCC');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Payment Method: Bank Transfer', pageWidth - margin - 10, y + 10, { align: 'right' });
      doc.text('Authorized: Mr. Charles Mlanga (Admin)', pageWidth - margin - 10, y + 22, { align: 'right' });
      
      y += boxHeight + 15;

      // Footer
      doc.setFontSize(8);
      doc.setTextColor('#999999');
      doc.text('This is a system-generated payslip. No signature required.', pageWidth / 2, y, { align: 'center' });

      console.log('PDF generated successfully');
      return doc.output('datauristring');
    } catch (error) {
      console.error('Error in generatePDF:', error);
      throw error;
    }
  };

  // FIXED: PRINT - Opens print dialog immediately
  const handlePrint = (employee: Employee, payroll: PayrollRecord) => {
    try {
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (printWindow) {
        printWindow.document.write(generatePayslipHTML(employee, payroll));
        printWindow.document.close();
        printWindow.focus();
        printWindow.onload = function() {
          setTimeout(() => {
            printWindow.print();
          }, 500);
        };
      } else {
        showNotification('Please allow popups for this site', 'error');
      }
    } catch (error) {
      console.error('Print error:', error);
      showNotification('Failed to print payslip', 'error');
    }
  };

  // FIXED: PDF - Downloads PDF file directly with better error handling
  const handlePDFDownload = (employee: Employee, payroll: PayrollRecord) => {
    try {
      console.log('=== PDF Download Started ===');
      console.log('Employee:', employee.full_name);
      console.log('Month:', selectedMonth);
      
      // Generate the PDF
      const pdfData = generatePDF(employee, payroll);
      
      // Verify we got data
      if (!pdfData || pdfData.length < 100) {
        throw new Error('Generated PDF data is invalid or too small');
      }
      
      console.log('PDF data generated, length:', pdfData.length);
      
      // Create download link
      const link = document.createElement('a');
      link.href = pdfData;
      link.download = `Payslip_${employee.full_name.replace(/\s/g, '_')}_${selectedMonth}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showNotification(`Payslip for ${employee.full_name} downloaded successfully`, 'success');
    } catch (error: any) {
      console.error('=== PDF Download Error ===');
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
      showNotification(`Failed to generate PDF: ${error.message || 'Unknown error'}`, 'error');
    }
  };

  // FIXED: Bulk Print - Opens print dialog with all selected payslips
  const handleBulkPrint = async () => {
    if (selectedEmployees.length === 0) {
      showNotification('Please select at least one employee', 'error');
      return;
    }

    setBulkProcessing(true);
    try {
      const allPayslips = selectedEmployees.map(id => {
        const employee = employees.find(e => e.id === id);
        if (!employee) return null;
        const payroll = getDisplayPayroll(employee);
        return { employee, payroll };
      }).filter(Boolean);

      let combinedHTML = `
        <!DOCTYPE html>
        <html>
          <head><title>Bulk Payslips - ${selectedMonth}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; background: white; padding: 20px; }
            .page-break { page-break-after: always; }
            .payslip { max-width: 800px; margin: 0 auto; padding: 40px; background: white; border: 2px solid #e2e8f0; border-radius: 12px; margin-bottom: 30px; }
            @media print { body { padding: 0; } .payslip { border: none; border-radius: 0; margin: 0; } }
          </style>
          </head>
          <body>
      `;
      
      allPayslips.forEach((item, index) => {
        if (item) {
          const fullHTML = generatePayslipHTML(item.employee, item.payroll);
          const bodyMatch = fullHTML.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
          if (bodyMatch) {
            combinedHTML += `<div class="payslip">${bodyMatch[1]}</div>`;
          }
          if (index < allPayslips.length - 1) {
            combinedHTML += '<div class="page-break"></div>';
          }
        }
      });
      
      combinedHTML += '</body></html>';

      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (printWindow) {
        printWindow.document.write(combinedHTML);
        printWindow.document.close();
        printWindow.focus();
        printWindow.onload = function() {
          setTimeout(() => {
            printWindow.print();
          }, 500);
        };
        showNotification(`Opening ${allPayslips.length} payslips for printing`, 'success');
      } else {
        showNotification('Please allow popups for this site', 'error');
      }
      
      setSelectedEmployees([]);
      setSelectAll(false);
    } catch (error) {
      console.error('Bulk print error:', error);
      showNotification('Failed to print payslips', 'error');
    } finally {
      setBulkProcessing(false);
    }
  };

  // FIXED: Bulk PDF - Downloads all selected payslips as PDFs
  const handleBulkPDF = async () => {
    if (selectedEmployees.length === 0) {
      showNotification('Please select at least one employee', 'error');
      return;
    }

    setBulkProcessing(true);
    try {
      const allPayslips = selectedEmployees.map(id => {
        const employee = employees.find(e => e.id === id);
        if (!employee) return null;
        const payroll = getDisplayPayroll(employee);
        return { employee, payroll };
      }).filter(Boolean);

      let successCount = 0;
      let failCount = 0;

      // Generate each PDF and download
      for (const item of allPayslips) {
        if (item) {
          try {
            const pdfData = generatePDF(item.employee, item.payroll);
            const link = document.createElement('a');
            link.href = pdfData;
            link.download = `Payslip_${item.employee.full_name.replace(/\s/g, '_')}_${selectedMonth}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            successCount++;
            // Small delay between downloads
            await new Promise(resolve => setTimeout(resolve, 300));
          } catch (error) {
            console.error(`Failed to generate PDF for ${item.employee.full_name}:`, error);
            failCount++;
          }
        }
      }
      
      if (successCount > 0) {
        showNotification(`Downloaded ${successCount} payslips${failCount > 0 ? `, ${failCount} failed` : ''}`, successCount > 0 ? 'success' : 'error');
      } else {
        showNotification('Failed to download any payslips', 'error');
      }
      
      setSelectedEmployees([]);
      setSelectAll(false);
    } catch (error) {
      console.error('Bulk PDF error:', error);
      showNotification('Failed to download payslips', 'error');
    } finally {
      setBulkProcessing(false);
    }
  };

  // Toggle select all
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(filteredEmployees.map(e => e.id));
    }
    setSelectAll(!selectAll);
  };

  // Toggle single employee selection
  const toggleSelectEmployee = (employeeId: string) => {
    if (selectedEmployees.includes(employeeId)) {
      setSelectedEmployees(selectedEmployees.filter(id => id !== employeeId));
    } else {
      setSelectedEmployees([...selectedEmployees, employeeId]);
    }
    setSelectAll(selectedEmployees.length + 1 === filteredEmployees.length);
  };

  const isSuperAdmin = userProfile?.is_super_admin;
  const userRegion = userProfile?.regions;

  // NEW: Get employees with deductions for summary
  const employeesWithDeductions = employees.filter(emp => {
    const deduction = getEmployeeDeduction(emp.id);
    return deduction && deduction.total_deductions > 0;
  });

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-[#D4A017] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Payslips"
        subtitle={isSuperAdmin ? "Generate and print professional payslips" : `${userRegion?.name || ''} Region - Payslips`}
        actions={
          <div className="flex gap-2">
            <MonthSelector
              selectedMonth={selectedMonth}
              onMonthChange={handleMonthChange}
              availableMonths={availableMonths}
              isLoading={loading}
            />
            {selectedEmployees.length > 0 && (
              <>
                <Button variant="outline" onClick={handleBulkPrint} disabled={bulkProcessing}>
                  <Printer size={16} className="mr-1" />
                  Print {selectedEmployees.length}
                </Button>
                <Button variant="secondary" onClick={handleBulkPDF} disabled={bulkProcessing}>
                  <Download size={16} className="mr-1" />
                  PDF {selectedEmployees.length}
                </Button>
              </>
            )}
          </div>
        }
      />

      {!isSuperAdmin && userRegion && (
        <Card className="p-3 bg-gradient-to-r from-[#081C3A]/5 to-transparent border-[#081C3A]/20">
          <p className="text-sm text-slate-600">
            Viewing payslips for <strong className="text-[#081C3A]">{userRegion.name}</strong> region
          </p>
        </Card>
      )}

      {/* NEW: Alert if there are employees with deductions */}
      {employeesWithDeductions.length > 0 && (
        <Card className="p-4 bg-amber-50 border-amber-200 border">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                Attendance/Uniform Deductions Applied
              </p>
              <p className="text-sm text-amber-700">
                {employeesWithDeductions.length} employee(s) have attendance/uniform deductions for this month. 
                These are already included in the net pay shown below.
              </p>
            </div>
          </div>
        </Card>
      )}

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
        <div className="text-sm text-slate-500">{filteredEmployees.length} payslips ready</div>
        <Button variant="outline" onClick={() => {
          setSelectedEmployees([]);
          setSelectAll(false);
        }} className="text-sm">
          Clear Selection
        </Button>
      </Card>

      {!hasData ? (
        <EmptyState
          title="No Payslips Found"
          message={`No payroll records found for ${selectedMonth}. Please process payroll for this month first.`}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEmployees.slice(0, 18).map(emp => {
            const payroll = getDisplayPayroll(emp);
            const isSelected = selectedEmployees.includes(emp.id);
            const hasDeductions = payroll.uniform_deduction > 0;
            
            return (
              <Card key={emp.id} className={`p-5 hover:shadow-lg transition-shadow ${isSelected ? 'ring-2 ring-[#D4A017]' : ''}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleSelectEmployee(emp.id)}
                      className="w-6 h-6 rounded border border-slate-300 flex items-center justify-center hover:bg-slate-100"
                    >
                      {isSelected ? (
                        <div className="w-4 h-4 bg-[#D4A017] rounded text-white flex items-center justify-center text-xs">✓</div>
                      ) : (
                        <div className="w-4 h-4" />
                      )}
                    </button>
                    <div className="w-10 h-10 rounded-lg bg-[#081C3A] text-white text-xs font-bold flex items-center justify-center">
                      {emp.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{emp.full_name}</p>
                      <p className="text-xs text-slate-500">{emp.employee_number}</p>
                      {hasDeductions && (
                        <Badge color="red" className="text-[10px] mt-0.5">Deductions</Badge>
                      )}
                    </div>
                  </div>
                  <Badge color={payroll.id ? 'green' : 'yellow'}>{payroll.id ? 'Processed' : 'Pending'}</Badge>
                </div>
                <div className="border-t border-slate-100 pt-4">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-xs text-slate-500">{selectedMonth} · Net Pay</p>
                    {hasDeductions && (
                      <p className="text-[10px] text-red-500">-{formatKwacha(payroll.uniform_deduction)} deductions</p>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-[#081C3A]">{formatKwacha(payroll.net_pay)}</p>
                  {hasDeductions && (
                    <p className="text-[10px] text-slate-400 mt-0.5">Gross: {formatKwacha(payroll.gross_pay)}</p>
                  )}
                  <div className="flex gap-2 mt-4">
                    <Button 
                      variant="outline" 
                      className="text-xs py-1.5 flex-1"
                      onClick={() => handlePrint(emp, payroll)}
                    >
                      <Printer size={12} className="mr-1" /> Print
                    </Button>
                    <Button 
                      variant="secondary" 
                      className="text-xs py-1.5 flex-1"
                      onClick={() => handlePDFDownload(emp, payroll)}
                    >
                      <Download size={12} className="mr-1" /> PDF
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}