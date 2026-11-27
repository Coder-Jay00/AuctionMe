import MyHoldingsView from '../../components/holdings/MyHoldingsView';

export const metadata = {
  title: 'My Holdings — AuctionMe',
  description:
    'Read-only view of auctions you won, currently leading live bids, and completed server-authoritative auction results.',
};

export default function HoldingsPage() {
  return <MyHoldingsView />;
}
