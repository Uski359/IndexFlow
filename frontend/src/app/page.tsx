import { NavBar } from "@/components/common/NavBar";
import { Footer } from "@/components/common/Footer";
import { Hero } from "@/components/landing/Hero";
import { FeatureGrid } from "@/components/landing/FeatureGrid";
import { NetworkStats } from "@/components/landing/NetworkStats";
import { ProofModel } from "@/components/landing/ProofModel";
import { GraphQLPlayground } from "@/components/landing/GraphQLPlayground";
import { Tokenomics } from "@/components/landing/Tokenomics";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0B0D12] to-[#02030a] text-white">
      <NavBar />
      <main>
        <Hero />
        <div className="mx-auto max-w-5xl px-6">
          <NetworkStats />
        </div>
        <FeatureGrid />
        <ProofModel />
        <GraphQLPlayground />
        <Tokenomics />
      </main>
      <Footer />
    </div>
  );
}
