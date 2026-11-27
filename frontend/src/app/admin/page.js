import AdminOverviewView from '../../components/admin/AdminOverviewView';

export const metadata = {
  title: 'Admin Overview — AuctionMe',
  description: 'Platform health, live auction volume, and server-recorded activity.',
};

export default function AdminOverviewPage() {
  return <AdminOverviewView />;
}
