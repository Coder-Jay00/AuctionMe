import HostAuctionsView from '../../../components/host/HostAuctionsView';

export const metadata = {
  title: 'My Auctions — AuctionMe Host',
  description: 'Manage auctions, filter by status, and inspect permitted lot details.',
};

export default function HostAuctionsPage() {
  return <HostAuctionsView />;
}
