import {
  cn,
  formatCurrency,
  formatCurrencyDecimal,
  formatPhone,
  formatFullName,
  getInitials,
  getLeaseTypeLabel,
  getLeaseStatusLabel,
  getWorkOrderStatusLabel,
  getPriorityLabel,
  getLeaseTypeBadgeVariant,
  getStatusBadgeVariant,
  getPriorityBadgeVariant,
  getCategoryEmoji,
  isValidEmail,
  isValidPhone,
  pluralize,
  truncate,
  calculateProgress,
} from '@/lib/utils';

describe('cn utility', () => {
  it('should merge class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('should handle conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
  });

  it('should handle undefined values', () => {
    expect(cn('foo', undefined, 'bar')).toBe('foo bar');
  });

  it('should handle empty strings', () => {
    expect(cn('foo', '', 'bar')).toBe('foo bar');
  });

  it('should merge Tailwind classes properly', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });

  it('should handle array of classes', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar');
  });

  it('should handle object syntax', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
  });
});

describe('formatCurrency', () => {
  it('should format positive amounts', () => {
    expect(formatCurrency(1000)).toBe('$1,000');
    expect(formatCurrency(1234567)).toBe('$1,234,567');
  });

  it('should format zero', () => {
    expect(formatCurrency(0)).toBe('$0');
  });

  it('should format negative amounts', () => {
    expect(formatCurrency(-500)).toBe('-$500');
  });

  it('should round decimals to whole numbers', () => {
    expect(formatCurrency(1234.56)).toBe('$1,235');
    expect(formatCurrency(1234.49)).toBe('$1,234');
  });
});

describe('formatCurrencyDecimal', () => {
  it('should format with decimal places', () => {
    expect(formatCurrencyDecimal(1234.56)).toBe('$1,234.56');
  });

  it('should add decimal places to whole numbers', () => {
    expect(formatCurrencyDecimal(1000)).toBe('$1,000.00');
  });
});

describe('formatPhone', () => {
  it('should format 10 digit phone numbers', () => {
    expect(formatPhone('2075551234')).toBe('(207) 555-1234');
  });

  it('should handle phone numbers with formatting', () => {
    expect(formatPhone('207-555-1234')).toBe('(207) 555-1234');
  });

  it('should return original for non-10-digit numbers', () => {
    expect(formatPhone('12345')).toBe('12345');
  });

  it('should return empty string for null/undefined', () => {
    expect(formatPhone(null)).toBe('');
    expect(formatPhone(undefined)).toBe('');
  });
});

describe('formatFullName', () => {
  it('should combine first and last names', () => {
    expect(formatFullName('John', 'Doe')).toBe('John Doe');
  });

  it('should handle empty strings', () => {
    expect(formatFullName('John', '')).toBe('John');
    expect(formatFullName('', 'Doe')).toBe('Doe');
  });
});

describe('getInitials', () => {
  it('should return uppercase initials', () => {
    expect(getInitials('John', 'Doe')).toBe('JD');
    expect(getInitials('jane', 'smith')).toBe('JS');
  });
});

describe('Label helpers', () => {
  describe('getLeaseTypeLabel', () => {
    it('should return correct labels', () => {
      expect(getLeaseTypeLabel('canmp_direct')).toBe('CANMP Direct');
      expect(getLeaseTypeLabel('master_sublease')).toBe('Master Sublease');
      expect(getLeaseTypeLabel('bridge')).toBe('Bridge Program');
    });

    it('should return original for unknown types', () => {
      expect(getLeaseTypeLabel('unknown')).toBe('unknown');
    });
  });

  describe('getLeaseStatusLabel', () => {
    it('should return correct labels', () => {
      expect(getLeaseStatusLabel('active')).toBe('Active');
      expect(getLeaseStatusLabel('completed')).toBe('Completed');
      expect(getLeaseStatusLabel('terminated')).toBe('Terminated');
      expect(getLeaseStatusLabel('pending')).toBe('Pending');
    });
  });

  describe('getWorkOrderStatusLabel', () => {
    it('should return correct labels', () => {
      expect(getWorkOrderStatusLabel('open')).toBe('Open');
      expect(getWorkOrderStatusLabel('in_progress')).toBe('In Progress');
      expect(getWorkOrderStatusLabel('completed')).toBe('Completed');
    });
  });

  describe('getPriorityLabel', () => {
    it('should return correct labels', () => {
      expect(getPriorityLabel('urgent')).toBe('Urgent');
      expect(getPriorityLabel('high')).toBe('High');
      expect(getPriorityLabel('medium')).toBe('Medium');
      expect(getPriorityLabel('low')).toBe('Low');
    });
  });
});

describe('Badge variant helpers', () => {
  describe('getLeaseTypeBadgeVariant', () => {
    it('should return correct variants', () => {
      expect(getLeaseTypeBadgeVariant('canmp_direct')).toBe('info');
      expect(getLeaseTypeBadgeVariant('bridge')).toBe('success');
      expect(getLeaseTypeBadgeVariant('unknown')).toBe('default');
    });
  });

  describe('getStatusBadgeVariant', () => {
    it('should return correct variants', () => {
      expect(getStatusBadgeVariant('active')).toBe('success');
      expect(getStatusBadgeVariant('terminated')).toBe('danger');
      expect(getStatusBadgeVariant('pending')).toBe('warning');
    });
  });

  describe('getPriorityBadgeVariant', () => {
    it('should return correct variants', () => {
      expect(getPriorityBadgeVariant('urgent')).toBe('danger');
      expect(getPriorityBadgeVariant('high')).toBe('warning');
      expect(getPriorityBadgeVariant('low')).toBe('default');
    });
  });
});

describe('getCategoryEmoji', () => {
  it('should return correct emojis', () => {
    expect(getCategoryEmoji('plumbing')).toBe('🔧');
    expect(getCategoryEmoji('electrical')).toBe('⚡');
    expect(getCategoryEmoji('hvac')).toBe('❄️');
  });

  it('should return default emoji for unknown categories', () => {
    expect(getCategoryEmoji('unknown')).toBe('📋');
  });
});

describe('Validation helpers', () => {
  describe('isValidEmail', () => {
    it('should validate correct emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.org')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('no@domain')).toBe(false);
      expect(isValidEmail('@nodomain.com')).toBe(false);
    });
  });

  describe('isValidPhone', () => {
    it('should validate 10-digit phones', () => {
      expect(isValidPhone('2075551234')).toBe(true);
      expect(isValidPhone('(207) 555-1234')).toBe(true);
    });

    it('should validate 11-digit phones', () => {
      expect(isValidPhone('12075551234')).toBe(true);
    });

    it('should reject invalid phones', () => {
      expect(isValidPhone('12345')).toBe(false);
      expect(isValidPhone('123456789012')).toBe(false);
    });
  });
});

describe('pluralize', () => {
  it('should return singular for count of 1', () => {
    expect(pluralize(1, 'item')).toBe('item');
    expect(pluralize(1, 'child', 'children')).toBe('child');
  });

  it('should return plural for other counts', () => {
    expect(pluralize(0, 'item')).toBe('items');
    expect(pluralize(2, 'item')).toBe('items');
    expect(pluralize(5, 'child', 'children')).toBe('children');
  });
});

describe('truncate', () => {
  it('should truncate long text', () => {
    expect(truncate('This is a long text', 10)).toBe('This is a ...');
  });

  it('should not truncate short text', () => {
    expect(truncate('Short', 10)).toBe('Short');
  });

  it('should handle exact length', () => {
    expect(truncate('Exactly10', 9)).toBe('Exactly10');
  });
});

describe('calculateProgress', () => {
  it('should calculate percentage correctly', () => {
    expect(calculateProgress(50, 100)).toBe(50);
    expect(calculateProgress(1, 4)).toBe(25);
    expect(calculateProgress(3, 4)).toBe(75);
  });

  it('should return 0 for zero total', () => {
    expect(calculateProgress(5, 0)).toBe(0);
  });

  it('should round to nearest integer', () => {
    expect(calculateProgress(1, 3)).toBe(33);
    expect(calculateProgress(2, 3)).toBe(67);
  });
});
