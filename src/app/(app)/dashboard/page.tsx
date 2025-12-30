'use client';

import { Home, Users, GraduationCap, Wrench, AlertTriangle, TrendingUp } from 'lucide-react';

const stats = [
  { label: 'Active Households', value: '6', icon: Users, color: 'green' },
  { label: 'Occupied Units', value: '4', icon: Home, color: 'blue' },
  { label: 'Class Enrollments', value: '38', icon: GraduationCap, color: 'purple' },
  { label: 'Open Work Orders', value: '3', icon: Wrench, color: 'yellow' },
];

const recentActivity = [
  { type: 'payment', text: 'Aldeek Family paid December rent', time: '2 hours ago' },
  { type: 'work_order', text: 'New work order: Furnace not heating (Bozan Family)', time: '5 hours ago' },
  { type: 'milestone', text: 'Okonkwo Family completed Credit Building milestone', time: '1 day ago' },
  { type: 'enrollment', text: 'Amara Okonkwo enrolled in Tuesday Basic class', time: '2 days ago' },
];

const urgentItems = [
  { type: 'work_order', text: 'Urgent: Furnace not heating - 12 Chapel Street', priority: 'urgent' },
  { type: 'lease', text: 'Posso Family lease expiring in 45 days', priority: 'high' },
];

export default function Dashboard() {
  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back, Jon. Here&apos;s what&apos;s happening today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => (
          <div key={stat.label} className="card p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
                <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                stat.color === 'green' ? 'bg-green-50' :
                stat.color === 'blue' ? 'bg-blue-50' :
                stat.color === 'purple' ? 'bg-purple-50' :
                'bg-yellow-50'
              }`}>
                <stat.icon className={`w-6 h-6 ${
                  stat.color === 'green' ? 'text-green-500' :
                  stat.color === 'blue' ? 'text-blue-500' :
                  stat.color === 'purple' ? 'text-purple-500' :
                  'text-yellow-500'
                }`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Urgent Items */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-canmp-red-500" />
            <h2 className="font-semibold text-gray-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>Needs Attention</h2>
          </div>
          <div className="space-y-3">
            {urgentItems.map((item, i) => (
              <div
                key={i}
                className="p-3 rounded-lg bg-canmp-red-50 border border-canmp-red-100"
              >
                <p className="text-sm text-canmp-red-700">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card p-5 col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-canmp-green-500" />
            <h2 className="font-semibold text-gray-900" style={{ fontFamily: 'DM Sans, sans-serif' }}>Recent Activity</h2>
          </div>
          <div className="space-y-3">
            {recentActivity.map((activity, i) => (
              <div
                key={i}
                className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"
              >
                <p className="text-sm text-gray-700">{activity.text}</p>
                <span className="text-xs text-gray-400">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mt-6 card p-5">
        <h2 className="font-semibold text-gray-900 mb-4" style={{ fontFamily: 'DM Sans, sans-serif' }}>Bridge Program Progress</h2>
        <div className="flex items-center gap-6">
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Okonkwo Family</span>
              <span className="font-medium">Month 8 of 24</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: '33%' }} />
            </div>
            <p className="text-xs text-gray-500 mt-1">5 of 9 milestones completed</p>
          </div>
        </div>
      </div>
    </div>
  );
}
