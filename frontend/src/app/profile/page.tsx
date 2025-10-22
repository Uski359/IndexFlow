import { ProfileDashboard } from '@/components/profile/ProfileDashboard';

export default function ProfilePage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">My Profile</h1>
        <p className="max-w-2xl text-sm text-white/60">
          Track contributions, staking activity, and earned rewards across the IndexFlow protocol.
        </p>
      </header>
      <ProfileDashboard />
    </div>
  );
}
