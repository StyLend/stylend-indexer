import type { Hex } from "viem";
import { lendingPool, poolRateParams, poolSnapshot, protocolTvl, userPoolBalance } from "ponder:schema";
import { LendingPoolRouterAbi } from "../abis/LendingPoolRouterAbi";
import { WAD, DEFAULT_RESERVE_FACTOR, PROTOCOL_TVL_ID } from "./constants";
import { calculateBorrowRate, calculateSupplyAPR } from "./calculations";

export async function createPoolSnapshot(
  lpAddress: Hex,
  eventType: string,
  blockNumber: bigint,
  logIndex: number,
  timestamp: bigint,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any,
) {
  const pool = await context.db.find(lendingPool, { id: lpAddress });
  if (!pool) {
    console.warn(`[snapshot] Pool ${lpAddress} not found, skipping`);
    return;
  }

  const routerAddress = pool.router as Hex;

  let totalSupplyAssets: bigint;
  let totalBorrowAssets: bigint;

  try {
    [totalSupplyAssets, totalBorrowAssets] = await Promise.all([
      context.client.readContract({
        abi: LendingPoolRouterAbi,
        address: routerAddress,
        functionName: "totalSupplyAssets",
      }) as Promise<bigint>,
      context.client.readContract({
        abi: LendingPoolRouterAbi,
        address: routerAddress,
        functionName: "totalBorrowAssets",
      }) as Promise<bigint>,
    ]);
  } catch (error) {
    console.warn(
      `[snapshot] RPC read failed for pool ${lpAddress} at block ${blockNumber}: ${error instanceof Error ? error.message : "unknown error"}`,
    );
    return;
  }

  const rateParams = await context.db.find(poolRateParams, {
    id: routerAddress,
  });

  const utilization =
    totalSupplyAssets > 0n
      ? (totalBorrowAssets * WAD) / totalSupplyAssets
      : 0n;

  const reserveFactor = rateParams?.reserveFactor ?? DEFAULT_RESERVE_FACTOR;

  const borrowRate = rateParams
    ? calculateBorrowRate(totalSupplyAssets, totalBorrowAssets, rateParams)
    : 0n;

  const supplyAPR =
    totalSupplyAssets > 0n
      ? calculateSupplyAPR(borrowRate, utilization, reserveFactor)
      : 0n;

  const totalCollateral = BigInt(pool.totalCollateral ?? 0);

  await context.db.insert(poolSnapshot).values({
    id: `${lpAddress}_${blockNumber}_${logIndex}`,
    lendingPool: lpAddress,
    router: routerAddress,
    totalSupplyAssets,
    totalBorrowAssets,
    totalCollateral,
    availableLiquidity: totalSupplyAssets - totalBorrowAssets,
    utilization,
    borrowRate,
    supplyAPR,
    eventType,
    blockNumber,
    timestamp,
  });

  // Compute deltas from the pool's last-known snapshot values
  const oldSupply = BigInt(pool.lastSnapshotSupply ?? 0);
  const oldBorrow = BigInt(pool.lastSnapshotBorrow ?? 0);
  const oldCollateral = BigInt(pool.lastSnapshotCollateral ?? 0);

  await updateProtocolTvl(
    totalSupplyAssets - oldSupply,
    totalBorrowAssets - oldBorrow,
    totalCollateral - oldCollateral,
    timestamp,
    context,
  );

  // Update the pool with latest snapshot values for future delta computation
  await context.db
    .update(lendingPool, { id: lpAddress })
    .set({
      lastSnapshotSupply: totalSupplyAssets,
      lastSnapshotBorrow: totalBorrowAssets,
      lastSnapshotCollateral: totalCollateral,
    });
}

async function updateProtocolTvl(
  supplyDelta: bigint,
  borrowDelta: bigint,
  collateralDelta: bigint,
  timestamp: bigint,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any,
) {
  const existing = await context.db.find(protocolTvl, { id: PROTOCOL_TVL_ID });

  if (existing) {
    await context.db
      .update(protocolTvl, { id: PROTOCOL_TVL_ID })
      .set({
        totalSupplyAssets: existing.totalSupplyAssets + supplyDelta,
        totalBorrowAssets: existing.totalBorrowAssets + borrowDelta,
        totalCollateral: existing.totalCollateral + collateralDelta,
        lastUpdatedAt: timestamp,
      });
  } else {
    // First snapshot ever — deltas ARE the absolute values
    await context.db.insert(protocolTvl).values({
      id: PROTOCOL_TVL_ID,
      totalSupplyAssets: supplyDelta > 0n ? supplyDelta : 0n,
      totalBorrowAssets: borrowDelta > 0n ? borrowDelta : 0n,
      totalCollateral: collateralDelta > 0n ? collateralDelta : 0n,
      poolCount: 1,
      lastUpdatedAt: timestamp,
    });
  }
}

type BalanceField =
  | "totalSupplied"
  | "totalWithdrawn"
  | "totalBorrowed"
  | "totalRepaid"
  | "totalCollateralSupplied"
  | "totalCollateralWithdrawn";

export async function upsertUserPoolBalance(
  user: Hex,
  lpAddress: Hex,
  field: BalanceField,
  amount: bigint,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any,
) {
  const id = `${user}_${lpAddress}`;
  const existing = await context.db.find(userPoolBalance, { id });

  if (existing) {
    await context.db
      .update(userPoolBalance, { id })
      .set({ [field]: (existing[field] as bigint) + amount });
  } else {
    await context.db
      .insert(userPoolBalance)
      .values({
        id,
        user,
        lendingPool: lpAddress,
        totalSupplied: 0n,
        totalWithdrawn: 0n,
        totalBorrowed: 0n,
        totalRepaid: 0n,
        totalCollateralSupplied: 0n,
        totalCollateralWithdrawn: 0n,
        [field]: amount,
      })
      .onConflictDoUpdate({ [field]: amount });
  }
}
