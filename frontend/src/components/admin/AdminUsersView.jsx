'use client';

import { useState } from 'react';
import PortalShell from '../portal/PortalShell';
import {
  BackendRequirementNotice,
  PortalEmptyState,
} from '../portal/PortalStates';
import { useThemePreference } from '../../hooks/useThemePreference';

const ROLE_DEFINITIONS = [
  {
    role: 'Bidder',
    scope: 'Discover auctions, place row-locked bids, view own holdings & watchlist.',
    restrictions: 'Cannot create auctions, moderate listings, or access admin tools.',
  },
  {
    role: 'Host',
    scope: 'Create & manage own scheduled auctions, monitor live floor read-only, inspect results.',
    restrictions: 'Cannot alter accepted bids, pick winners, or rewrite closed outcomes.',
  },
  {
    role: 'Moderator',
    scope: 'Review pending listings and investigate reported disputes where authorized.',
    restrictions: 'Cannot escalate roles or tamper with accepted bids or audit logs.',
  },
  {
    role: 'Administrator',
    scope: 'Platform operations, user governance, moderation oversight, and read-only audit inspection.',
    restrictions: 'Must be enforced via server-side RBAC; cannot manipulate accepted bids or outcomes.',
  },
];

export default function AdminUsersView() {
  const { preference, setPreference } = useThemePreference();
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'roles'
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [authNotice, setAuthNotice] = useState(null);

  const handleGuardedAction = (actionLabel) => {
    setAuthNotice(
      `${actionLabel} is blocked: server-side Administrator authentication and /api/admin/users endpoints are not implemented yet. Frontend-only role changes are never permitted.`
    );
  };

  return (
    <PortalShell
      role="admin"
      activeNav="users"
      themePreference={preference}
      onThemeChange={setPreference}
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-serif text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
              Users & Roles
            </h1>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm dark:text-slate-400">
              Manage platform accounts and role permissions through server-verified authorization.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleGuardedAction('Add User')}
            className="inline-flex items-center justify-center rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-400 dark:text-[#12071f]"
          >
            + Add User
          </button>
        </div>

        <BackendRequirementNotice
          accent="purple"
          title="Backend users table, RBAC middleware & /api/admin/users endpoints required"
          description="The current PostgreSQL schema only contains auctions and bids tables. No user records are fabricated here; role assignments and account actions require server-side Administrator authorization."
        />

        {authNotice && (
          <div role="alert" className="rounded-xl border border-rose-500/35 bg-rose-500/10 px-4 py-3 text-xs text-rose-700 dark:text-rose-300">
            {authNotice}
          </div>
        )}

        {/* Sub-tabs: Users | Roles */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="tablist" className="flex gap-2">
            {[
              { id: 'users', label: 'Users (0)' },
              { id: 'roles', label: 'Role Matrix (4)' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                  activeTab === tab.id
                    ? 'bg-purple-600 text-white dark:bg-purple-500 dark:text-[#12071f]'
                    : 'border border-auctionme-lightBorder bg-auctionme-lightPanel text-slate-600 dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel dark:text-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'users' && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users..."
                aria-label="Search users"
                className="rounded-xl border border-auctionme-lightBorder bg-auctionme-lightPanel px-3.5 py-2 text-xs dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput"
              />
              <select
                aria-label="Filter by role"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="rounded-xl border border-auctionme-lightBorder bg-auctionme-lightPanel px-3 py-2 text-xs dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput"
              >
                <option value="ALL">All Roles</option>
                <option value="BIDDER">Bidder</option>
                <option value="HOST">Host</option>
                <option value="MODERATOR">Moderator</option>
                <option value="ADMIN">Administrator</option>
              </select>
              <select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-auctionme-lightBorder bg-auctionme-lightPanel px-3 py-2 text-xs dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>
          )}
        </div>

        {activeTab === 'users' ? (
          <PortalEmptyState
            title="No user directory connected"
            description="Connect GET /api/admin/users with server-verified Administrator session auth to list, filter, and manage platform accounts."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {ROLE_DEFINITIONS.map((item) => (
              <div
                key={item.role}
                className="rounded-2xl border border-auctionme-lightBorder bg-auctionme-lightPanel p-5 shadow-sm dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel"
              >
                <span className="inline-flex rounded-full border border-purple-500/30 bg-purple-500/12 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:border-purple-400/35 dark:bg-purple-500/15 dark:text-purple-300">
                  {item.role}
                </span>
                <p className="mt-3 text-xs font-medium text-slate-800 dark:text-slate-200">
                  {item.scope}
                </p>
                <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <strong className="text-slate-700 dark:text-slate-300">Guardrail:</strong> {item.restrictions}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </PortalShell>
  );
}
