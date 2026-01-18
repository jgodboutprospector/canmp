/**
 * Unit tests for audit logging utilities
 */

import {
  computeChanges,
  formatFieldName,
  formatEntityType,
  formatAction,
  getActionColor,
} from '@/lib/audit';

describe('Audit Utility Functions', () => {
  describe('computeChanges', () => {
    it('should detect changes between objects', () => {
      const oldValues = { name: 'John', age: 30, city: 'NYC' };
      const newValues = { name: 'John', age: 31, city: 'LA' };
      const changes = computeChanges(oldValues, newValues);

      expect(changes.name).toBeUndefined();
      expect(changes.age).toEqual({ from: 30, to: 31 });
      expect(changes.city).toEqual({ from: 'NYC', to: 'LA' });
    });

    it('should handle new fields', () => {
      const oldValues = { name: 'John' };
      const newValues = { name: 'John', email: 'john@example.com' };
      const changes = computeChanges(oldValues, newValues);

      expect(changes.email).toEqual({ from: undefined, to: 'john@example.com' });
    });

    it('should handle deleted fields', () => {
      const oldValues = { name: 'John', temp: 'value' };
      const newValues = { name: 'John' };
      const changes = computeChanges(oldValues, newValues);

      expect(changes.temp).toEqual({ from: 'value', to: undefined });
    });

    it('should handle null and undefined', () => {
      const oldValues = { field1: null, field2: 'value' };
      const newValues = { field1: 'value', field2: null };
      const changes = computeChanges(oldValues, newValues);

      expect(changes.field1).toEqual({ from: null, to: 'value' });
      expect(changes.field2).toEqual({ from: 'value', to: null });
    });

    it('should return empty object when no changes', () => {
      const oldValues = { name: 'John', age: 30 };
      const newValues = { name: 'John', age: 30 };
      const changes = computeChanges(oldValues, newValues);

      expect(Object.keys(changes).length).toBe(0);
    });
  });

  describe('formatFieldName', () => {
    it('should format snake_case to Title Case', () => {
      expect(formatFieldName('first_name')).toBe('First Name');
      expect(formatFieldName('email_address')).toBe('Email Address');
      expect(formatFieldName('is_active')).toBe('Is Active');
    });

    it('should handle single words', () => {
      expect(formatFieldName('name')).toBe('Name');
      expect(formatFieldName('email')).toBe('Email');
    });
  });

  describe('formatEntityType', () => {
    it('should format entity types correctly', () => {
      expect(formatEntityType('household')).toBe('Household');
      expect(formatEntityType('beneficiary')).toBe('Individual');
      expect(formatEntityType('case_note')).toBe('Case Note');
      expect(formatEntityType('work_order')).toBe('Work Order');
      expect(formatEntityType('class_section')).toBe('Class');
      expect(formatEntityType('donation_item')).toBe('Donation Item');
    });
  });

  describe('formatAction', () => {
    it('should format actions correctly', () => {
      expect(formatAction('create')).toBe('Created');
      expect(formatAction('update')).toBe('Updated');
      expect(formatAction('delete')).toBe('Deleted');
      expect(formatAction('view')).toBe('Viewed');
      expect(formatAction('login')).toBe('Logged In');
      expect(formatAction('logout')).toBe('Logged Out');
    });
  });

  describe('getActionColor', () => {
    it('should return correct colors for actions', () => {
      expect(getActionColor('create')).toContain('green');
      expect(getActionColor('update')).toContain('blue');
      expect(getActionColor('delete')).toContain('red');
      expect(getActionColor('view')).toContain('gray');
      expect(getActionColor('login')).toContain('purple');
      expect(getActionColor('logout')).toContain('orange');
    });

    it('should have fallback for unknown actions', () => {
      // @ts-expect-error testing invalid action
      const color = getActionColor('invalid');
      expect(color).toContain('gray');
    });
  });
});
