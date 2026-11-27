import AdminAuditLogsView from '../../../components/admin/AdminAuditLogsView';

export const metadata = {
  title: 'Audit & Logs — AuctionMe Admin',
  description: 'Read-only, tamper-resistant platform activity and audit log.',
};

export default function AdminAuditLogsPage() {
  return <AdminAuditLogsView />;
}
