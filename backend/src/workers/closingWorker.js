const { closeExpiredAuctions } = require('../services/closingService');

function startClosingWorker(io, intervalMs = 1000) {
  let isRunning = false;

  const tick = async () => {
    if (isRunning) return;
    isRunning = true;
    try {
      const closed = await closeExpiredAuctions(io);
      if (closed.length > 0) {
        for (const item of closed) {
          console.log(
            `[ClosingWorker] Closed auction ${item.auction.id} | winner=${
              item.auction.winnerId || 'NONE'
            } | finalPrice=${item.auction.currentPrice} | v=${item.auction.version}`
          );
        }
      }
    } catch (err) {
      console.error('[ClosingWorker] Tick error:', err.message);
    } finally {
      isRunning = false;
    }
  };

  // Run immediately once, then on interval
  tick();
  const timer = setInterval(tick, intervalMs);
  if (typeof timer.unref === 'function') {
    timer.unref();
  }

  return () => clearInterval(timer);
}

module.exports = { startClosingWorker };
