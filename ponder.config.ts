import { createConfig, factory } from "ponder";
import { parseAbiItem } from "viem";
import { FACTORY, EMITTER_V2, INTEREST_RATE_MODEL } from "./src/constant/addresses";
import { LendingPoolFactoryAbi } from "./src/abis/LendingPoolFactoryAbi";
import { LendingPoolAbi } from "./src/abis/LendingPoolAbi";
import { StyLendEmitterAbi } from "./src/abis/StyLendEmitterAbi";
import { InterestRateModelAbi } from "./src/abis/InterestRateModelAbi";

export default createConfig({
  chains: {
    arbitrumSepolia: {
      id: 421614,
      rpc: process.env.PONDER_RPC_URL_421614!,
    },
  },
  contracts: {
    LendingPoolFactory: {
      chain: "arbitrumSepolia",
      abi: LendingPoolFactoryAbi,
      address: FACTORY,
      startBlock: 243284436,
    },
    LendingPool: {
      chain: "arbitrumSepolia",
      abi: LendingPoolAbi,
      address: factory({
        address: FACTORY,
        event: parseAbiItem(
          "event LendingPoolCreated((address collateralToken, address borrowToken, uint256 ltv, uint256 supplyLiquidity, uint256 baseRate, uint256 rateAtOptimal, uint256 optimalUtilization, uint256 maxUtilization, uint256 maxRate, uint256 liquidationThreshold, uint256 liquidationBonus) lendingPoolParams, address router, address routerImplementation, address lendingPool, address lendingPoolImplementation, address sharesToken)",
        ),
        parameter: "lendingPool",
      }),
      startBlock: 243284436,
    },
    EmitterV2: {
      chain: "arbitrumSepolia",
      abi: StyLendEmitterAbi,
      address: EMITTER_V2,
      startBlock: 243284436,
    },
    InterestRateModel: {
      chain: "arbitrumSepolia",
      abi: InterestRateModelAbi,
      address: INTEREST_RATE_MODEL,
      startBlock: 243284436,
    },
  },
});
