'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, Clock, Loader2, Award, TrendingUp, Calendar, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHoursSummary } from '@/lib/hooks/useVolunteers';

const tabs = [
  { name: 'Volunteers', href: '/volunteers', icon: Users },
  { name: 'Hours Summary', href: '/volunteers/hours', icon: Clock },
  { name: 'Requests', href: '/volunteers/requests', icon: FileText },
];

export default function HoursSummaryPage() {
  const pathname = usePathname();
  const { summary, loading, error } = useHoursSummary();

  // Calculate totals
  const totalHours = summary.reduce((sum, v) => sum + v.total_hours, 0);
  const totalEntries = summary.reduce((sum, v) => sum + v.total_entries, 0);
  const hoursThisMonth = summary.reduce((sum, v) => sum + v.hours_this_month, 0);
  const hoursThisYear = summary.reduce((sum, v) => sum + v.hours_this_year, 0);
  const activeVolunteers = summary.filter((v) => v.is_active).length;

  return (
    <div className="min-h-full">
      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200 px-6">
        <nav className="flex gap-0">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={cn(
                  'flex items-center gap-2 px-5 py-4 text-sm font-medium border-b-2 transition-colors',
                  isActive
                    ? 'border-canmp-green-500 text-canmp-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1
            className="text-xl font-semibold text-gray-900"
            style={{ fontFamily: 'DM Sans, sans-serif' }}
          >
            Volunteer Hours Summary
          </h1>
          <p className="text-sm text-gray-500">
            Track and analyze volunteer contributions
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-canmp-green-500" />
            <span className="ml-2 text-gray-500">Loading summary...</span>
          </div>
        ) : error ? (
          <div className="card p-6 bg-red-50 border-red-200">
            <p className="text-red-600 font-medium">Error loading summary</p>
            <p className="text-red-500 text-sm mt-1">{error}</p>
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-5 gap-4 mb-6">
              <div className="card p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <p className="text-sm text-gray-500">Total Hours</p>
                </div>
                <p className="text-2xl font-semibold">{totalHours.toFixed(1)}</p>
              </div>
              <div className="card p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-canmp-green-500" />
                  <p className="text-sm text-gray-500">This Month</p>
                </div>
                <p className="text-2xl font-semibold text-canmp-green-600">{hoursThisMonth.toFixed(1)}</p>
              </div>
              <div className="card p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  <p className="text-sm text-gray-500">This Year</p>
                </div>
                <p className="text-2xl font-semibold text-blue-600">{hoursThisYear.toFixed(1)}</p>
              </div>
              <div className="card p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-purple-500" />
                  <p className="text-sm text-gray-500">Active Volunteers</p>
                </div>
                <p className="text-2xl font-semibold text-purple-600">{activeVolunteers}</p>
              </div>
              <div className="card p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Award className="w-4 h-4 text-amber-500" />
                  <p className="text-sm text-gray-500">Log Entries</p>
                </div>
                <p className="text-2xl font-semibold text-amber-600">{totalEntries}</p>
              </div>
            </div>

            {/* Leaderboard Table */}
            <div className="card">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="font-medium text-gray-900">Hours Leaderboard</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rank
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Volunteer
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Hours
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        This Month
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        This Year
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Entries
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Active
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {summary.map((volunteer, index) => (
                      <tr key={volunteer.volunteer_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {index < 3 ? (
                              <span className={cn(
                                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white',
                                index === 0 ? 'bg-amber-500' :
                                index === 1 ? 'bg-gray-400' :
                                'bg-amber-700'
                              )}>
                                {index + 1}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-500">{index + 1}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-canmp-green-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-canmp-green-700">
                                {volunteer.first_name[0]}{volunteer.last_name[0]}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {volunteer.first_name} {volunteer.last_name}
                              </p>
                              {volunteer.email && (
                                <p className="text-xs text-gray-500">{volunteer.email}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-sm font-semibold text-gray-900">
                            {volunteer.total_hours.toFixed(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className={cn(
                            'text-sm',
                            volunteer.hours_this_month > 0 ? 'text-canmp-green-600 font-medium' : 'text-gray-400'
                          )}>
                            {volunteer.hours_this_month.toFixed(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className={cn(
                            'text-sm',
                            volunteer.hours_this_year > 0 ? 'text-blue-600 font-medium' : 'text-gray-400'
                          )}>
                            {volunteer.hours_this_year.toFixed(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-sm text-gray-500">
                            {volunteer.total_entries}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {volunteer.last_volunteer_date ? (
                            <span className="text-sm text-gray-500">
                              {new Date(volunteer.last_volunteer_date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">Never</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {summary.length === 0 && (
                <div className="p-12 text-center text-gray-400">
                  No volunteer hours have been logged yet.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
