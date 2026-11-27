import HostLiveMonitorView from '../../../components/host/HostLiveMonitorView';

export const metadata = {
  title: 'Live Auction Monitor — Host Panel — AuctionMe',
  description: 'Read-only real-time Socket.IO live auction monitor for Hosts.',
};

export default async function HostMonitorPage({ searchParams }) {
  const resolved = await searchParams;
  const auctionId = typeof resolved?.auctionId === 'string' ? resolved.auctionId : null;
  return <HostLiveMonitorView initialAuctionId={auctionId} />;
}
