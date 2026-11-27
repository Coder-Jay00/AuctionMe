import BidderCatalogView from '../../components/catalog/BidderCatalogView';

export const metadata = {
  title: 'Discover Auctions — AuctionMe',
  description:
    'Browse live, upcoming, and closed auctions with real-time Socket.IO bid updates on AuctionMe.',
};

export default function AuctionsCatalogPage() {
  return <BidderCatalogView />;
}
