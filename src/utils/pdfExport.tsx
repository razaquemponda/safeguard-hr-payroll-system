import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// Styles for PDF
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Helvetica'
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#081C3A',
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#081C3A'
  },
  subtitle: {
    fontSize: 10,
    color: '#666',
    marginTop: 5
  },
  date: {
    fontSize: 9,
    color: '#999',
    textAlign: 'right'
  },
  table: {
    display: 'table',
    width: 'auto',
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    minHeight: 25
  },
  tableHeader: {
    backgroundColor: '#081C3A',
    fontWeight: 'bold'
  },
  tableHeaderText: {
    color: 'white',
    fontSize: 9,
    fontWeight: 'bold'
  },
  tableCell: {
    flex: 1,
    padding: 5,
    fontSize: 8
  },
  summary: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 5
  },
  summaryTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#081C3A'
  },
  summaryText: {
    fontSize: 9,
    marginBottom: 3
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: '#999',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    paddingTop: 10
  }
});

export const EmployeeReportPDF = ({ employees, title, region, date }: any) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>SAFEGUARD SECURITY SERVICES</Text>
          <Text style={styles.subtitle}>HR & Payroll Management System</Text>
          <Text style={styles.subtitle}>{title} Report</Text>
          {region && <Text style={styles.subtitle}>Region: {region}</Text>}
        </View>
        <View>
          <Text style={styles.date}>Generated: {date || new Date().toLocaleDateString()}</Text>
        </View>
      </View>

      {/* Summary Stats */}
      <View style={styles.summary}>
        <Text style={styles.summaryTitle}>📊 REPORT SUMMARY</Text>
        <Text style={styles.summaryText}>• Total Employees: {employees.length}</Text>
        <Text style={styles.summaryText}>• Active: {employees.filter((e: any) => e.status === 'Active').length}</Text>
        <Text style={styles.summaryText}>• On Leave: {employees.filter((e: any) => e.status === 'On Leave').length}</Text>
        <Text style={styles.summaryText}>• Suspended: {employees.filter((e: any) => e.status === 'Suspended').length}</Text>
        <Text style={styles.summaryText}>• Total Monthly Salary: MK {employees.reduce((sum: number, e: any) => sum + (e.basicSalary || 0), 0).toLocaleString()}</Text>
        <Text style={styles.summaryText}>• Average Salary: MK {employees.length > 0 ? Math.round(employees.reduce((sum: number, e: any) => sum + (e.basicSalary || 0), 0) / employees.length).toLocaleString() : 0}</Text>
      </View>

      {/* Employee Table */}
      <View style={styles.table}>
        {/* Header Row */}
        <View style={[styles.tableRow, styles.tableHeader]}>
          <Text style={[styles.tableCell, styles.tableHeaderText]}>ID</Text>
          <Text style={[styles.tableCell, styles.tableHeaderText]}>Name</Text>
          <Text style={[styles.tableCell, styles.tableHeaderText]}>Position</Text>
          <Text style={[styles.tableCell, styles.tableHeaderText]}>Department</Text>
          <Text style={[styles.tableCell, styles.tableHeaderText]}>Status</Text>
          <Text style={[styles.tableCell, styles.tableHeaderText]}>Salary (MK)</Text>
        </View>
        
        {/* Data Rows */}
        {employees.slice(0, 25).map((emp: any, idx: number) => (
          <View style={styles.tableRow} key={idx}>
            <Text style={styles.tableCell}>{emp.employeeNumber}</Text>
            <Text style={styles.tableCell}>{emp.fullName}</Text>
            <Text style={styles.tableCell}>{emp.position}</Text>
            <Text style={styles.tableCell}>{emp.department}</Text>
            <Text style={styles.tableCell}>{emp.status}</Text>
            <Text style={styles.tableCell}>{emp.basicSalary?.toLocaleString() || '0'}</Text>
          </View>
        ))}
      </View>
      {employees.length > 25 && (
        <Text style={{ fontSize: 8, marginTop: 10, textAlign: 'center', color: '#999' }}>
          Showing first 25 of {employees.length} employees
        </Text>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text>This is a system-generated report. For inquiries, contact HR Department.</Text>
        <Text>Safeguard Security Services Ltd. - Confidential</Text>
      </View>
    </Page>
  </Document>
);

export const PaymentReportPDF = ({ payments, month, region, date }: any) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>SAFEGUARD SECURITY SERVICES</Text>
          <Text style={styles.subtitle}>Payment Report</Text>
          <Text style={styles.subtitle}>Month: {month}</Text>
          {region && <Text style={styles.subtitle}>Region: {region}</Text>}
        </View>
        <View>
          <Text style={styles.date}>Generated: {date || new Date().toLocaleDateString()}</Text>
        </View>
      </View>

      {/* Payment Summary */}
      <View style={styles.summary}>
        <Text style={styles.summaryTitle}>💰 PAYMENT SUMMARY</Text>
        <Text style={styles.summaryText}>• Total Payments: {payments.length}</Text>
        <Text style={styles.summaryText}>• Pending: {payments.filter((p: any) => p.status === 'pending').length}</Text>
        <Text style={styles.summaryText}>• Processing: {payments.filter((p: any) => p.status === 'processing').length}</Text>
        <Text style={styles.summaryText}>• Paid: {payments.filter((p: any) => p.status === 'paid').length}</Text>
        <Text style={styles.summaryText}>• Confirmed: {payments.filter((p: any) => p.status === 'confirmed').length}</Text>
        <Text style={styles.summaryText}>• Failed: {payments.filter((p: any) => p.status === 'failed').length}</Text>
        <Text style={styles.summaryText}>• Total Amount: MK {payments.reduce((sum: number, p: any) => sum + (p.net_pay || 0), 0).toLocaleString()}</Text>
      </View>

      {/* Payment Table */}
      <View style={styles.table}>
        <View style={[styles.tableRow, styles.tableHeader]}>
          <Text style={[styles.tableCell, styles.tableHeaderText]}>Employee</Text>
          <Text style={[styles.tableCell, styles.tableHeaderText]}>Account</Text>
          <Text style={[styles.tableCell, styles.tableHeaderText]}>Amount (MK)</Text>
          <Text style={[styles.tableCell, styles.tableHeaderText]}>Status</Text>
          <Text style={[styles.tableCell, styles.tableHeaderText]}>Payment Date</Text>
        </View>
        
        {payments.slice(0, 25).map((payment: any, idx: number) => (
          <View style={styles.tableRow} key={idx}>
            <Text style={styles.tableCell}>{payment.full_name}</Text>
            <Text style={styles.tableCell}>{payment.account_number || '-'}</Text>
            <Text style={styles.tableCell}>{payment.net_pay?.toLocaleString() || '0'}</Text>
            <Text style={styles.tableCell}>{payment.status?.toUpperCase() || 'PENDING'}</Text>
            <Text style={styles.tableCell}>{payment.payment_date || '-'}</Text>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <Text>Bank authorization required before payment processing.</Text>
        <Text>Safeguard Security Services Ltd. - Finance Department</Text>
      </View>
    </Page>
  </Document>
);