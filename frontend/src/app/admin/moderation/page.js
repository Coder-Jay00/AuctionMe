import AdminModerationView from '../../../components/admin/AdminModerationView';

export const metadata = {
  title: 'Auction Moderation — AuctionMe Admin',
  description: 'Review auction listings and media without altering accepted bids or results.',
};

export default function AdminModerationPage() {
  return <AdminModerationView />;
}
