import MyWatchlistView from '../../components/watchlist/MyWatchlistView';

export const metadata = {
  title: 'My Watchlist — AuctionMe',
  description:
    'Track live, upcoming, and completed auctions with real-time server-authoritative pricing and countdowns on AuctionMe.',
};

export default function WatchlistPage() {
  return <MyWatchlistView />;
}
