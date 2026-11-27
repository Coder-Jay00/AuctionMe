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
    scope: 'Participate in live auctions, place row-locked bids, view personal holdings & watchlist.',
    restrictions: 'Cannot create auctions or access host/admin routes.',
  },
  {
    role: 'Host',
    scope: 'Create and manage own scheduled auctions, monitor live floor read-only, view results.',
    restrictions: 'Cannot edit accepted bids, select winners, or rewrite closed outcomes.',
  },
  {
    role: 'Moderator',
    scope: 'Review pending auction listings and assist with dispute triage when enabled by backend RBAC.',
    restrictions: 'Cannot modify accepted bids, auction results, or elevate roles.',
  },
  {
    role: 'Administrator',
    scope: 'Platform operations, user/role administration, moderation oversight, and audit log review.',
    restrictions: 'Cannot alter accepted bids, pick winners, or tamper with audit logs.',
  },
];

export default function AdminUsersView() {
  const { preference, setPreference } = useThemePreference();
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'roles'
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

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
              Users &amp; Roles
            </h1>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm dark:text-slate-400">
              Manage platform accounts and server-enforced RBAC permissions.
            </p>
          </div>
          <button
            type="button"
            disabled
            title="Requires backend POST /api/admin/users and verified Administrator session"
            className="inline-flex cursor-not-allowed items-center justify-center rounded-xl bg-purple-600/50 px-4 py-2.5 text-xs font-bold text-white opacity-60 dark:bg-purple-500/40"
          >
            + Add User (API Required)
          </button>
        </div>

        <BackendRequirementNotice
          accent="purple"
          title="Permission Denied / Backend Users & RBAC API Not Implemented"
          description="The backend has no users table, authentication middleware, or /api/admin/users endpoints yet. Role assignments and account actions are strictly blocked to prevent frontend-only privilege escalation."
        />

        {/* Users vs Roles Tabs */}
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
                  ? 'bg-purple-600 text-white dark:bg-purple-500 dark:text-white'
                  : 'border border-auctionme-lightBorder bg-auctionme-lightPanel text-slate-600 dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel dark:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'users' ? (
          <>
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users by ID or email..."
                aria-label="Search users"
                className="flex-1 rounded-xl border border-auctionme-lightBorder bg-auctionme-lightPanel px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-purple-500 focus:outline-none dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput dark:text-white"
              />
              <select
                aria-label="Filter by role"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="rounded-xl border border-auctionme-lightBorder bg-auctionme-lightPanel px-3 py-2 text-xs font-medium text-slate-700 dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput dark:text-slate-200"
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
                className="rounded-xl border border-auctionme-lightBorder bg-auctionme-lightPanel px-3 py-2 text-xs font-medium text-slate-700 dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput dark:text-slate-200"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>

            <PortalEmptyState
              title="No server-verified user records available"
              description="User accounts will populate here once PostgreSQL users/roles tables and GET /api/admin/users with server-side Administrator authorization are implemented."
            />
          </>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {ROLE_DEFINITIONS.map((r) => (
              <div
                key={r.role}
                className="rounded-2xl border border-auctionme-lightBorder bg-auctionme-lightPanel p-4 shadow-sm dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel"
              >
                <span className="inline-flex rounded-full border border-purple-500/30 bg-purple-500/12 px-2.5 py-0.5 text-[11px] font-bold text-purple-700 dark:border-purple-400/35 dark:bg-purple-500/20 dark:text-purple-300">
                  {r.role}
                </span>
                <p className="mt-2.5 text-xs font-medium text-slate-800 dark:text-slate-200">
                  {r.scope}
                </p>
                <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  Guardrail: {r.restrictions}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </PortalShell>
  );
}
