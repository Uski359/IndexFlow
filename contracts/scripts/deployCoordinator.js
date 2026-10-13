const hre = require("hardhat");

async function main() {
  const TOKEN = "0x93b95F6956330f4a56E7A94457A7E597a7340E61";
  const DATA = "0xcb58555c4faFB977689CcbAEA3b97299ba0C652D";
  const DAO = "0xb01031685376Ac9403fb7e5878d49b03c72BF12D";

  console.log("Deploying Coordinator...");
  const Coordinator = await hre.ethers.getContractFactory("Coordinator");

  const coordinator = await Coordinator.deploy(
    TOKEN,
    DATA,
    DAO
  );

  await coordinator.deployed();

  console.log("\nCoordinator deployed to:", coordinator.address);
  console.log("Block:", coordinator.deployTransaction.blockNumber);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
