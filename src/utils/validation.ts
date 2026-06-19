// src/utils/validation.ts

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  data?: any;
}

export const validateEmployee = (data: any): ValidationResult => {
  const errors: string[] = [];
  
  // Required fields
  if (!data.fullName || data.fullName.trim().length < 2) {
    errors.push('Full name must be at least 2 characters');
  }
  
  if (data.fullName && data.fullName.length > 100) {
    errors.push('Full name cannot exceed 100 characters');
  }
  
  // Email validation
  if (data.email && data.email.trim() !== '') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      errors.push('Invalid email format');
    }
  }
  
  // Phone number validation (Malawi format)
  if (data.phone && data.phone.trim() !== '') {
    const phoneClean = data.phone.replace(/\s/g, '');
    const phoneRegex = /^(\+265|0)[1-9]\d{7,8}$/;
    if (!phoneRegex.test(phoneClean)) {
      errors.push('Invalid phone number format. Use +265 or 0 followed by 8-9 digits');
    }
  }
  
  // Salary validation
  if (data.basicSalary !== undefined && data.basicSalary !== null) {
    const salary = Number(data.basicSalary);
    if (isNaN(salary) || salary < 0) {
      errors.push('Salary must be a positive number');
    }
    if (salary > 100000000) {
      errors.push('Salary cannot exceed 100,000,000');
    }
  }
  
  // Age validation
  if (data.age !== undefined && data.age !== null) {
    const age = Number(data.age);
    if (isNaN(age) || age < 18 || age > 100) {
      errors.push('Age must be between 18 and 100');
    }
  }
  
  // SQL Injection prevention - check for dangerous characters
  const dangerousPatterns = /['";\\]|--|\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|UNION|CREATE|TRUNCATE|EXEC|EXECUTE)\b/i;
  const fieldsToCheck = ['fullName', 'position', 'department', 'company', 'workstation', 'address', 'qualification'];
  
  fieldsToCheck.forEach(field => {
    if (data[field] && typeof data[field] === 'string') {
      if (dangerousPatterns.test(data[field])) {
        errors.push(`Invalid characters detected in ${field.replace(/([A-Z])/g, ' $1').trim()}`);
      }
    }
  });
  
  // XSS prevention - check for HTML/script tags
  const xssPattern = /<[^>]*>|script:|javascript:|onerror=|onclick=|onload=/i;
  fieldsToCheck.forEach(field => {
    if (data[field] && typeof data[field] === 'string') {
      if (xssPattern.test(data[field])) {
        errors.push(`HTML/Script tags not allowed in ${field.replace(/([A-Z])/g, ' $1').trim()}`);
      }
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  
  return input
    .trim()
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/['";\\]/g, '') // Remove dangerous characters
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|UNION|CREATE|TRUNCATE|EXEC|EXECUTE)\b/gi, '') // Remove SQL keywords
    .slice(0, 500); // Limit length
};

export const sanitizeEmployeeData = (data: any): any => {
  const sanitized = { ...data };
  
  const stringFields = ['fullName', 'position', 'department', 'company', 'workstation', 'address', 'qualification', 'nationalId'];
  
  stringFields.forEach(field => {
    if (sanitized[field] && typeof sanitized[field] === 'string') {
      sanitized[field] = sanitizeInput(sanitized[field]);
    }
  });
  
  if (sanitized.phone) {
    sanitized.phone = sanitized.phone.replace(/[^\d+]/g, '');
  }
  
  if (sanitized.email) {
    sanitized.email = sanitized.email.toLowerCase().trim();
  }
  
  return sanitized;
};