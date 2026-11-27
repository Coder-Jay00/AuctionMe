'use client';

const SORT_OPTIONS = [
  { value: 'ending_soon', label: 'Ending Soon' },
  { value: 'recently_added', label: 'Recently Added' },
  { value: 'highest_bid', label: 'Highest Bid' },
];

export default function CatalogControls({
  heading = 'Discover Auctions',
  subtitle = 'Find something worth bidding for.',
  searchQuery,
  onSearchChange,
  activeTab,
  onTabChange,
  tabCounts,
  categoryFilter,
  onCategoryChange,
  availableCategories,
  hostFilter,
  onHostChange,
  availableHosts,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  filteredCount,
  hasActiveFilters,
  onClearFilters,
}) {
  const tabs = [
    { id: 'ALL', label: 'All Auctions', shortLabel: 'All', count: tabCounts.ALL, dot: null },
    { id: 'LIVE', label: 'Live', shortLabel: 'Live', count: tabCounts.LIVE, dot: 'bg-rose-500' },
    {
      id: 'SCHEDULED',
      label: 'Upcoming',
      shortLabel: 'Upcoming',
      count: tabCounts.SCHEDULED,
      dot: 'bg-amber-400',
    },
    { id: 'CLOSED', label: 'Closed', shortLabel: 'Closed', count: tabCounts.CLOSED, dot: null },
  ];

  return (
    <section className="space-y-4">
      {/* Title Row + Desktop Grid/List Toggle */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            {heading}
          </h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm dark:text-slate-400">
            {subtitle}
          </p>
        </div>

        {/* Grid / List View Toggle (Desktop only) */}
        <div
          role="group"
          aria-label="Catalog layout view"
          className="hidden items-center rounded-xl border border-auctionme-lightBorder bg-auctionme-lightPanel p-1 shadow-sm lg:inline-flex dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel"
        >
          <button
            type="button"
            onClick={() => onViewModeChange('grid')}
            aria-pressed={viewMode === 'grid'}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              viewMode === 'grid'
                ? 'bg-auctionme-emeraldLight text-white shadow-sm dark:bg-auctionme-emeraldDark dark:text-[#061b12]'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-3.5 w-3.5">
              <rect x="3" y="3" width="5.5" height="5.5" rx="1" />
              <rect x="11.5" y="3" width="5.5" height="5.5" rx="1" />
              <rect x="3" y="11.5" width="5.5" height="5.5" rx="1" />
              <rect x="11.5" y="11.5" width="5.5" height="5.5" rx="1" />
            </svg>
            <span>Grid</span>
          </button>

          <button
            type="button"
            onClick={() => onViewModeChange('list')}
            aria-pressed={viewMode === 'list'}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              viewMode === 'list'
                ? 'bg-auctionme-emeraldLight text-white shadow-sm dark:bg-auctionme-emeraldDark dark:text-[#061b12]'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-3.5 w-3.5">
              <path strokeLinecap="round" d="M4 5.5h12M4 10h12M4 14.5h12" />
            </svg>
            <span>List</span>
          </button>
        </div>
      </div>

      {/* Inline Search Bar for Mobile & Tablet (< lg) */}
      <div className="relative lg:hidden">
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
          placeholder="Search auctions, items, or ID..."
          aria-label="Search auctions"
          className="w-full rounded-xl border border-auctionme-lightBorder bg-auctionme-lightInput py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 transition focus:border-auctionme-emeraldLight focus:outline-none focus:ring-2 focus:ring-auctionme-emeraldLight/25 dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-auctionme-emeraldDark dark:focus:ring-auctionme-emeraldDark/25"
        />
      </div>

      {/* Status Tabs: All Auctions, Live, Upcoming, Closed */}
      <div
        role="tablist"
        aria-label="Auction status filter"
        className="grid grid-cols-4 gap-1 rounded-2xl border border-auctionme-lightBorder bg-auctionme-lightPanel p-1.5 shadow-sm sm:flex sm:items-center sm:gap-1.5 dark:border-auctionme-darkBorder dark:bg-auctionme-darkPanel"
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
              className={`inline-flex min-w-0 items-center justify-center gap-1 rounded-xl px-1.5 py-2 text-[11px] font-semibold transition sm:flex-1 sm:gap-2 sm:px-3.5 sm:text-xs ${
                isActive
                  ? 'bg-auctionme-emeraldLight text-white shadow-sm dark:bg-auctionme-emeraldDark dark:text-[#061b12]'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white'
              }`}
            >
              {tab.dot && !isActive && (
                <span className={`hidden h-1.5 w-1.5 shrink-0 rounded-full sm:inline-block ${tab.dot}`} />
              )}
              <span className="hidden truncate sm:inline">{tab.label}</span>
              <span className="truncate sm:hidden">{tab.shortLabel}</span>
              <span
                className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                  isActive
                    ? 'bg-white/20 text-current dark:bg-black/15'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter Row: Category, Host, Sort + Result Count */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <div className="relative">
            <select
              aria-label="Filter by category"
              value={categoryFilter}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="appearance-none rounded-xl border border-auctionme-lightBorder bg-auctionme-lightPanel py-2 pl-3 pr-8 text-xs font-medium text-slate-700 transition focus:border-auctionme-emeraldLight focus:outline-none dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput dark:text-slate-200 dark:focus:border-auctionme-emeraldDark"
            >
              <option value="ALL">All Categories</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
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

          {/* Host Filter */}
          <div className="relative">
            <select
              aria-label="Filter by host"
              value={hostFilter}
              onChange={(e) => onHostChange(e.target.value)}
              className="appearance-none rounded-xl border border-auctionme-lightBorder bg-auctionme-lightPanel py-2 pl-3 pr-8 text-xs font-medium text-slate-700 transition focus:border-auctionme-emeraldLight focus:outline-none dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput dark:text-slate-200 dark:focus:border-auctionme-emeraldDark"
            >
              <option value="ALL">All Hosts</option>
              {availableHosts.map((host) => (
                <option key={host} value={host}>
                  {host}
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

          {/* Sort Filter */}
          <div className="relative">
            <select
              aria-label="Sort auctions"
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="appearance-none rounded-xl border border-auctionme-lightBorder bg-auctionme-lightPanel py-2 pl-3 pr-8 text-xs font-medium text-slate-700 transition focus:border-auctionme-emeraldLight focus:outline-none dark:border-auctionme-darkBorder dark:bg-auctionme-darkInput dark:text-slate-200 dark:focus:border-auctionme-emeraldDark"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  Sort: {opt.label}
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

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="rounded-xl px-2.5 py-2 text-xs font-medium text-auctionme-emeraldLight transition hover:bg-emerald-500/10 dark:text-auctionme-emeraldDark"
            >
              Reset
            </button>
          )}
        </div>

        <div className="text-xs font-medium text-slate-500 tabular-nums dark:text-slate-400">
          {filteredCount} {filteredCount === 1 ? 'Auction' : 'Auctions'}
        </div>
      </div>
    </section>
  );
}
