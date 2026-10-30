import { ethers, network } from "hardhat";
import { getAddress, isAddress } from "ethers";

const TARGET = { chainId: 56n, label: "BSC Mainnet", explorer: "https://bscscan.com" } as const;
const PUBLIC_FRONTEND_RPC = "https://bsc-dataseed.bnbchain.org";

async function main() {
  if (network.name !== "bnbMainnet") {
    throw new Error("Proyek hanya menargetkan BSC Mainnet. Pilih network bnbMainnet.");
  }

  const treasury = process.env.TREASURY_WALLET?.trim();
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY?.trim();
  const rpc = process.env.BNB_MAINNET_RPC_URL?.trim() || PUBLIC_FRONTEND_RPC;

  if (!treasury || !isAddress(treasury)) {
    throw new Error("Isi TREASURY_WALLET dengan alamat wallet penerima yang valid dan Anda kendalikan.");
  }
  if (!privateKey) {
    throw new Error("Isi DEPLOYER_PRIVATE_KEY hanya di file .env lokal. Jangan kirim atau commit key itu.");
  }
  if (process.env.CONFIRM_MAINNET_DEPLOY !== "YES_I_UNDERSTAND_MAINNET_GAS") {
    throw new Error("Mainnet dikunci. Setelah memeriksa biaya BNB dan treasury, set CONFIRM_MAINNET_DEPLOY=YES_I_UNDERSTAND_MAINNET_GAS secara lokal.");
  }

  const liveNetwork = await ethers.provider.getNetwork();
  if (liveNetwork.chainId !== TARGET.chainId) {
    throw new Error(`RPC mengarah ke chain ${liveNetwork.chainId}, seharusnya ${TARGET.label} chain ID ${TARGET.chainId}. Deploy dibatalkan.`);
  }

  const [deployer] = await ethers.getSigners();
  if (!deployer) throw new Error("Signer deploy tidak ditemukan. Periksa DEPLOYER_PRIVATE_KEY lokal.");
  console.log(`Deploying craftmeetcode Genesis to ${TARGET.label} (chain ${TARGET.chainId})`);
  console.log("Treasury recipient:", treasury);
  console.log("Deployer:", await deployer.getAddress());
  console.log("RPC endpoint configured (value hidden).");

  const collection = await ethers.deployContract("CraftMeetCode", [treasury]);
  await collection.waitForDeployment();
  const address = await collection.getAddress();
  const deployedTreasury = await collection.getFunction("treasury").staticCall() as string;
  if (getAddress(deployedTreasury) !== getAddress(treasury)) {
    throw new Error("Verifikasi treasury on-chain gagal; jangan aktifkan mint sebelum diperiksa.");
  }

  console.log("Contract deployed at:", address);
  console.log("Treasury verified on-chain:", deployedTreasury);
  console.log("Explorer:", `${TARGET.explorer}/address/${address}`);
  console.log("Frontend settings (copy to the VITE_ entries in .env):");
  console.log(`VITE_CHAIN_NAME=${TARGET.label}`);
  console.log(`VITE_CHAIN_ID=${TARGET.chainId.toString()}`);
  console.log(`VITE_RPC_URL=${PUBLIC_FRONTEND_RPC}`);
  console.log(`VITE_CONTRACT_ADDRESS=${address}`);
  console.log(`VITE_EXPLORER_URL=${TARGET.explorer}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
