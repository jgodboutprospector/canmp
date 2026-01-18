/**
 * Unit tests for utility functions
 * Tests formatting, validation, and helper functions
 */

import {
  formatCurrency,
  formatCurrencyDecimal,
  formatPhone,
  formatFullName,
  getInitials,
  formatDate,
  formatDateTime,
  formatRelativeTime,
  isValidEmail,
  isValidPhone,
  pluralize,
  truncate,
  calculateProgress,
  daysUntil,
  cn,
} from '@/lib/utils';

describe('Currency Formatting', () => {
  it('should format currency without decimals', () => {
    expect(formatCurrency(1000)).toBe('$1,000');
    expect(formatCurrency(1234.56)).toBe('$1,235');
    expect(formatCurrency(0)).toBe('$0');
  });

  it('should format currency with decimals', () => {
    expect(formatCurrencyDecimal(1000)).toBe('$1,000.00');
    expect(formatCurrencyDecimal(1234.56)).toBe('$1,234.56');
    expect(formatCurrencyDecimal(0)).toBe('$0.00');
  });

  it('should handle negative amounts', () => {
    expect(formatCurrency(-500)).toBe('-$500');
    expect(formatCurrencyDecimal(-123.45)).toBe('-$123.45');
  });
});

describe('Phone Formatting', () => {
  it('should format 10-digit phone numbers', () => {
    expect(formatPhone('1234567890')).toBe('(123) 456-7890');
    expect(formatPhone('(123) 456-7890')).toBe('(123) 456-7890');
  });

  it('should handle empty or null values', () => {
    expect(formatPhone(null)).toBe('');
    expect(formatPhone(undefined)).toBe('');
    expect(formatPhone('')).toBe('');
  });

  it('should return original for non-10-digit numbers', () => {
    expect(formatPhone('123')).toBe('123');
    expect(formatPhone('12345')).toBe('12345');
  });
});

describe('Name Formatting', () => {
  it('should format full names', () => {
    expect(formatFullName('John', 'Doe')).toBe('John Doe');
    expect(formatFullName('Jane', 'Smith')).toBe('Jane Smith');
  });

  it('should handle empty names', () => {
    expect(formatFullName('', '')).toBe('');
    expect(formatFullName('John', '')).toBe('John');
    expect(formatFullName('', 'Doe')).toBe('Doe');
  });

  it('should get initials', () => {
    expect(getInitials('John', 'Doe')).toBe('JD');
    expect(getInitials('jane', 'smith')).toBe('JS');
  });
});

describe('Date Formatting', () => {
  const testDate = '2024-01-15T12:30:00Z';

  it('should format date', () => {
    const result = formatDate(testDate);
    expect(result).toMatch(/Jan 15, 2024/);
  });

  it('should format date time', () => {
    const result = formatDateTime(testDate);
    expect(result).toMatch(/Jan 15, 2024/);
    expect(result).toMatch(/\d{1,2}:\d{2} (AM|PM)/);
  });

  it('should format relative time', () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const result = formatRelativeTime(yesterday.toISOString());
    expect(result).toMatch(/day ago/);
  });
});

describe('Validation', () => {
  describe('Email validation', () => {
    it('should validate correct emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name+tag@domain.co.uk')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('invalid@')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });
  });

  describe('Phone validation', () => {
    it('should validate 10-digit numbers', () => {
      expect(isValidPhone('1234567890')).toBe(true);
      expect(isValidPhone('(123) 456-7890')).toBe(true);
    });

    it('should validate 11-digit numbers', () => {
      expect(isValidPhone('11234567890')).toBe(true);
    });

    it('should reject invalid numbers', () => {
      expect(isValidPhone('123')).toBe(false);
      expect(isValidPhone('12345')).toBe(false);
    });
  });
});

describe('String Utilities', () => {
  it('should pluralize correctly', () => {
    expect(pluralize(0, 'item')).toBe('items');
    expect(pluralize(1, 'item')).toBe('item');
    expect(pluralize(2, 'item')).toBe('items');
    expect(pluralize(1, 'person', 'people')).toBe('person');
    expect(pluralize(2, 'person', 'people')).toBe('people');
  });

  it('should truncate text', () => {
    expect(truncate('Hello World', 5)).toBe('Hello...');
    expect(truncate('Short', 10)).toBe('Short');
    expect(truncate('Exact', 5)).toBe('Exact');
  });
});

describe('Math Utilities', () => {
  it('should calculate progress percentage', () => {
    expect(calculateProgress(50, 100)).toBe(50);
    expect(calculateProgress(3, 10)).toBe(30);
    expect(calculateProgress(0, 100)).toBe(0);
    expect(calculateProgress(100, 100)).toBe(100);
  });

  it('should handle division by zero', () => {
    expect(calculateProgress(5, 0)).toBe(0);
  });

  it('should calculate days until', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(daysUntil(tomorrow.toISOString())).toBe(1);

    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    expect(daysUntil(nextWeek.toISOString())).toBe(7);
  });
});

describe('Tailwind Class Merging', () => {
  it('should merge classes correctly', () => {
    const result = cn('px-2 py-1', 'px-4');
    expect(result).toBe('py-1 px-4');
  });

  it('should handle conditional classes', () => {
    const result = cn('base-class', true && 'conditional', false && 'excluded');
    expect(result).toContain('base-class');
    expect(result).toContain('conditional');
    expect(result).not.toContain('excluded');
  });
});
