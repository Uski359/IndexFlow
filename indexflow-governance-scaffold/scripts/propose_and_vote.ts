import { ethers } from "ethers";

type ProposalLifecycle = "proposed" | "active" | "succeeded";

const MOCK_SIGNERS = 3;

async function main() {
  const signers = Array.from({ length: MOCK_SIGNERS }, () => ethers.Wallet.createRandom());

  const snapshot = {
    epoch: Date.now(),
    voters: signers.map((signer, i) => ({
      address: signer.address,
      stake: (i + 1) * 1_000,
      uptime: 0.98 - i * 0.01
    }))
  };

  const snapshotHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(snapshot)));

  const totalVotingPower = snapshot.voters.reduce((acc, voter) => {
    const weighted = Math.round(voter.stake * voter.uptime);
    return acc + weighted;
  }, 0);

  const proposal = {
    title: "Spin up DAO-lite grants committee",
    description: "Authorize pilot grants budget (mock-only).",
    targets: ["0x000000000000000000000000000000000000dEaD"],
    signatures: ["requestWithdrawal(address,uint256,string)"],
    values: [0],
    calldatas: [
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "uint256", "string"],
        ["0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa", 0, "Boot grants council"]
      )
    ]
  };

  logStage("proposed", {
    snapshotHash,
    totalVotingPower,
    proposal
  });

  logStage("active", {
    votingWindowSeconds: 180,
    voteStart: new Date().toISOString(),
    voteEnd: new Date(Date.now() + 180 * 1000).toISOString()
  });

  const ballots = await Promise.all(
    signers.map(async (signer, idx) => {
      const voter = snapshot.voters[idx];
      const weight = Math.round(voter.stake * voter.uptime);
      const ballot = ethers.keccak256(
        ethers.solidityPacked(
          ["bytes32", "address", "uint256", "uint8"],
          [snapshotHash, signer.address, weight, 1] // support = For
        )
      );
      const signature = await signer.signMessage(ethers.getBytes(ballot));
      return {
        voter: signer.address,
        support: "for",
        weight,
        attestation: snapshotHash,
        signature
      };
    })
  );

  const tally = ballots.reduce(
    (acc, ballot) => {
      acc.forVotes += ballot.weight;
      return acc;
    },
    { forVotes: 0, againstVotes: 0, abstainVotes: 0 }
  );

  const quorumRequirement = Math.round(totalVotingPower * 0.1);
  const quorumMet = tally.forVotes >= quorumRequirement;

  logStage("succeeded", {
    ballots,
    tally,
    quorumRequirement,
    quorumMet
  });

  console.log(
    "\nNext: feed these parameters into the deployed governor via Hardhat tasks or scripts.\n"
  );
}

function logStage(stage: ProposalLifecycle, payload: Record<string, unknown>) {
  console.log(`\n=== ${stage.toUpperCase()} ===`);
  console.log(JSON.stringify(payload, null, 2));
}

main().catch((error) => {
  console.error("[propose] Simulation failed:", error);
  process.exitCode = 1;
});
