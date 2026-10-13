import { ethers, network } from "hardhat";
import { keccak256, toUtf8Bytes } from "ethers";

const DEFAULT_DELAY = 2 * 60 * 60;

async function advanceTime(seconds: number) {
  await network.provider.send("evm_increaseTime", [seconds]);
  await network.provider.send("evm_mine");
}

async function main() {
  const [admin, proposer, validator] = await ethers.getSigners();
  console.log("Admin    :", admin.address);
  console.log("Proposer :", proposer.address);
  console.log("Validator:", validator.address);

  const Executor = await ethers.getContractFactory("DAOExecutor");
  const executor = await Executor.connect(admin).deploy(admin.address, admin.address, validator.address, DEFAULT_DELAY);
  await executor.waitForDeployment();
  const executorAddress = await executor.getAddress();
  console.log("Executor deployed at", executorAddress);

  const Governor = await ethers.getContractFactory("DAOGovernor");
  const governor = await Governor.connect(admin).deploy(admin.address, proposer.address, validator.address, executorAddress);
  await governor.waitForDeployment();
  const governorAddress = await governor.getAddress();
  console.log("Governor deployed at", governorAddress);

  await (await executor.connect(admin).updateProposer(governorAddress)).wait();
  await (await executor.connect(admin).setGovernor(governorAddress)).wait();
  console.log("Executor now recognizes the governor as proposer.");

  const Treasury = await ethers.getContractFactory("TreasuryMock");
  const treasury = await Treasury.deploy(executorAddress);
  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();
  console.log("Treasury deployed at", treasuryAddress);

  await (await governor.connect(admin).setVotingPeriod(5 * 60)).wait();
  await (await admin.sendTransaction({ to: treasuryAddress, value: ethers.parseEther("1") })).wait();
  console.log("Treasury funded with 1 test ETH");

  const proposalTag = keccak256(toUtf8Bytes("indexflow-grant-001"));
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const callData = abiCoder.encode(
    ["address", "uint256", "bytes32"],
    [proposer.address, ethers.parseEther("0.1"), proposalTag]
  );

  const createTx = await governor
    .connect(proposer)
    .createProposal(
      treasuryAddress,
      0,
      "withdraw(address,uint256,bytes32)",
      callData,
      "Stream 0.1 tETH to researcher",
      "ipfs://snapshot/dao-lite/proposal-001",
      proposalTag
    );
  await createTx.wait();
  const proposalId = await governor.proposalCount();
  console.log(`Created proposal ${proposalId}`);

  await advanceTime(10 * 60);
  await (
    await governor
      .connect(validator)
      .submitSnapshotResult(proposalId, 100, 10, "ipfs://snapshot/dao-lite/proposal-001/result.json")
  ).wait();
  console.log("Snapshot result submitted.");

  const latestBlock = await ethers.provider.getBlock("latest");
  const eta = (latestBlock?.timestamp ?? 0) + DEFAULT_DELAY + 1;
  await (await governor.connect(proposer).queueProposal(proposalId, eta)).wait();
  console.log("Proposal queued with eta", eta);

  const nowBlock = await ethers.provider.getBlock("latest");
  const fastForward = eta - (nowBlock?.timestamp ?? 0) + 1;
  if (fastForward > 0) {
    await advanceTime(fastForward);
  }

  await (await governor.connect(validator).executeProposal(proposalId, eta)).wait();
  console.log("Proposal executed. Check Treasury logs for withdrawal request event.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
