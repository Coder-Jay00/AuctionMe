/**
 * Pure filtering, summary metric, pagination, and safe CSV export utilities
 * for Screen 06 — My Ledger (Bid History).
 */

export function computeLedgerMetrics(records = []) {
  const counts = {
    total: records.length,
    accepted: 0,
    rejected: 0,
    outbid: 0,
    won: 0,
  };

  for (const r of records) {
    const status = String(r.status || '').toLowerCase();
    if (status === 'accepted') counts.accepted += 1;
    else if (status === 'rejected') counts.rejected += 1;
    else if (status === 'outbid') counts.outbid += 1;
    else if (status === 'won') counts.won += 1;
  }

  return counts;
}

export function filterLedgerRecords(
  records = [],
  { tab = 'all', statusFilter = 'all', dateRange = 'all', search = '', nowMs = Date.now() } = {}
) {
  const normalizedSearch = search.trim().toLowerCase();

  let cutoffMs = null;
  if (dateRange === '24h') cutoffMs = nowMs - 24 * 60 * 60 * 1000;
  else if (dateRange === '7d') cutoffMs = nowMs - 7 * 24 * 60 * 60 * 1000;
  else if (dateRange === '30d') cutoffMs = nowMs - 30 * 24 * 60 * 60 * 1000;

  return records.filter((rec) => {
    const recStatus = String(rec.status || '').toLowerCase();

    if (tab !== 'all' && recStatus !== tab) return false;
    if (statusFilter !== 'all' && recStatus !== statusFilter) return false;

    if (cutoffMs !== null && rec.createdAt) {
      const ts = new Date(rec.createdAt).getTime();
      if (!Number.isNaN(ts) && ts < cutoffMs) return false;
    }

    if (normalizedSearch) {
      const haystack = [
        rec.auctionId,
        rec.lotNumber,
        rec.auctionTitle,
        rec.id,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(normalizedSearch)) return false;
    }

    return true;
  });
}

export function paginateRecords(records = [], page = 1, pageSize = 10) {
  const safePageSize = Math.max(1, pageSize);
  const totalItems = records.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (currentPage - 1) * safePageSize;
  const items = records.slice(startIndex, startIndex + safePageSize);

  return {
    items,
    currentPage,
    totalPages,
    totalItems,
    showingFrom: totalItems === 0 ? 0 : startIndex + 1,
    showingTo: startIndex + items.length,
  };
}

export function buildLedgerCsv(records = []) {
  const headers = [
    'Bid ID',
    'Auction ID',
    'Lot',
    'Item Title',
    'Amount (Paise)',
    'Result',
    'Timestamp (ISO)',
  ];
  const escapeCell = (val) => {
    const s = String(val ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const rows = records.map((r) => [
    r.id,
    r.auctionId,
    r.lotNumber || '',
    r.auctionTitle || '',
    r.amount,
    r.status,
    r.createdAt,
  ]);

  return [headers, ...rows].map((row) => row.map(escapeCell).join(',')).join('\n');
}
