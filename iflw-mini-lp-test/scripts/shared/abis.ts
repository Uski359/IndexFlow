import NonfungiblePositionManagerArtifact from "@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json";
import SwapRouterArtifact from "@uniswap/v3-periphery/artifacts/contracts/SwapRouter02.sol/SwapRouter02.json";
import QuoterV2Artifact from "@uniswap/v3-periphery/artifacts/contracts/interfaces/IQuoterV2.sol/IQuoterV2.json";
import UniswapV3PoolArtifact from "@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json";
import FactoryArtifact from "@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json";

export const NONFUNGIBLE_POSITION_MANAGER_ABI = NonfungiblePositionManagerArtifact.abi as const;
export const SWAP_ROUTER_ABI = SwapRouterArtifact.abi as const;
export const QUOTER_V2_ABI = QuoterV2Artifact.abi as const;
export const UNISWAP_V3_POOL_ABI = UniswapV3PoolArtifact.abi as const;
export const UNISWAP_V3_FACTORY_ABI = FactoryArtifact.abi as const;

export const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function mint(address to, uint256 amount)",
  "function totalSupply() view returns (uint256)",
] as const;
