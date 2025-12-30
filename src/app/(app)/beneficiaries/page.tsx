'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, User, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import HouseholdsList from '@/components/modules/beneficiaries/HouseholdsList';

const tabs = [
  { name: 'Households', href: '/beneficiaries', icon: Users },
  { name: 'Individuals', href: '/beneficiaries/individuals', icon: User },
  { name: 'Case Notes', href: '/beneficiaries/notes', icon: FileText },
];

export default function BeneficiariesPage() {
  const pathname = usePathname();

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
      <HouseholdsList />
    </div>
  );
}
