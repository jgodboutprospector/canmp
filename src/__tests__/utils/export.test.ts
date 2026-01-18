/**
 * Unit tests for CSV export utilities
 */

import { exportToCSV } from '@/lib/utils/export';

// Mock DOM elements for testing
let createdElements: HTMLAnchorElement[] = [];

beforeEach(() => {
  createdElements = [];

  // Mock document.createElement
  const originalCreateElement = document.createElement.bind(document);
  jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
    const element = originalCreateElement(tagName) as HTMLAnchorElement;
    if (tagName === 'a') {
      createdElements.push(element);
    }
    return element;
  });

  // Mock document.body.appendChild
  jest.spyOn(document.body, 'appendChild').mockImplementation((node) => node);

  // Mock document.body.removeChild
  jest.spyOn(document.body, 'removeChild').mockImplementation((node) => node);

  // Mock URL.createObjectURL
  global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
  global.URL.revokeObjectURL = jest.fn();

  // Mock alert
  global.alert = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('exportToCSV', () => {
  const testData = [
    { id: 1, name: 'John Doe', email: 'john@example.com', amount: 100 },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', amount: 200 },
  ];

  it('should create a download link with correct filename', () => {
    exportToCSV(testData, { filename: 'test-export' });

    expect(createdElements.length).toBe(1);
    const link = createdElements[0];
    expect(link.download).toBe('test-export.csv');
    expect(link.href).toBe('blob:mock-url');
  });

  it('should generate CSV with headers from data keys', () => {
    const blobSpy = jest.spyOn(global, 'Blob');

    exportToCSV(testData, { filename: 'test' });

    expect(blobSpy).toHaveBeenCalled();
    const csvContent = blobSpy.mock.calls[0][0][0];
    expect(csvContent).toContain('id,name,email,amount');
    expect(csvContent).toContain('1,John Doe,john@example.com,100');
    expect(csvContent).toContain('2,Jane Smith,jane@example.com,200');
  });

  it('should use custom headers when provided', () => {
    const blobSpy = jest.spyOn(global, 'Blob');
    const headers = {
      id: 'ID',
      name: 'Full Name',
      email: 'Email Address',
      amount: 'Amount',
    };

    exportToCSV(testData, { filename: 'test', headers });

    const csvContent = blobSpy.mock.calls[0][0][0];
    expect(csvContent).toContain('ID,Full Name,Email Address,Amount');
  });

  it('should escape CSV values with commas', () => {
    const blobSpy = jest.spyOn(global, 'Blob');
    const data = [{ name: 'Smith, John', note: 'Hello, World' }];

    exportToCSV(data, { filename: 'test' });

    const csvContent = blobSpy.mock.calls[0][0][0];
    expect(csvContent).toContain('"Smith, John"');
    expect(csvContent).toContain('"Hello, World"');
  });

  it('should escape quotes in CSV values', () => {
    const blobSpy = jest.spyOn(global, 'Blob');
    const data = [{ comment: 'He said "hello"' }];

    exportToCSV(data, { filename: 'test' });

    const csvContent = blobSpy.mock.calls[0][0][0];
    expect(csvContent).toContain('"He said ""hello"""');
  });

  it('should handle null and undefined values', () => {
    const blobSpy = jest.spyOn(global, 'Blob');
    const data = [{ name: 'John', email: null, phone: undefined }];

    exportToCSV(data, { filename: 'test' });

    const csvContent = blobSpy.mock.calls[0][0][0];
    expect(csvContent).toContain('John,,');
  });

  it('should format boolean values as Yes/No', () => {
    const blobSpy = jest.spyOn(global, 'Blob');
    const data = [{ active: true, verified: false }];

    exportToCSV(data, { filename: 'test' });

    const csvContent = blobSpy.mock.calls[0][0][0];
    expect(csvContent).toContain('Yes');
    expect(csvContent).toContain('No');
  });

  it('should format dates correctly', () => {
    const blobSpy = jest.spyOn(global, 'Blob');
    const testDate = new Date('2024-01-15T12:30:00Z');
    const data = [{ date: testDate }];

    exportToCSV(data, { filename: 'test' });

    const csvContent = blobSpy.mock.calls[0][0][0];
    expect(csvContent).toContain('2024-01-15');
  });

  it('should alert when no data provided', () => {
    exportToCSV([], { filename: 'test' });

    expect(global.alert).toHaveBeenCalledWith('No data to export');
    expect(createdElements.length).toBe(0);
  });

  it('should cleanup created elements and URLs', () => {
    exportToCSV(testData, { filename: 'test' });

    expect(document.body.appendChild).toHaveBeenCalled();
    expect(document.body.removeChild).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });
});
