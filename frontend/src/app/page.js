import LiveAuctionRoomView from '../components/room/LiveAuctionRoomView';

export const metadata = {
  title: 'Live Auction Room — AuctionMe',
  description:
    'Real-time transactional bidding floor with PostgreSQL row locking, +30s anti-sniping protection, and Socket.IO updates.',
};

export default function LiveAuctionRoomPage() {
  return <LiveAuctionRoomView />;
}
