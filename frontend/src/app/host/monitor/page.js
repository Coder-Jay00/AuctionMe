import HostLiveMonitorView from '../../../components/host/HostLiveMonitorView';

export const metadata = {
  title: 'Live Auction Monitor — AuctionMe Host',
  description: 'Read-only real-time Socket.IO auction monitor for Hosts.',
};

export default async function HostLiveMonitorPage({ searchParams }) {
  const resolved = await searchParams;
  return <HostLiveMonitorView initialAuctionId={resolved?.auctionId || null} />;
}
