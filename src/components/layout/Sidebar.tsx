'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Home,
  Users,
  GraduationCap,
  Briefcase,
  Settings,
  LogOut,
  Heart,
  Calendar,
  UserHeart,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/providers/AuthProvider';

// Navigation items with role restrictions
const allNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'case_manager', 'teacher', 'volunteer', 'viewer'] },
  { name: 'Housing', href: '/housing', icon: Home, roles: ['admin', 'case_manager'] },
  { name: 'Beneficiaries', href: '/beneficiaries', icon: Users, roles: ['admin', 'case_manager'] },
  { name: 'Language Program', href: '/language', icon: GraduationCap, roles: ['admin', 'case_manager', 'teacher'] },
  { name: 'Workforce', href: '/workforce', icon: Briefcase, roles: ['admin', 'case_manager'] },
  { name: 'Mentor Teams', href: '/mentors', icon: UserHeart, roles: ['admin', 'case_manager', 'volunteer'] },
  { name: 'Events', href: '/events', icon: Calendar, roles: ['admin', 'case_manager', 'teacher', 'volunteer'] },
];

const adminNav = [
  { name: 'User Management', href: '/admin/users', icon: Shield, roles: ['admin'] },
];

const bottomNav = [
  { name: 'Settings', href: '/settings', icon: Settings, roles: ['admin', 'case_manager', 'teacher', 'volunteer', 'viewer'] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { profile, signOut, isAdmin } = useAuth();

  // Filter navigation based on user role
  const role = profile?.role || 'viewer';
  const navigation = allNavigation.filter(item => item.roles.includes(role));

  // Get user initials
  const getInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    if (profile?.email) {
      return profile.email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  // Get display name
  const getDisplayName = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    return profile?.email || 'User';
  };

  // Get role display
  const getRoleDisplay = () => {
    const roleLabels: Record<string, string> = {
      admin: 'Administrator',
      case_manager: 'Case Manager',
      teacher: 'Teacher',
      volunteer: 'Volunteer',
      viewer: 'Viewer',
    };
    return roleLabels[role] || 'User';
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-gray-200">
        <div className="w-10 h-10 rounded-xl bg-canmp-green-500 flex items-center justify-center">
          <Heart className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-canmp-green-600 text-lg leading-tight" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            CANMP
          </h1>
          <p className="text-xs text-gray-500">Case Management</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-canmp-green-50 text-canmp-green-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}

        {/* Admin section */}
        {isAdmin && (
          <>
            <div className="pt-4 pb-2">
              <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Admin
              </p>
            </div>
            {adminNav.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-canmp-green-50 text-canmp-green-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* Bottom Navigation */}
      <div className="px-3 py-4 border-t border-gray-200 space-y-1">
        {bottomNav.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-canmp-green-50 text-canmp-green-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}

        {/* Logout */}
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Log Out
        </button>
      </div>

      {/* User Info */}
      <div className="px-4 py-4 border-t border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-canmp-green-100 flex items-center justify-center">
            <span className="text-sm font-semibold text-canmp-green-700">{getInitials()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{getDisplayName()}</p>
            <p className="text-xs text-gray-500 truncate">{getRoleDisplay()}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
