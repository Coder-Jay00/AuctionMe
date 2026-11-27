export function formatINR(paise) {
  if (typeof paise !== 'number' || Number.isNaN(paise)) return '₹0';
  const rupees = paise / 100;
  const hasFraction = paise % 100 !== 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(rupees);
}

export function formatTimeShort(isoString) {
  if (!isoString) return '--:--:--';
  const d = new Date(isoString);
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

export function formatCountdown(remainingMs) {
  const clamped = Math.max(0, remainingMs);
  const totalSeconds = Math.ceil(clamped / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n) => String(n).padStart(2, '0');
  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

export function formatDurationCompact(remainingMs) {
  const clamped = Math.max(0, remainingMs);
  const totalSeconds = Math.ceil(clamped / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n) => String(n).padStart(2, '0');
  if (days > 0) {
    return `${days}d ${pad(hours)}h`;
  }
  if (hours > 0) {
    return `${pad(hours)}h ${pad(minutes)}m`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

export function formatShortDate(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

export function formatDateTimeFull(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatAuctionPeriod(startsAt, endsOrClosedAt) {
  if (!startsAt && !endsOrClosedAt) return 'Not available';
  const start = startsAt ? new Date(startsAt) : null;
  const end = endsOrClosedAt ? new Date(endsOrClosedAt) : null;

  const validStart = start && !Number.isNaN(start.getTime());
  const validEnd = end && !Number.isNaN(end.getTime());

  if (!validStart && !validEnd) return 'Not available';
  if (validStart && !validEnd) return `${formatDateTimeFull(startsAt)} — Ongoing`;
  if (!validStart && validEnd) return `Ended ${formatDateTimeFull(endsOrClosedAt)}`;

  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();

  if (sameDay) {
    const datePart = start.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const startTime = start.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    const endTime = end.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    return `${datePart}, ${startTime} – ${endTime}`;
  }

  return `${formatDateTimeFull(startsAt)} – ${formatDateTimeFull(endsOrClosedAt)}`;
}

export function getAuctionLotLabel(auction) {
  if (!auction) return 'LOT —';
  if (auction.lotNumber) return `LOT #${auction.lotNumber}`;
  if (auction.id) return `ID #${String(auction.id).slice(0, 8).toUpperCase()}`;
  return 'LOT —';
}

export function getAuctionStatusMeta(status) {
  switch (status) {
    case 'LIVE':
      return {
        key: 'LIVE',
        label: 'LIVE',
        dotClass: 'bg-emerald-400',
        badgeClass:
          'border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:border-auctionme-emeraldDark/35 dark:bg-auctionme-emeraldDark/15 dark:text-auctionme-emeraldDark',
      };
    case 'SCHEDULED':
      return {
        key: 'SCHEDULED',
        label: 'UPCOMING',
        dotClass: 'bg-amber-400',
        badgeClass:
          'border-amber-500/35 bg-amber-500/15 text-amber-700 dark:border-amber-400/35 dark:bg-amber-400/15 dark:text-amber-300',
      };
    case 'CLOSED':
    default:
      return {
        key: 'CLOSED',
        label: 'CLOSED',
        dotClass: 'bg-slate-400',
        badgeClass:
          'border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300',
      };
  }
}

export function generateRequestId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function maskBidderId(bidderId, currentBidderId) {
  if (!bidderId) return '—';
  if (currentBidderId && bidderId === currentBidderId) {
    return bidderId;
  }
  const str = String(bidderId);
  if (str.length <= 4) {
    return `${str[0] || '*'}***`;
  }
  const prefix = str.slice(0, Math.min(4, Math.floor(str.length / 3)));
  const suffix = str.slice(-2);
  return `${prefix}•••${suffix}`;
}
