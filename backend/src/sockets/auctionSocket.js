const { Server } = require('socket.io');
const { isValidUuid } = require('../services/helpers');

function getAuctionRoom(auctionId) {
  return `auction:${auctionId}`;
}

function setupSocketServer(httpServer, corsOrigin) {
  const io = new Server(httpServer, {
    cors: {
      origin: corsOrigin.split(',').map((o) => o.trim()),
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    socket.on('auction:join', ({ auctionId } = {}, ack) => {
      if (!isValidUuid(auctionId)) {
        if (typeof ack === 'function') {
          ack({ ok: false, error: 'Invalid auction ID' });
        }
        return;
      }
      const room = getAuctionRoom(auctionId);
      socket.join(room);
      if (typeof ack === 'function') {
        ack({ ok: true, room, socketId: socket.id });
      }
    });

    socket.on('auction:leave', ({ auctionId } = {}) => {
      if (!isValidUuid(auctionId)) return;
      socket.leave(getAuctionRoom(auctionId));
    });
  });

  return io;
}

function emitAuctionUpdate(io, outcome) {
  const room = getAuctionRoom(outcome.auction.id);
  io.to(room).emit('auction:update', {
    auction: outcome.auction,
    bid: outcome.bid,
    version: outcome.auction.version,
    extended: outcome.extended,
    extensionSeconds: outcome.extensionSeconds,
    previousEndsAt: outcome.previousEndsAt,
    serverTime: outcome.serverTime,
  });
}

function emitAuctionClosed(io, closedItem) {
  const room = getAuctionRoom(closedItem.auction.id);
  io.to(room).emit('auction:closed', {
    auction: closedItem.auction,
    auctionId: closedItem.auction.id,
    status: 'CLOSED',
    winnerId: closedItem.auction.winnerId,
    finalPrice: closedItem.auction.currentPrice,
    closedAt: closedItem.auction.closedAt,
    hadBids: closedItem.hadBids,
    version: closedItem.auction.version,
    serverTime: closedItem.serverTime,
  });
}

function emitBidRejected(io, payload) {
  const { socketId, auctionId, bidderId, requestId, code, message, details } =
    payload;
  const eventBody = {
    auctionId,
    bidderId,
    requestId,
    code,
    message,
    details: details || null,
    timestamp: new Date().toISOString(),
  };

  if (socketId && io.sockets.sockets.has(socketId)) {
    io.to(socketId).emit('bid:rejected', eventBody);
  }
}

module.exports = {
  getAuctionRoom,
  setupSocketServer,
  emitAuctionUpdate,
  emitAuctionClosed,
  emitBidRejected,
};
