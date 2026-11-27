'use client';

import { useState } from 'react';
import PortalShell from '../portal/PortalShell';
import {
  BackendRequirementNotice,
  PortalEmptyState,
} from '../portal/PortalStates';
import { useThemePreference } from '../../hooks/useThemePreference';

export default function AdminComplaintsView() {
  const { preference, setPreference } = useThemePreference();
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <PortalShell
      role="admin"
      activeNav="complaints"
      themePreference={preference}
      onThemeChange={setPreference}
    >
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            Complaints &amp; Disputes
          </h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm dark:text-slate-400">
            Review bidder and host disputes with server-verified resolution tracking.
          </p>
        </div>

        <BackendRequirementNotice
          accent="purple"
          title="Backend Complaints & Disputes API not implemented yet"
          description="No complaints table or /api/admin/complaints endpoints exist in the backend. No sample complaints are fabricated, and resolution updates require backend confirmation."
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div role="tablist" className="flex flex-wrap gap-2">
            {[
              { id: 'ALL', label: 'All (0)' },
              { id: 'OPEN', label: 'Open (0)' },
              { id: 'IN_REVIEW', label: 'In Review (0)' },
              { id: 'RESOLVED', label: 'Resolved (0)' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={statusFilter === tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                  statusFilter === tab.id
                    ? 'bg-purple-600 text-white dark:bg-purple-500'
                    : 'border border-auctionme-lightBorder bg-auctionme-lightPanel text-slate-600 dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel dark:text-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by complaint ID, auction or user..."
            aria-label="Search complaints"
            className="w-full rounded-xl border border-auctionme-lightBorder bg-auctionme-lightPanel px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-purple-500 focus:outline-none sm:w-72 dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput dark:text-white"
          />
        </div>

        <PortalEmptyState
          title="No complaints loaded"
          description="Complaints, dispute categories, related auctions/users, and resolution workflows will appear here once GET/PATCH /api/admin/complaints is implemented on the server."
        />
      </div>
    </PortalShell>
  );
}
