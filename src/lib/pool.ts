import type { Hex } from "viem";
import { lendingPool, poolRateParams, poolSnapshot, userPoolBalance } from "ponder:schema";
import { LendingPoolRouterAbi } from "../abis/LendingPoolRouterAbi";
import { WAD, DEFAULT_RESERVE_FACTOR } from "./constants";
import { calculateBorrowRate, calculateSupplyAPR } from "./calculations";

export async function createPoolSnapshot(
  lpAddress: Hex,
  eventType: string,
  blockNumber: bigint,
  logIndex: number,
  timestamp: bigint,
  context: any,
) {
  const pool = await context.db.find(lendingPool, { id: lpAddress });
  if (!pool) return;

  const routerAddress = pool.router as Hex;

  const [totalSupplyAssets, totalBorrowAssets] = await Promise.all([
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

  await context.db.insert(poolSnapshot).values({
    id: `${lpAddress}_${blockNumber}_${logIndex}`,
    lendingPool: lpAddress,
    router: routerAddress,
    totalSupplyAssets,
    totalBorrowAssets,
    availableLiquidity: totalSupplyAssets - totalBorrowAssets,
    utilization,
    borrowRate,
    supplyAPR,
    eventType,
    blockNumber,
    timestamp,
  });
}

export async function upsertUserPoolBalance(
  user: Hex,
  lpAddress: Hex,
  field:
    | "totalSupplied"
    | "totalWithdrawn"
    | "totalBorrowed"
    | "totalRepaid"
    | "totalCollateralSupplied"
    | "totalCollateralWithdrawn",
  amount: bigint,
  context: any,
) {
  const id = `${user}_${lpAddress}`;
  const existing = await context.db.find(userPoolBalance, { id });

  if (existing) {
    await context.db
      .update(userPoolBalance, { id })
      .set({ [field]: (existing[field] as bigint) + amount });
  } else {
    await context.db.insert(userPoolBalance).values({
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
    });
  }
}
