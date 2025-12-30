'use client';

import { Bell, Search } from 'lucide-react';

export default function Header() {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search households, properties, work orders..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 text-sm placeholder:text-gray-400 focus:outline-none focus:border-canmp-green-500 focus:ring-2 focus:ring-canmp-green-500/20"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Site selector */}
        <select className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:border-canmp-green-500">
          <option value="waterville">Waterville</option>
          <option value="augusta">Augusta</option>
          <option value="all">All Sites</option>
        </select>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <Bell className="w-5 h-5 text-gray-600" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-canmp-red-500 rounded-full" />
        </button>
      </div>
    </header>
  );
}
