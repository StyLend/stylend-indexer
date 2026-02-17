import { ponder } from "ponder:registry";
import {
  factoryConfig,
  factoryOperator,
  factoryOftAddress,
  factoryMinSupply,
  factoryCreatorFee,
  factoryChainEid,
  lendingPool,
  poolRateParams,
} from "ponder:schema";
import { FACTORY_ID, DEFAULT_RESERVE_FACTOR } from "../lib/constants";

ponder.on("LendingPoolFactory:setup", async ({ context }) => {
  await context.db.insert(factoryConfig).values({
    id: FACTORY_ID,
    paused: false,
  });
});

ponder.on("LendingPoolFactory:OwnershipTransferred", async ({ event, context }) => {
  await context.db
    .update(factoryConfig, { id: FACTORY_ID })
    .set({ owner: event.args.newOwner });
});

ponder.on("LendingPoolFactory:LendingPoolCreated", async ({ event, context }) => {
  const params = event.args.lendingPoolParams;

  await context.db.insert(lendingPool).values({
    id: event.args.lendingPool,
    collateralToken: params.collateralToken,
    borrowToken: params.borrowToken,
    ltv: params.ltv,
    supplyLiquidity: params.supplyLiquidity,
    baseRate: params.baseRate,
    rateAtOptimal: params.rateAtOptimal,
    optimalUtilization: params.optimalUtilization,
    maxUtilization: params.maxUtilization,
    maxRate: params.maxRate,
    liquidationThreshold: params.liquidationThreshold,
    liquidationBonus: params.liquidationBonus,
    router: event.args.router,
    routerImplementation: event.args.routerImplementation,
    lendingPoolImplementation: event.args.lendingPoolImplementation,
    sharesToken: event.args.sharesToken,
    createdAtBlock: BigInt(event.block.number),
    createdAtTimestamp: event.block.timestamp,
  });

  await context.db
    .insert(poolRateParams)
    .values({
      id: event.args.router,
      baseRate: params.baseRate,
      rateAtOptimal: params.rateAtOptimal,
      optimalUtilization: params.optimalUtilization,
      maxUtilization: params.maxUtilization,
      maxRate: params.maxRate,
      reserveFactor: DEFAULT_RESERVE_FACTOR,
    })
    .onConflictDoUpdate({
      baseRate: params.baseRate,
      rateAtOptimal: params.rateAtOptimal,
      optimalUtilization: params.optimalUtilization,
      maxUtilization: params.maxUtilization,
      maxRate: params.maxRate,
    });
});

ponder.on("LendingPoolFactory:OperatorSet", async ({ event, context }) => {
  await context.db
    .insert(factoryOperator)
    .values({ id: event.args.operator, status: event.args.status })
    .onConflictDoUpdate({ status: event.args.status });
});

ponder.on("LendingPoolFactory:OftAddressSet", async ({ event, context }) => {
  await context.db
    .insert(factoryOftAddress)
    .values({ id: event.args.token, oftAddress: event.args.oftAddress })
    .onConflictDoUpdate({ oftAddress: event.args.oftAddress });
});

ponder.on("LendingPoolFactory:TokenDataStreamSet", async ({ event, context }) => {
  await context.db
    .update(factoryConfig, { id: FACTORY_ID })
    .set({ tokenDataStream: event.args.tokenDataStream });
});

ponder.on("LendingPoolFactory:LendingPoolDeployerSet", async ({ event, context }) => {
  await context.db
    .update(factoryConfig, { id: FACTORY_ID })
    .set({ lendingPoolDeployer: event.args.lendingPoolDeployer });
});

ponder.on("LendingPoolFactory:LendingPoolRouterDeployerSet", async ({ event, context }) => {
  await context.db
    .update(factoryConfig, { id: FACTORY_ID })
    .set({ lendingPoolRouterDeployer: event.args.lendingPoolRouterDeployer });
});

ponder.on("LendingPoolFactory:ProtocolSet", async ({ event, context }) => {
  await context.db
    .update(factoryConfig, { id: FACTORY_ID })
    .set({ protocol: event.args.protocol });
});

ponder.on("LendingPoolFactory:IsHealthySet", async ({ event, context }) => {
  await context.db
    .update(factoryConfig, { id: FACTORY_ID })
    .set({ isHealthy: event.args.isHealthy });
});

ponder.on("LendingPoolFactory:PositionDeployerSet", async ({ event, context }) => {
  await context.db
    .update(factoryConfig, { id: FACTORY_ID })
    .set({ positionDeployer: event.args.positionDeployer });
});

ponder.on("LendingPoolFactory:WrappedNativeSet", async ({ event, context }) => {
  await context.db
    .update(factoryConfig, { id: FACTORY_ID })
    .set({ wrappedNative: event.args.wrappedNative });
});

ponder.on("LendingPoolFactory:DexRouterSet", async ({ event, context }) => {
  await context.db
    .update(factoryConfig, { id: FACTORY_ID })
    .set({ dexRouter: event.args.dexRouter });
});

ponder.on("LendingPoolFactory:MinAmountSupplyLiquiditySet", async ({ event, context }) => {
  await context.db
    .insert(factoryMinSupply)
    .values({ id: event.args.token, minAmount: event.args.minAmountSupplyLiquidity })
    .onConflictDoUpdate({ minAmount: event.args.minAmountSupplyLiquidity });
});

ponder.on("LendingPoolFactory:InterestRateModelSet", async ({ event, context }) => {
  await context.db
    .update(factoryConfig, { id: FACTORY_ID })
    .set({ interestRateModel: event.args.interestRateModel });
});

ponder.on("LendingPoolFactory:ChainIdToEidSet", async ({ event, context }) => {
  await context.db
    .insert(factoryChainEid)
    .values({ id: event.args.chainId, eid: Number(event.args.eid) })
    .onConflictDoUpdate({ eid: Number(event.args.eid) });
});

ponder.on("LendingPoolFactory:ProxyDeployerSet", async ({ event, context }) => {
  await context.db
    .update(factoryConfig, { id: FACTORY_ID })
    .set({ proxyDeployer: event.args.proxyDeployer });
});

ponder.on("LendingPoolFactory:SharesTokenDeployerSet", async ({ event, context }) => {
  await context.db
    .update(factoryConfig, { id: FACTORY_ID })
    .set({ sharesTokenDeployer: event.args.sharesTokenDeployer });
});

ponder.on("LendingPoolFactory:CreatorFeeSet", async ({ event, context }) => {
  await context.db
    .insert(factoryCreatorFee)
    .values({ id: event.args.lendingPoolRouter, fee: event.args.creatorFee })
    .onConflictDoUpdate({ fee: event.args.creatorFee });
});

ponder.on("LendingPoolFactory:SenjaEmitterSet", async ({ event, context }) => {
  await context.db
    .update(factoryConfig, { id: FACTORY_ID })
    .set({ senjaEmitter: event.args.senjaEmitter });
});

ponder.on("LendingPoolFactory:PausedEvent", async ({ context }) => {
  await context.db
    .update(factoryConfig, { id: FACTORY_ID })
    .set({ paused: true });
});

ponder.on("LendingPoolFactory:UnpausedEvent", async ({ context }) => {
  await context.db
    .update(factoryConfig, { id: FACTORY_ID })
    .set({ paused: false });
});
