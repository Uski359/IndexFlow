import { ShieldCheck, Binary, Layers } from "lucide-react";

const proofItems = [
  {
    title: "Proof of Indexing",
    description: "Every batch commits to block metadata, event digests, and deterministic Merkle roots.",
    icon: ShieldCheck
  },
  {
    title: "Proof of SQL",
    description: "Queries include signed statements mapping result sets to the originating PoI batch.",
    icon: Binary
  },
  {
    title: "Coordinated attestations",
    description: "Validators co-sign submissions and slash operators who drift from canonical data.",
    icon: Layers
  }
];

export function ProofModel() {
  return (
    <section id="proofs" className="section-spacing">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-semibold text-white md:text-4xl">Dual-proof security</h2>
          <p className="mt-4 text-lg text-white/70">
            IndexFlow unifies Proof of Indexing with Proof of SQL so that every data consumer can validate authenticity
            end-to-end without trusting middleware.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          {proofItems.map((item) => (
            <div key={item.title} className="card h-full text-center">
              <item.icon className="mx-auto h-10 w-10 text-indexflow-primary" />
              <h3 className="mt-4 text-lg font-semibold text-white">{item.title}</h3>
              <p className="mt-2 text-sm text-white/70">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
