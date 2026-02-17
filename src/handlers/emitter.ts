import { ponder } from "ponder:registry";
import type { Hex } from "viem";
import {
  position,
  sharesTokenDeployment,
  supplyLiquidityEvent,
  withdrawLiquidityEvent,
  supplyCollateralEvent,
  borrowDebtEvent,
  repayByPositionEvent,
  withdrawCollateralEvent,
  emitterAdmin,
} from "ponder:schema";
import { createPoolSnapshot, upsertUserPoolBalance } from "../lib/pool";

ponder.on("EmitterV2:OwnershipTransferred", async (_args) => {
  // Emitter ownership tracked separately if needed
});

ponder.on("EmitterV2:PositionCreated", async ({ event, context }) => {
  await context.db.insert(position).values({
    id: event.args.position,
    lendingPool: event.args.lendingPool,
    lendingPoolRouter: event.args.lendingPoolRouter,
    user: event.args.user,
    createdAtBlock: BigInt(event.block.number),
    createdAtTimestamp: event.block.timestamp,
  });
});

ponder.on("EmitterV2:SharesTokenDeployed", async ({ event, context }) => {
  await context.db.insert(sharesTokenDeployment).values({
    id: event.args.sharesToken,
    lendingPoolRouter: event.args.lendingPoolRouter,
  });
});

ponder.on("EmitterV2:SupplyLiquidity", async ({ event, context }) => {
  const lpAddress = event.transaction.to as Hex;

  await context.db.insert(supplyLiquidityEvent).values({
    id: `${event.block.number}_${event.log.logIndex}`,
    lendingPool: lpAddress,
    user: event.args.user,
    amount: event.args.amount,
    shares: event.args.shares,
    blockNumber: BigInt(event.block.number),
    timestamp: event.block.timestamp,
    txHash: event.transaction.hash,
  });

  await upsertUserPoolBalance(
    event.args.user, lpAddress, "totalSupplied", event.args.amount, context,
  );

  await createPoolSnapshot(
    lpAddress, "SupplyLiquidity", BigInt(event.block.number),
    event.log.logIndex, event.block.timestamp, context,
  );
});

ponder.on("EmitterV2:WithdrawLiquidity", async ({ event, context }) => {
  const lpAddress = event.transaction.to as Hex;

  await context.db.insert(withdrawLiquidityEvent).values({
    id: `${event.block.number}_${event.log.logIndex}`,
    lendingPool: lpAddress,
    user: event.args.user,
    amount: event.args.amount,
    shares: event.args.shares,
    blockNumber: BigInt(event.block.number),
    timestamp: event.block.timestamp,
    txHash: event.transaction.hash,
  });

  await upsertUserPoolBalance(
    event.args.user, lpAddress, "totalWithdrawn", event.args.amount, context,
  );

  await createPoolSnapshot(
    lpAddress, "WithdrawLiquidity", BigInt(event.block.number),
    event.log.logIndex, event.block.timestamp, context,
  );
});

ponder.on("EmitterV2:SupplyCollateral", async ({ event, context }) => {
  const lpAddress = event.transaction.to as Hex;

  await context.db.insert(supplyCollateralEvent).values({
    id: `${event.block.number}_${event.log.logIndex}`,
    lendingPool: lpAddress,
    positionAddress: event.args.positionAddress,
    user: event.args.user,
    amount: event.args.amount,
    blockNumber: BigInt(event.block.number),
    timestamp: event.block.timestamp,
    txHash: event.transaction.hash,
  });

  await upsertUserPoolBalance(
    event.args.user, lpAddress, "totalCollateralSupplied", event.args.amount, context,
  );
});

ponder.on("EmitterV2:BorrowDebt", async ({ event, context }) => {
  const lpAddress = event.transaction.to as Hex;

  await context.db.insert(borrowDebtEvent).values({
    id: `${event.block.number}_${event.log.logIndex}`,
    lendingPool: lpAddress,
    user: event.args.user,
    protocolFee: event.args.protocolFee,
    userAmount: event.args.userAmount,
    shares: event.args.shares,
    amount: event.args.amount,
    blockNumber: BigInt(event.block.number),
    timestamp: event.block.timestamp,
    txHash: event.transaction.hash,
  });

  await upsertUserPoolBalance(
    event.args.user, lpAddress, "totalBorrowed", event.args.amount, context,
  );

  await createPoolSnapshot(
    lpAddress, "BorrowDebt", BigInt(event.block.number),
    event.log.logIndex, event.block.timestamp, context,
  );
});

ponder.on("EmitterV2:RepayByPosition", async ({ event, context }) => {
  const lpAddress = event.transaction.to as Hex;

  await context.db.insert(repayByPositionEvent).values({
    id: `${event.block.number}_${event.log.logIndex}`,
    lendingPool: lpAddress,
    user: event.args.user,
    amount: event.args.amount,
    shares: event.args.shares,
    blockNumber: BigInt(event.block.number),
    timestamp: event.block.timestamp,
    txHash: event.transaction.hash,
  });

  await upsertUserPoolBalance(
    event.args.user, lpAddress, "totalRepaid", event.args.amount, context,
  );

  await createPoolSnapshot(
    lpAddress, "RepayByPosition", BigInt(event.block.number),
    event.log.logIndex, event.block.timestamp, context,
  );
});

ponder.on("EmitterV2:WithdrawCollateral", async ({ event, context }) => {
  const lpAddress = event.transaction.to as Hex;

  await context.db.insert(withdrawCollateralEvent).values({
    id: `${event.block.number}_${event.log.logIndex}`,
    lendingPool: lpAddress,
    user: event.args.user,
    amount: event.args.amount,
    blockNumber: BigInt(event.block.number),
    timestamp: event.block.timestamp,
    txHash: event.transaction.hash,
  });

  await upsertUserPoolBalance(
    event.args.user, lpAddress, "totalCollateralWithdrawn", event.args.amount, context,
  );
});

ponder.on("EmitterV2:AdminGranted", async ({ event, context }) => {
  await context.db
    .insert(emitterAdmin)
    .values({ id: event.args.account, isAdmin: true })
    .onConflictDoUpdate({ isAdmin: true });
});

ponder.on("EmitterV2:AdminRevoked", async ({ event, context }) => {
  await context.db
    .insert(emitterAdmin)
    .values({ id: event.args.account, isAdmin: false })
    .onConflictDoUpdate({ isAdmin: false });
});
