import { NavBar } from "@/components/common/NavBar";
import { Footer } from "@/components/common/Footer";
import { StakingOverview } from "@/components/dashboard/StakingOverview";
import { RewardHistory } from "@/components/dashboard/RewardHistory";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0B0D12] to-[#02030a] text-white">
      <NavBar />
      <main>
        <StakingOverview />
        {/* StakingActions temporarily disabled */}
        <RewardHistory />
      </main>
      <Footer />
    </div>
  );
}
