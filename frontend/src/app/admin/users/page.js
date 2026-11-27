import AdminUsersView from '../../../components/admin/AdminUsersView';

export const metadata = {
  title: 'Users & Roles — AuctionMe Admin',
  description: 'Administrator user directory and server-enforced RBAC overview.',
};

export default function AdminUsersPage() {
  return <AdminUsersView />;
}
