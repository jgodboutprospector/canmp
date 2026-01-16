/**
 * Utilities for exporting financial data to CSV format
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExportableData = Record<string, any>;

interface ExportOptions {
  filename: string;
  headers?: Record<string, string>; // Map column keys to display names
}

/**
 * Converts data to CSV format and triggers download
 */
export function exportToCSV(
  data: ExportableData[],
  options: ExportOptions
): void {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  const { filename, headers } = options;

  // Get all keys from the first object, or use provided headers
  const keys = headers ? Object.keys(headers) : Object.keys(data[0]);
  const headerRow = headers
    ? keys.map(k => headers[k])
    : keys;

  // Build CSV content
  const csvRows: string[] = [];

  // Add header row
  csvRows.push(headerRow.map(escapeCSVValue).join(','));

  // Add data rows
  for (const row of data) {
    const values = keys.map(key => {
      const value = row[key];
      return escapeCSVValue(formatValue(value));
    });
    csvRows.push(values.join(','));
  }

  const csvContent = csvRows.join('\n');
  downloadFile(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;');
}

/**
 * Escape a value for CSV format
 */
function escapeCSVValue(value: string): string {
  if (value === null || value === undefined) {
    return '';
  }
  const stringValue = String(value);
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

/**
 * Format a value for export
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }
  return String(value);
}

/**
 * Trigger file download
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Pre-defined export configurations for financial data

export const aplosTransactionsExportConfig = {
  headers: {
    date: 'Date',
    memo: 'Description',
    amount: 'Amount',
    type: 'Type',
    fund_name: 'Fund',
    account_name: 'Account',
  },
};

export const aplosIncomeStatementExportConfig = {
  headers: {
    category: 'Category',
    account_name: 'Account',
    current_amount: 'Current Period',
    ytd_amount: 'Year to Date',
  },
};

export const aplosTrialBalanceExportConfig = {
  headers: {
    account_name: 'Account',
    type: 'Type',
    debit: 'Debit',
    credit: 'Credit',
    net_balance: 'Net Balance',
  },
};

export const rampTransactionsExportConfig = {
  headers: {
    transaction_date: 'Date',
    merchant_name: 'Merchant',
    amount: 'Amount',
    category: 'Category',
    card_holder_name: 'Card Holder',
    state: 'Status',
  },
};

export const rampCardsExportConfig = {
  headers: {
    display_name: 'Card Name',
    last_four: 'Last 4 Digits',
    cardholder_name: 'Card Holder',
    state: 'Status',
    spending_limit: 'Spending Limit',
    current_spend: 'Current Spend',
  },
};

export const rampReimbursementsExportConfig = {
  headers: {
    transaction_date: 'Date',
    user_name: 'Employee',
    merchant: 'Merchant',
    amount: 'Amount',
    category: 'Category',
    status: 'Status',
  },
};

export const neonDonationsExportConfig = {
  headers: {
    date: 'Date',
    donorName: 'Donor',
    amount: 'Amount',
    campaign: 'Campaign',
    fund: 'Fund',
    paymentMethod: 'Payment Method',
    status: 'Status',
    recurring: 'Recurring',
  },
};

export const neonDonorsExportConfig = {
  headers: {
    firstName: 'First Name',
    lastName: 'Last Name',
    email: 'Email',
    totalDonations: 'Total Donations',
    donationCount: 'Donation Count',
    lastDonationDate: 'Last Donation',
    membershipStatus: 'Membership Status',
  },
};

export const neonCampaignsExportConfig = {
  headers: {
    name: 'Campaign Name',
    goal: 'Goal',
    raised: 'Raised',
    donorCount: 'Donors',
    startDate: 'Start Date',
    endDate: 'End Date',
    status: 'Status',
  },
};

export const neonMembershipsExportConfig = {
  headers: {
    donorName: 'Member',
    level: 'Level',
    amount: 'Amount',
    startDate: 'Start Date',
    endDate: 'End Date',
    status: 'Status',
    autoRenew: 'Auto Renew',
  },
};
