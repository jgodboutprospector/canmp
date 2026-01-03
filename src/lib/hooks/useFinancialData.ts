'use client';

import { useState, useEffect, useCallback } from 'react';

// Aplos Types
export interface AplosFund {
  id: string | number;
  name: string;
  balance?: number;  // Balance may not be provided directly by API
  balance_account_name?: string;
  balance_account_number?: number;
  is_default?: boolean;
}

export interface AplosTransaction {
  id: string | number;
  date: string;
  amount: number;
  memo: string;
  contact?: {
    id: number;
    companyname?: string;
    firstname?: string;
    lastname?: string;
    type: string;
  };
  fund_name?: string;
  account_name?: string;
  type?: 'credit' | 'debit';
  is_reconciled?: boolean;
}

export interface AplosIncomeStatementLine {
  category: string;
  account_name: string;
  current_amount: number;
  ytd_amount: number;
}

export interface AplosTrialBalanceLine {
  account_name: string;
  type: string;
  debit: number;
  credit: number;
  net_balance: number;
}

export interface AplosYoYData {
  month: string;
  currentYear: number;
  previousYear: number;
}

// Ramp Types
export interface RampCard {
  id: string;
  display_name: string;
  last_four: string;
  cardholder_name: string;
  state: 'active' | 'suspended' | 'terminated' | 'pending';
  is_physical: boolean;
  spending_limit: number;
  current_spend: number;
}

export interface RampTransaction {
  id: string;
  amount: number;
  merchant_name: string;
  category: string;
  card_holder_name: string;
  state: 'pending' | 'cleared' | 'declined' | 'refunded';
  transaction_date: string;
}

export interface RampReimbursement {
  id: string;
  user_name: string;
  amount: number;
  merchant: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  transaction_date: string;
  category: string;
}

// Neon CRM Types
export interface NeonDonor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  totalDonations: number;
  donationCount: number;
  lastDonationDate?: string;
  membershipStatus?: 'active' | 'expired' | 'none';
  createdAt: string;
}

export interface NeonDonation {
  id: string;
  donorId: string;
  donorName: string;
  amount: number;
  date: string;
  campaign?: string;
  fund?: string;
  paymentMethod: 'credit_card' | 'check' | 'cash' | 'ach' | 'other';
  status: 'completed' | 'pending' | 'refunded' | 'failed';
  recurring: boolean;
  note?: string;
}

export interface NeonCampaign {
  id: string;
  name: string;
  goal: number;
  raised: number;
  donorCount: number;
  startDate: string;
  endDate?: string;
  status: 'active' | 'completed' | 'draft';
}

export interface NeonMembership {
  id: string;
  donorId: string;
  donorName: string;
  level: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'expired' | 'pending';
  amount: number;
  autoRenew: boolean;
}

// Hook for Aplos data
export function useAplosData(dataType: string, fundId?: string) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ type: dataType });
      if (fundId && fundId !== 'all') {
        params.append('fund_id', fundId);
      }

      const response = await fetch(`/api/financial/aplos?${params}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setIsDemo(result.isDemo);
      } else {
        setError(result.error || 'Failed to fetch data');
      }
    } catch (err) {
      setError('Failed to connect to API');
      console.error('Aplos API error:', err);
    } finally {
      setLoading(false);
    }
  }, [dataType, fundId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, isDemo, refresh: fetchData };
}

// Hook for Ramp data
export function useRampData(dataType: string) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/financial/ramp?type=${dataType}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setIsDemo(result.isDemo);
      } else {
        setError(result.error || 'Failed to fetch data');
      }
    } catch (err) {
      setError('Failed to connect to API');
      console.error('Ramp API error:', err);
    } finally {
      setLoading(false);
    }
  }, [dataType]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, isDemo, refresh: fetchData };
}

// Hook for combined financial dashboard
export function useFinancialDashboard() {
  const [aplosData, setAplosData] = useState<{
    funds: AplosFund[];
    transactions: AplosTransaction[];
    incomeStatement: AplosIncomeStatementLine[];
  } | null>(null);
  const [rampData, setRampData] = useState<{
    cards: RampCard[];
    transactions: RampTransaction[];
    reimbursements: RampReimbursement[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [aplosResponse, rampResponse] = await Promise.all([
        fetch('/api/financial/aplos?type=dashboard'),
        fetch('/api/financial/ramp?type=dashboard'),
      ]);

      const [aplosResult, rampResult] = await Promise.all([
        aplosResponse.json(),
        rampResponse.json(),
      ]);

      if (aplosResult.success) {
        setAplosData(aplosResult.data);
        setIsDemo(aplosResult.isDemo);
      }

      if (rampResult.success) {
        setRampData(rampResult.data);
      }
    } catch (err) {
      setError('Failed to connect to API');
      console.error('Financial API error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    aplosData,
    rampData,
    loading,
    error,
    isDemo,
    refresh: fetchData,
  };
}

// Hook for Neon CRM data
export function useNeonData(dataType: string) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/financial/neon?type=${dataType}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setIsDemo(result.isDemo);
      } else {
        setError(result.error || 'Failed to fetch data');
      }
    } catch (err) {
      setError('Failed to connect to API');
      console.error('Neon API error:', err);
    } finally {
      setLoading(false);
    }
  }, [dataType]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, isDemo, refresh: fetchData };
}
