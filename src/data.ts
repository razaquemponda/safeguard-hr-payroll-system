// Mock data for Safeguard Security Services HR System

export type Employee = {
  id: string;
  employeeNumber: string;
  guardId: string;
  fullName: string;
  dob: string;
  gender: 'Male' | 'Female';
  age: number;
  nationalId: string;
  phone: string;
  address: string;
  position: string;
  department: string;
  qualification: string;
  dateHired: string;
  basicSalary: number;
  payPoint: string;
  contractType: 'Permanent' | 'Contract' | 'Part-time';
  status: 'Active' | 'On Leave' | 'Suspended' | 'Resigned';
  email?: string;
  emergencyContact?: { name: string; phone: string; relationship: string };
  supervisor?: string;
  deploymentSite?: string;
  shift?: string;
  licenseStatus?: 'Valid' | 'Expiring' | 'Expired';
  uniformStatus?: 'Issued' | 'Pending' | 'Damaged';
};

// Realistic Malawian first names
const firstNames = [
  'Chilufya', 'Chimwemwe', 'Chisomo', 'Tamanda', 'Yamikani', 'Thokoza', 'Mphatso', 'Madalitso',
  'Tiyamike', 'Chikondi', 'Takondwa', 'Pemphero', 'Limbani', 'Wongani', 'Atusaye', 'Mwayi',
  'Blessings', 'Hope', 'Faith', 'Mercy', 'Precious', 'Patience', 'Lovemore', 'Wisdom',
  'John', 'Mary', 'James', 'Grace', 'Daniel', 'Esther', 'Peter', 'Joyce', 'David', 'Rebecca',
  'Michael', 'Ruth', 'Joseph', 'Sarah', 'Andrew', 'Margaret', 'William', 'Elizabeth', 'Felix',
  'Agnes', 'Charles', 'Florence', 'Henry', 'Catherine', 'Patrick', 'Jane', 'Robert', 'Anna',
  'Stephen', 'Lucy', 'George', 'Beatrice', 'Edward', 'Christine', 'Frank', 'Eunice', 'Samuel',
  'Linda', 'Thomas', 'Susan', 'Richard', 'Janet', 'Anthony', 'Mary-Jane', 'Kenneth', 'Caroline'
];

// Realistic Malawian surnames
const lastNames = [
  'Banda', 'Phiri', 'Mwale', 'Chirwa', 'Zulu', 'Moyo', 'Soko', 'Chanda', 'Mbewe', 'Chilenga',
  'Nyirenda', 'Lungu', 'Musonda', 'Chibwe', 'Kunda', 'Mtemvu', 'Sichinga', 'Mwaba', 'Chikombe',
  'Sakala', 'Mwanza', 'Chifumbe', 'Lufungo', 'Mundia', 'Mukuka', 'Sikaundi', 'Chileshe',
  'Mulenga', 'Ngoma', 'Mwiinga', 'Lubasi', 'Kachingwe', 'Manda', 'Tembo', 'Khoza', 'Gondwe',
  'Mvula', 'Kamanga', 'Kayira', 'Mhone', 'Chavula', 'Msiska', 'Kumwenda', 'Mganga', 'Nhlane',
  'Ziba', 'Mwenifumbo', 'Chisomo', 'Daka', 'Maluwa', 'Mkandawire', 'Munthali', 'Kasambara'
];

// Security company positions
const positions = [
  { name: 'Security Guard', salary: [250000, 350000], dept: 'Operations' },
  { name: 'Patrol Supervisor', salary: [450000, 600000], dept: 'Patrol' },
  { name: 'Control Room Operator', salary: [380000, 480000], dept: 'CCTV Monitoring' },
  { name: 'Site Manager', salary: [800000, 1200000], dept: 'Operations' },
  { name: 'K9 Handler', salary: [500000, 700000], dept: 'K9 Unit' },
  { name: 'CCTV Operator', salary: [350000, 450000], dept: 'CCTV Monitoring' },
  { name: 'Armed Response Officer', salary: [600000, 800000], dept: 'Patrol' },
  { name: 'Access Control Officer', salary: [300000, 400000], dept: 'Operations' },
  { name: 'Administrative Officer', salary: [550000, 750000], dept: 'Administration' },
  { name: 'HR Coordinator', salary: [600000, 850000], dept: 'Administration' }
];

const qualifications = [
  'Grade 12 Certificate',
  'Certificate in Security Operations',
  'Diploma in Security Management',
  'Advanced Security Training (PSIRA)',
  'Ex-Military / MDF Trained',
  'Ex-Police / MPS Trained',
  'First Aid Certified',
  'Firearm Competency Certificate',
  'K9 Handling Certificate',
  'Bachelor in Security Studies'
];

const statuses: Employee['status'][] = [
  'Active', 'Active', 'Active', 'Active', 'Active', 'Active', 'Active', 'Active',
  'On Leave', 'Suspended'
];
const contracts: Employee['contractType'][] = ['Permanent', 'Permanent', 'Permanent', 'Contract', 'Part-time'];

// Realistic Malawian client sites
export const SITES = [
  'Lilongwe City Centre',
  'Bingu International Airport',
  'Kamuzu Central Hospital',
  'Game Complex',
  'Old Town Mall',
  'Capital Hill',
  'Reserve Bank of Malawi',
  'Crossroads Hotel',
  'Sunbird Capital Hotel',
  'Gateway Mall',
  'City Mall Lilongwe',
  'Standard Bank HQ',
  'NBS Bank Towers',
  'Illovo Sugar Estate',
  'Mzuzu University',
  'Kamuzu International Airport',
  'Blantyre City Centre',
  'Chichiri Shopping Centre',
  'Mount Soche Hotel',
  'Lilongwe University of Agriculture',
  'Malawi Revenue Authority',
  'Castel Brewery',
  'Salima Bay Resort'
];

const shifts = [
  'Morning (06:00-14:00)',
  'Afternoon (14:00-22:00)',
  'Night (22:00-06:00)',
  '24hr Rotation'
];

const supervisors = [
  'William Banda', 'Agnes Phiri', 'Felix Mwale', 'Patricia Chirwa',
  'Charles Mkandawire', 'Florence Gondwe', 'Henry Tembo', 'Catherine Mhone'
];

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function generateEmployees(count: number): Employee[] {
  const rand = seededRandom(42);
  const employees: Employee[] = [];
  const targetCount = Math.max(count, 200);

  for (let i = 1; i <= targetCount; i++) {
    const fn = firstNames[Math.floor(rand() * firstNames.length)];
    const ln = lastNames[Math.floor(rand() * lastNames.length)];
    const age = 22 + Math.floor(rand() * 35);
    const year = 2018 + Math.floor(rand() * 7);
    const month = 1 + Math.floor(rand() * 12);
    const day = 1 + Math.floor(rand() * 28);

    const posData = positions[Math.floor(rand() * positions.length)];
    const salaryRange = posData.salary;
    const basic = salaryRange[0] + Math.floor(rand() * (salaryRange[1] - salaryRange[0]));

    const licenseStatuses: Employee['licenseStatus'][] = ['Valid', 'Valid', 'Valid', 'Valid', 'Valid', 'Expiring', 'Expired'];
    const uniformStatuses: Employee['uniformStatus'][] = ['Issued', 'Issued', 'Issued', 'Issued', 'Pending', 'Damaged'];

    employees.push({
      id: `EMP-${i}`,
      employeeNumber: `SG-${String(1000 + i).padStart(4, '0')}`,
      guardId: `SG-${String(1000 + i).padStart(4, '0')}`,
      fullName: `${fn} ${ln}`,
      dob: `${1970 + Math.floor(rand() * 35)}-${String(1 + Math.floor(rand() * 12)).padStart(2, '0')}-${String(1 + Math.floor(rand() * 28)).padStart(2, '0')}`,
      gender: rand() > 0.3 ? 'Male' : 'Female',
      age,
      nationalId: `${String(Math.floor(rand() * 900000) + 100000)}/${String(Math.floor(rand() * 90) + 10)}`,
      phone: `+265 99${String(Math.floor(rand() * 9000000) + 1000000).slice(0, 7)}`,
      address: `Area ${Math.floor(rand() * 50) + 1}, ${['Lilongwe', 'Blantyre', 'Mzuzu', 'Zomba'][Math.floor(rand() * 4)]}`,
      position: posData.name,
      department: posData.dept,
      qualification: qualifications[Math.floor(rand() * qualifications.length)],
      dateHired: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      basicSalary: basic,
      payPoint: `${['Lilongwe', 'Blantyre', 'Mzuzu'][Math.floor(rand() * 3)]} Branch ${Math.floor(rand() * 5) + 1}`,
      contractType: contracts[Math.floor(rand() * contracts.length)],
      status: statuses[Math.floor(rand() * statuses.length)],
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}@safeguard.mw`,
      emergencyContact: {
        name: `${firstNames[Math.floor(rand() * firstNames.length)]} ${ln}`,
        phone: `+265 88${String(Math.floor(rand() * 9000000) + 1000000).slice(0, 7)}`,
        relationship: ['Spouse', 'Parent', 'Sibling', 'Child'][Math.floor(rand() * 4)]
      },
      supervisor: supervisors[Math.floor(rand() * supervisors.length)],
      deploymentSite: SITES[Math.floor(rand() * SITES.length)],
      shift: shifts[Math.floor(rand() * shifts.length)],
      licenseStatus: licenseStatuses[Math.floor(rand() * licenseStatuses.length)],
      uniformStatus: uniformStatuses[Math.floor(rand() * uniformStatuses.length)]
    });
  }
  return employees;
}

export type Applicant = {
  id: string;
  name: string;
  position: string;
  qualification: string;
  interviewStatus: 'Pending' | 'Shortlisted' | 'Interviewed' | 'Accepted' | 'Rejected' | 'Hired';
  applicationDate: string;
  decision: 'Pending' | 'Hire' | 'Reject';
  phone: string;
  email: string;
  experience: number;
};

// 10 realistic sample applicants with varying statuses
export function generateApplicants(): Applicant[] {
  return [
    {
      id: 'APP-1', name: 'Chilufya Banda', position: 'Security Guard',
      qualification: 'Grade 12 Certificate', interviewStatus: 'Shortlisted',
      applicationDate: '2026-05-15', decision: 'Pending',
      phone: '+265 991234567', email: 'chilufya.banda@email.mw', experience: 3
    },
    {
      id: 'APP-2', name: 'Chimwemwe Phiri', position: 'Patrol Supervisor',
      qualification: 'Diploma in Security Management', interviewStatus: 'Interviewed',
      applicationDate: '2026-05-10', decision: 'Pending',
      phone: '+265 998765432', email: 'chimwemwe.phiri@email.mw', experience: 8
    },
    {
      id: 'APP-3', name: 'Tamanda Mwale', position: 'CCTV Operator',
      qualification: 'Certificate in Security Operations', interviewStatus: 'Accepted',
      applicationDate: '2026-05-08', decision: 'Hire',
      phone: '+265 997654321', email: 'tamanda.mwale@email.mw', experience: 5
    },
    {
      id: 'APP-4', name: 'Yamikani Chirwa', position: 'K9 Handler',
      qualification: 'K9 Handling Certificate', interviewStatus: 'Pending',
      applicationDate: '2026-06-01', decision: 'Pending',
      phone: '+265 996543210', email: 'yamikani.chirwa@email.mw', experience: 6
    },
    {
      id: 'APP-5', name: 'Blessings Mkandawire', position: 'Armed Response Officer',
      qualification: 'Ex-Military / MDF Trained', interviewStatus: 'Interviewed',
      applicationDate: '2026-05-20', decision: 'Pending',
      phone: '+265 995432109', email: 'blessings.mkandawire@email.mw', experience: 12
    },
    {
      id: 'APP-6', name: 'Hope Gondwe', position: 'Control Room Operator',
      qualification: 'Diploma in Security Management', interviewStatus: 'Shortlisted',
      applicationDate: '2026-05-25', decision: 'Pending',
      phone: '+265 994321098', email: 'hope.gondwe@email.mw', experience: 4
    },
    {
      id: 'APP-7', name: 'Faith Mhone', position: 'Site Manager',
      qualification: 'Bachelor in Security Studies', interviewStatus: 'Accepted',
      applicationDate: '2026-04-30', decision: 'Hire',
      phone: '+265 993210987', email: 'faith.mhone@email.mw', experience: 15
    },
    {
      id: 'APP-8', name: 'Lovemore Tembo', position: 'Security Guard',
      qualification: 'Grade 12 Certificate', interviewStatus: 'Rejected',
      applicationDate: '2026-05-05', decision: 'Reject',
      phone: '+265 992109876', email: 'lovemore.tembo@email.mw', experience: 1
    },
    {
      id: 'APP-9', name: 'Wisdom Kumwenda', position: 'Patrol Supervisor',
      qualification: 'Advanced Security Training (PSIRA)', interviewStatus: 'Pending',
      applicationDate: '2026-06-03', decision: 'Pending',
      phone: '+265 991098765', email: 'wisdom.kumwenda@email.mw', experience: 7
    },
    {
      id: 'APP-10', name: 'Mercy Nyirenda', position: 'Administrative Officer',
      qualification: 'Bachelor in Security Studies', interviewStatus: 'Shortlisted',
      applicationDate: '2026-05-28', decision: 'Pending',
      phone: '+265 990987654', email: 'mercy.nyirenda@email.mw', experience: 9
    }
  ];
}

export type AttendanceDay = { day: number; status: 'P' | 'A' | 'L' | 'LV' | 'SL' | '-'; };
export type AttendanceRecord = { employeeId: string; month: string; days: AttendanceDay[]; };

export function generateAttendance(employees: Employee[], month = '2026-06'): AttendanceRecord[] {
  const rand = seededRandom(88);
  return employees.slice(0, 60).map(emp => {
    const days: AttendanceDay[] = [];
    for (let d = 1; d <= 30; d++) {
      const r = rand();
      let status: AttendanceDay['status'] = '-';
      const dow = (d % 7);
      if (dow === 5 || dow === 6) status = '-';
      else if (r < 0.88) status = 'P';
      else if (r < 0.93) status = 'L';
      else if (r < 0.96) status = 'A';
      else if (r < 0.98) status = 'LV';
      else if (r < 1) status = 'SL';
      days.push({ day: d, status });
    }
    return { employeeId: emp.id, month, days };
  });
}

export type PayrollRecord = {
  employeeId: string;
  basic: number;
  allowances: number;
  overtime: number;
  bonus: number;
  paye: number;
  pension: number;
  absenteeism: number;
  otherDeductions: number;
  period: string;
};

export function computePayroll(emp: Employee, period = 'June 2026'): PayrollRecord {
  const basic = emp.basicSalary;
  const allowances = Math.round(basic * 0.1);
  const overtime = Math.round(basic * 0.05);
  const bonus = 0;
  const gross = basic + allowances + overtime + bonus;
  const paye = Math.round(gross * 0.3);
  const pension = Math.round(gross * 0.05);
  return {
    employeeId: emp.id,
    basic, allowances, overtime, bonus,
    paye, pension,
    absenteeism: 0,
    otherDeductions: 0,
    period
  };
}

export function netPay(p: PayrollRecord): number {
  const gross = p.basic + p.allowances + p.overtime + p.bonus;
  return gross - p.paye - p.pension - p.absenteeism - p.otherDeductions;
}

export function grossPay(p: PayrollRecord): number {
  return p.basic + p.allowances + p.overtime + p.bonus;
}

export function formatKwacha(amount: number): string {
  return 'MK ' + amount.toLocaleString('en-MW', { maximumFractionDigits: 0 });
}

export const monthlyPayrollTrend = [
  { month: 'Jan', payroll: 68000000 },
  { month: 'Feb', payroll: 69500000 },
  { month: 'Mar', payroll: 70200000 },
  { month: 'Apr', payroll: 71000000 },
  { month: 'May', payroll: 71800000 },
  { month: 'Jun', payroll: 72500000 }
];

export const monthlyAttendanceTrend = [
  { month: 'Jan', rate: 94.2 },
  { month: 'Feb', rate: 95.1 },
  { month: 'Mar', rate: 93.8 },
  { month: 'Apr', rate: 96.2 },
  { month: 'May', rate: 95.7 },
  { month: 'Jun', rate: 96.8 }
];

export const departmentData = [
  { name: 'Operations', value: 95 },
  { name: 'Patrol', value: 55 },
  { name: 'CCTV Monitoring', value: 35 },
  { name: 'K9 Unit', value: 18 },
  { name: 'Administration', value: 22 }
];

export const employeeGrowth = [
  { year: '2020', employees: 145 },
  { year: '2021', employees: 168 },
  { year: '2022', employees: 192 },
  { year: '2023', employees: 215 },
  { year: '2024', employees: 235 },
  { year: '2025', employees: 245 },
  { year: '2026', employees: 252 }
];
