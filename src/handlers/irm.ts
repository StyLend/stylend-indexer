import { ponder } from "ponder:registry";
import { irmConfig, poolRateParams } from "ponder:schema";
import { IRM_ID, DEFAULT_RESERVE_FACTOR } from "../lib/constants";

ponder.on("InterestRateModel:setup", async ({ context }) => {
  await context.db.insert(irmConfig).values({ id: IRM_ID });
});

ponder.on("InterestRateModel:OwnershipTransferred", async ({ event, context }) => {
  await context.db
    .update(irmConfig, { id: IRM_ID })
    .set({ owner: event.args.newOwner });
});

ponder.on("InterestRateModel:ScaledPercentageSet", async ({ event, context }) => {
  await context.db
    .update(irmConfig, { id: IRM_ID })
    .set({ scaledPercentage: event.args.percentage });
});

ponder.on("InterestRateModel:LendingPoolBaseRateSet", async ({ event, context }) => {
  await context.db
    .insert(poolRateParams)
    .values({
      id: event.args.lendingPool,
      baseRate: event.args.rate,
      rateAtOptimal: 0n,
      optimalUtilization: 0n,
      maxUtilization: 0n,
      maxRate: 0n,
      reserveFactor: DEFAULT_RESERVE_FACTOR,
    })
    .onConflictDoUpdate({ baseRate: event.args.rate });
});

ponder.on("InterestRateModel:LendingPoolRateAtOptimalSet", async ({ event, context }) => {
  await context.db
    .insert(poolRateParams)
    .values({
      id: event.args.lendingPool,
      baseRate: 0n,
      rateAtOptimal: event.args.rate,
      optimalUtilization: 0n,
      maxUtilization: 0n,
      maxRate: 0n,
      reserveFactor: DEFAULT_RESERVE_FACTOR,
    })
    .onConflictDoUpdate({ rateAtOptimal: event.args.rate });
});

ponder.on("InterestRateModel:LendingPoolOptimalUtilizationSet", async ({ event, context }) => {
  await context.db
    .insert(poolRateParams)
    .values({
      id: event.args.lendingPool,
      baseRate: 0n,
      rateAtOptimal: 0n,
      optimalUtilization: event.args.utilization,
      maxUtilization: 0n,
      maxRate: 0n,
      reserveFactor: DEFAULT_RESERVE_FACTOR,
    })
    .onConflictDoUpdate({ optimalUtilization: event.args.utilization });
});

ponder.on("InterestRateModel:LendingPoolMaxUtilizationSet", async ({ event, context }) => {
  await context.db
    .insert(poolRateParams)
    .values({
      id: event.args.lendingPool,
      baseRate: 0n,
      rateAtOptimal: 0n,
      optimalUtilization: 0n,
      maxUtilization: event.args.utilization,
      maxRate: 0n,
      reserveFactor: DEFAULT_RESERVE_FACTOR,
    })
    .onConflictDoUpdate({ maxUtilization: event.args.utilization });
});

ponder.on("InterestRateModel:LendingPoolMaxRateSet", async ({ event, context }) => {
  await context.db
    .insert(poolRateParams)
    .values({
      id: event.args.lendingPool,
      baseRate: 0n,
      rateAtOptimal: 0n,
      optimalUtilization: 0n,
      maxUtilization: 0n,
      maxRate: event.args.maxRate,
      reserveFactor: DEFAULT_RESERVE_FACTOR,
    })
    .onConflictDoUpdate({ maxRate: event.args.maxRate });
});

ponder.on("InterestRateModel:TokenReserveFactorSet", async ({ event, context }) => {
  await context.db
    .insert(poolRateParams)
    .values({
      id: event.args.lendingPool,
      baseRate: 0n,
      rateAtOptimal: 0n,
      optimalUtilization: 0n,
      maxUtilization: 0n,
      maxRate: 0n,
      reserveFactor: event.args.reserveFactor,
    })
    .onConflictDoUpdate({ reserveFactor: event.args.reserveFactor });
});
