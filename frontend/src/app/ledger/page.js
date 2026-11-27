import LedgerScreen from '../../components/ledger/LedgerScreen';

export const metadata = {
  title: 'My Ledger — AuctionMe',
  description:
    'Read-only personal bidding activity, summary metrics, and auction history.',
};

export default function LedgerPage() {
  return <LedgerScreen />;
}
