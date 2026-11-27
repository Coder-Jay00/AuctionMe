import LiveAuctionRoomView from '../../../components/room/LiveAuctionRoomView';

export const metadata = {
  title: 'Live Auction Room — AuctionMe',
  description:
    'Real-time transactional bidding floor on AuctionMe.',
};

export default async function AuctionDetailRoomPage({ params }) {
  const { id } = await params;
  return <LiveAuctionRoomView initialAuctionId={id} />;
}
