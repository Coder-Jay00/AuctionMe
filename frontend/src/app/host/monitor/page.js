import HostLiveMonitorView from '../../../components/host/HostLiveMonitorView';

export const metadata = {
  title: 'Live Auction Monitor — Host Panel — AuctionMe',
  description: 'Read-only real-time Socket.IO live auction monitoring for hosts.',
};

export default async function HostLiveMonitorPage({ searchParams }) {
  const resolved = await searchParams;
  return <HostLiveMonitorView initialAuctionId={resolved?.auctionId || null} />;
}
