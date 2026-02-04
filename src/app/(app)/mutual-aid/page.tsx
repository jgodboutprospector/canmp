'use client';

import { useState } from 'react';
import { Car, UtensilsCrossed, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import TransportationList from '@/components/modules/mutual-aid/TransportationList';

const tabs = [
  { id: 'transportation', name: 'Transportation', icon: Car },
  { id: 'food', name: 'Food Pantry', icon: UtensilsCrossed, disabled: true },
  { id: 'equipment', name: 'Equipment', icon: Package, disabled: true },
];

export default function MutualAidPage() {
  const [activeTab, setActiveTab] = useState('transportation');

  return (
    <div>
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 bg-white px-6">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && setActiveTab(tab.id)}
              disabled={tab.disabled}
              className={cn(
                'flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                activeTab === tab.id
                  ? 'border-canmp-green-500 text-canmp-green-600'
                  : tab.disabled
                    ? 'border-transparent text-gray-300 cursor-not-allowed'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.name}
              {tab.disabled && (
                <span className="ml-1 text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">
                  Coming Soon
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'transportation' && <TransportationList />}
    </div>
  );
}
