// src/utils/dateUtils.ts

// Get available months (last 12 months + current + next 3 months)
export const getAvailableMonths = () => {
  const months = [];
  const date = new Date();
  
  // Add previous 12 months
  for (let i = 12; i >= 1; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push(d.toLocaleString('default', { month: 'long', year: 'numeric' }));
  }
  
  // Add current month
  months.push(date.toLocaleString('default', { month: 'long', year: 'numeric' }));
  
  // Add next 3 months (for planning)
  for (let i = 1; i <= 3; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() + i);
    months.push(d.toLocaleString('default', { month: 'long', year: 'numeric' }));
  }
  
  return months;
};

// Parse month string to date range
export const getDateRangeFromMonth = (monthYear: string) => {
  const [month, year] = monthYear.split(' ');
  const monthIndex = new Date(Date.parse(month + " 1, " + year)).getMonth();
  const startDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(parseInt(year), monthIndex + 1, 0).getDate();
  const endDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${lastDay}`;
  return { startDate, endDate, year, monthIndex: monthIndex + 1, daysInMonth: lastDay };
};

// Check if date is in the future
export const isFutureMonth = (monthYear: string) => {
  const current = new Date();
  const [month, year] = monthYear.split(' ');
  const monthIndex = new Date(Date.parse(month + " 1, " + year)).getMonth();
  const compareDate = new Date(parseInt(year), monthIndex, 1);
  return compareDate > new Date(current.getFullYear(), current.getMonth(), 1);
};

// Get current month string
export const getCurrentMonth = () => {
  const date = new Date();
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
};