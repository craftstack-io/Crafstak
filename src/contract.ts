export const FREE_FEE = "0.0001";
export const PAID_PRICE = "0.001";

export const CONTRACT_ABI = [
  "function mintFree(uint256 quantity) payable",
  "function mintPaid(uint256 quantity) payable",
  "function freeMinted() view returns (uint256)",
  "function paidMinted() view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function freeRemaining() view returns (uint256)",
  "function paidRemaining() view returns (uint256)",
  "function treasury() view returns (address)",
] as const;
