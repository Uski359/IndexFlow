const { Wallet } = require("ethers");

function main() {
  const wallet = Wallet.createRandom();
  console.log("Address :", wallet.address);
  console.log("Private Key :", wallet.privateKey);
}

main();
