import AdminAuditLogsView from '../../../components/admin/AdminAuditLogsView';

export const metadata = {
  title: 'Audit & Logs — Admin Panel — AuctionMe',
  description: 'Read-only, tamper-resistant platform audit logs for AuctionMe.',
};

export default function AdminAuditLogsPage() {
  return <AdminAuditLogsView />;
}
