'use client';

import { useState, useEffect } from 'react';
import {
  Home,
  Users,
  GraduationCap,
  Wrench,
  AlertTriangle,
  TrendingUp,
  Loader2,
  Calendar,
  FileText,
  Briefcase,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/AuthProvider';
import { formatCurrency } from '@/lib/utils';

interface DashboardStats {
  activeHouseholds: number;
  occupiedUnits: number;
  totalUnits: number;
  classEnrollments: number;
  openWorkOrders: number;
  activeBridgeLeases: number;
  pendingFollowups: number;
  monthlyRentCollected: number;
}

interface Activity {
  type: 'payment' | 'work_order' | 'milestone' | 'enrollment' | 'note';
  text: string;
  time: string;
}

interface UrgentItem {
  type: 'work_order' | 'lease' | 'followup';
  text: string;
  priority: 'urgent' | 'high';
}

interface BridgeProgram {
  householdName: string;
  programMonth: number;
  totalMonths: number;
  milestonesCompleted: number;
  totalMilestones: number;
}

export default function Dashboard() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    activeHouseholds: 0,
    occupiedUnits: 0,
    totalUnits: 0,
    classEnrollments: 0,
    openWorkOrders: 0,
    activeBridgeLeases: 0,
    pendingFollowups: 0,
    monthlyRentCollected: 0,
  });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [urgentItems, setUrgentItems] = useState<UrgentItem[]>([]);
  const [bridgePrograms, setBridgePrograms] = useState<BridgeProgram[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      // Fetch all data in parallel
      const [
        householdsRes,
        unitsRes,
        enrollmentsRes,
        workOrdersRes,
        leasesRes,
        caseNotesRes,
        paymentsRes,
      ] = await Promise.all([
        (supabase as any).from('households').select('id').eq('is_active', true),
        (supabase as any).from('units').select('id, status'),
        (supabase as any).from('class_enrollments').select('id').eq('status', 'enrolled'),
        (supabase as any).from('work_orders').select('id, title, priority, unit:units(unit_number, property:properties(name))').in('status', ['open', 'scheduled', 'in_progress']),
        (supabase as any).from('leases').select('id, lease_type, program_month, total_program_months, household:households(name)').eq('status', 'active'),
        (supabase as any).from('case_notes').select('id, content, household:households(name), followup_date').eq('is_followup_required', true).eq('followup_completed', false),
        (supabase as any).from('rent_ledger').select('amount_collected_from_tenant, ledger_month').gte('ledger_month', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      ]);

      // Calculate stats
      const activeHouseholds = householdsRes.data?.length || 0;
      const units = unitsRes.data || [];
      const occupiedUnits = units.filter((u: any) => u.status === 'occupied').length;
      const totalUnits = units.length;
      const classEnrollments = enrollmentsRes.data?.length || 0;
      const openWorkOrders = workOrdersRes.data?.length || 0;
      const leases = leasesRes.data || [];
      const activeBridgeLeases = leases.filter((l: any) => l.lease_type === 'bridge').length;
      const pendingFollowups = caseNotesRes.data?.length || 0;
      const monthlyRentCollected = paymentsRes.data?.reduce((sum: number, p: any) => sum + (p.amount_collected_from_tenant || 0), 0) || 0;

      setStats({
        activeHouseholds,
        occupiedUnits,
        totalUnits,
        classEnrollments,
        openWorkOrders,
        activeBridgeLeases,
        pendingFollowups,
        monthlyRentCollected,
      });

      // Build urgent items
      const urgent: UrgentItem[] = [];

      // Urgent work orders
      workOrdersRes.data?.filter((wo: any) => wo.priority === 'urgent').forEach((wo: any) => {
        urgent.push({
          type: 'work_order',
          text: `Urgent: ${wo.title} - ${wo.unit?.property?.name || 'Unknown'} ${wo.unit?.unit_number || ''}`,
          priority: 'urgent',
        });
      });

      // Overdue follow-ups
      caseNotesRes.data?.filter((cn: any) => cn.followup_date && new Date(cn.followup_date) < new Date()).slice(0, 2).forEach((cn: any) => {
        urgent.push({
          type: 'followup',
          text: `Overdue follow-up: ${cn.household?.name || 'Unknown household'}`,
          priority: 'high',
        });
      });

      setUrgentItems(urgent.slice(0, 4));

      // Build bridge programs
      const bridge = leases.filter((l: any) => l.lease_type === 'bridge' && l.program_month && l.total_program_months).map((l: any) => ({
        householdName: l.household?.name || 'Unknown',
        programMonth: l.program_month,
        totalMonths: l.total_program_months,
        milestonesCompleted: 0, // Would need separate query
        totalMilestones: 9,
      })).slice(0, 3);

      setBridgePrograms(bridge);

      // Recent activity (mock for now - would need activity log table)
      setActivities([
        { type: 'payment', text: 'Rent payment received', time: 'Recently' },
        { type: 'enrollment', text: 'New class enrollment', time: 'Recently' },
        { type: 'work_order', text: 'Work order completed', time: 'Recently' },
      ]);

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const displayName = profile?.first_name || 'there';

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-canmp-green-500" />
        <span className="ml-2 text-gray-500">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>
          Dashboard
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {getGreeting()}, {displayName}. Here&apos;s what&apos;s happening today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card p-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500 mb-1">Active Households</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.activeHouseholds}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
              <Users className="w-6 h-6 text-green-500" />
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500 mb-1">Occupied Units</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.occupiedUnits}
                <span className="text-sm text-gray-400 font-normal">/{stats.totalUnits}</span>
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <Home className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500 mb-1">Class Enrollments</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.classEnrollments}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-purple-500" />
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500 mb-1">Open Work Orders</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.openWorkOrders}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-yellow-50 flex items-center justify-center">
              <Wrench className="w-6 h-6 text-yellow-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Second Row Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card p-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500 mb-1">Bridge Families</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.activeBridgeLeases}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-canmp-green-50 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-canmp-green-500" />
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500 mb-1">Pending Follow-ups</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.pendingFollowups}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center">
              <FileText className="w-6 h-6 text-orange-500" />
            </div>
          </div>
        </div>
        <div className="card p-5 col-span-2">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500 mb-1">Rent Collected This Month</p>
              <p className="text-2xl font-semibold text-gray-900">{formatCurrency(stats.monthlyRentCollected)}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-emerald-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Urgent Items */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-canmp-red-500" />
            <h2 className="font-semibold text-gray-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>
              Needs Attention
            </h2>
          </div>
          <div className="space-y-3">
            {urgentItems.length > 0 ? (
              urgentItems.map((item, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg ${
                    item.priority === 'urgent'
                      ? 'bg-canmp-red-50 border border-canmp-red-100'
                      : 'bg-yellow-50 border border-yellow-100'
                  }`}
                >
                  <p
                    className={`text-sm ${
                      item.priority === 'urgent' ? 'text-canmp-red-700' : 'text-yellow-700'
                    }`}
                  >
                    {item.text}
                  </p>
                </div>
              ))
            ) : (
              <div className="p-3 rounded-lg bg-green-50 border border-green-100">
                <p className="text-sm text-green-700">All caught up! No urgent items.</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card p-5 col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-canmp-green-500" />
            <h2 className="font-semibold text-gray-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>
              Recent Activity
            </h2>
          </div>
          <div className="space-y-3">
            {activities.map((activity, i) => (
              <div
                key={i}
                className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"
              >
                <p className="text-sm text-gray-700">{activity.text}</p>
                <span className="text-xs text-gray-400">{activity.time}</span>
              </div>
            ))}
            {activities.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No recent activity</p>
            )}
          </div>
        </div>
      </div>

      {/* Bridge Program Progress */}
      {bridgePrograms.length > 0 && (
        <div className="mt-6 card p-5">
          <h2 className="font-semibold text-gray-900 mb-4" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            Bridge Program Progress
          </h2>
          <div className="space-y-4">
            {bridgePrograms.map((program, i) => (
              <div key={i} className="flex items-center gap-6">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">{program.householdName}</span>
                    <span className="font-medium">
                      Month {program.programMonth} of {program.totalMonths}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${(program.programMonth / program.totalMonths) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {Math.round((program.programMonth / program.totalMonths) * 100)}% complete
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
