import type { Metadata } from 'next';
import { getSession } from '@/lib/session';
import { RewardsClient } from './rewards-client';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Rewards Shop | NewHopeGGN',
  description: 'Redeem your loyalty points for exclusive Once Human rewards, custom packs, weapons, VIP status, and more.',
  keywords: ['rewards', 'points', 'loyalty', 'shop', 'Once Human', 'NewHopeGGN'],
};

export default async function RewardsPage() {
  const user = await getSession();
  return <RewardsClient user={user as any} />;
}
