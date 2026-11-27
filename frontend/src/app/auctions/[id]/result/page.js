import AuctionResultScreen from '../../../../components/result/AuctionResultScreen';

export const metadata = {
  title: 'Auction Result — AuctionMe',
  description:
    'Server-authoritative auction outcome, winner details, and complete accepted bid history.',
};

export default async function AuctionResultDetailPage({ params }) {
  const resolvedParams = await params;
  return <AuctionResultScreen initialAuctionId={resolvedParams?.id || null} />;
}
