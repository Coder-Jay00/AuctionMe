'use client';

const DATE_FILTER_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'last_90_days', label: 'Last 90 Days' },
  { value: 'this_year', label: 'This Year' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
];

export default function HoldingsControls({
  activeTab,
  onTabChange,
  counts,
  searchQuery,
  onSearchChange,
  dateFilter,
  onDateFilterChange,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  hasActiveFilters,
  onClearFilters,
}) {
  const tabs = [
    { id: 'won', label: 'Won Auctions', shortLabel: 'Won', count: counts.won },
    { id: 'leading', label: 'Currently Leading', shortLabel: 'Leading', count: counts.leading },
    { id: 'completed', label: 'Completed', shortLabel: 'Completed', count: counts.completed },
  ];

  return (
    <section className="space-y-4">
      {/* Holdings Tabs */}
      <div
        role="tablist"
        aria-label="Holdings status tabs"
        className="flex flex-wrap items-center gap-2"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabChange(tab.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold tracking-wide transition ${
                isActive
                  ? 'bg-auctionme-emeraldLight text-white shadow-sm dark:bg-auctionme-emeraldDark dark:text-[#061b12]'
                  : 'border border-auctionme-lightBorder bg-auctionme-lightPanel text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-white'
              }`}
            >
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.shortLabel}</span>
              <span className="tabular-nums opacity-90">({tab.count})</span>
            </button>
          );
        })}
      </div>

      {/* Search, Date Filter, Sort & Desktop Grid/List Toggle */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        {/* Search Input */}
        <div className="relative flex-1">
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500"
            aria-hidden="true"
          >
            <circle cx="9" cy="9" r="5.5" />
            <path strokeLinecap="round" d="M13.2 13.2L17 17" />
          </svg>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by lot, item or auction ID..."
            aria-label="Search holdings by item or auction ID"
            className="w-full rounded-xl border border-auctionme-lightBorder bg-auctionme-lightPanel py-2.5 pl-10 pr-4 text-xs text-slate-900 placeholder-slate-400 transition focus:border-auctionme-emeraldLight focus:outline-none focus:ring-2 focus:ring-auctionme-emeraldLight/20 dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-auctionme-emeraldDark"
          />
        </div>

        {/* Filter & Sort Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Date Filter */}
          <div className="relative flex-1 sm:flex-initial">
            <label htmlFor="holdings-date-filter" className="sr-only">
              Filter by date
            </label>
            <select
              id="holdings-date-filter"
              value={dateFilter}
              onChange={(e) => onDateFilterChange(e.target.value)}
              className="w-full appearance-none rounded-xl border border-auctionme-lightBorder bg-auctionme-lightPanel py-2.5 pl-3.5 pr-8 text-xs font-medium text-slate-700 transition focus:border-auctionme-emeraldLight focus:outline-none dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput dark:text-slate-200 dark:focus:border-auctionme-emeraldDark"
            >
              {DATE_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 8l4 4 4-4" />
            </svg>
          </div>

          {/* Sort Dropdown */}
          <div className="relative flex-1 sm:flex-initial">
            <label htmlFor="holdings-sort" className="sr-only">
              Sort holdings
            </label>
            <select
              id="holdings-sort"
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="w-full appearance-none rounded-xl border border-auctionme-lightBorder bg-auctionme-lightPanel py-2.5 pl-3.5 pr-8 text-xs font-medium text-slate-700 transition focus:border-auctionme-emeraldLight focus:outline-none dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput dark:text-slate-200 dark:focus:border-auctionme-emeraldDark"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 8l4 4 4-4" />
            </svg>
          </div>

          {/* Clear Filters pill if active */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="rounded-xl border border-auctionme-lightBorder bg-slate-100 px-3 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-200 hover:text-slate-900 dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              Reset
            </button>
          )}

          {/* Desktop Grid / List View Toggle */}
          <div
            role="group"
            aria-label="Layout view"
            className="hidden items-center rounded-xl border border-auctionme-lightBorder bg-auctionme-lightPanel p-1 lg:inline-flex dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput"
          >
            <button
              type="button"
              onClick={() => onViewModeChange('grid')}
              aria-label="Grid view"
              aria-pressed={viewMode === 'grid'}
              className={`inline-flex h-7 w-7 items-center justify-center rounded-lg transition ${
                viewMode === 'grid'
                  ? 'bg-auctionme-emeraldLight text-white dark:bg-auctionme-emeraldDark dark:text-[#061b12]'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4">
                <rect x="3.5" y="3.5" width="5" height="5" rx="1" />
                <rect x="11.5" y="3.5" width="5" height="5" rx="1" />
                <rect x="3.5" y="11.5" width="5" height="5" rx="1" />
                <rect x="11.5" y="11.5" width="5" height="5" rx="1" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('list')}
              aria-label="List view"
              aria-pressed={viewMode === 'list'}
              className={`inline-flex h-7 w-7 items-center justify-center rounded-lg transition ${
                viewMode === 'list'
                  ? 'bg-auctionme-emeraldLight text-white dark:bg-auctionme-emeraldDark dark:text-[#061b12]'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4">
                <path strokeLinecap="round" d="M4 6h12M4 10h12M4 14h12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
