import { ethers } from "hardhat";

async function main() {
  const [signer] = await ethers.getSigners();
  const wethAbi = ["function deposit() payable", "function balanceOf(address) view returns (uint256)"];
  const wethAddress = "0xdd13E55209Fd76AfE204dBda4007C227904f0a81"; // Sepolia WETH9

  const weth = new ethers.Contract(wethAddress, wethAbi, signer);
  console.log("[wrap] depositing 1.5 ETH into WETH for", signer.address);
  const tx = await weth.deposit({ value: ethers.parseEther("1.5") });
  await tx.wait();
  console.log("[wrap] done, WETH balance:", (await weth.balanceOf(signer.address)).toString());
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
