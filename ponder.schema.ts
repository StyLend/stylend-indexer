import { onchainTable, index, primaryKey } from "ponder";

// ── Factory config singleton ────────────────────────────────────────────────
export const factoryConfig = onchainTable("factory_config", (t) => ({
  id: t.text().primaryKey(),
  owner: t.hex(),
  paused: t.boolean().notNull(),
  protocol: t.hex(),
  isHealthy: t.hex(),
  lendingPoolDeployer: t.hex(),
  positionDeployer: t.hex(),
  lendingPoolRouterDeployer: t.hex(),
  tokenDataStream: t.hex(),
  interestRateModel: t.hex(),
  proxyDeployer: t.hex(),
  sharesTokenDeployer: t.hex(),
  wrappedNative: t.hex(),
  dexRouter: t.hex(),
  senjaEmitter: t.hex(),
}));

// ── Factory operators ───────────────────────────────────────────────────────
export const factoryOperator = onchainTable("factory_operator", (t) => ({
  id: t.hex().primaryKey(),
  status: t.boolean().notNull(),
}));

// ── OFT address mappings ────────────────────────────────────────────────────
export const factoryOftAddress = onchainTable("factory_oft_address", (t) => ({
  id: t.hex().primaryKey(),
  oftAddress: t.hex().notNull(),
}));

// ── Min supply liquidity per token ──────────────────────────────────────────
export const factoryMinSupply = onchainTable("factory_min_supply", (t) => ({
  id: t.hex().primaryKey(),
  minAmount: t.bigint().notNull(),
}));

// ── Creator fee per router ──────────────────────────────────────────────────
export const factoryCreatorFee = onchainTable("factory_creator_fee", (t) => ({
  id: t.hex().primaryKey(),
  fee: t.bigint().notNull(),
}));

// ── Chain ID to EID mappings ────────────────────────────────────────────────
export const factoryChainEid = onchainTable("factory_chain_eid", (t) => ({
  id: t.bigint().primaryKey(),
  eid: t.integer().notNull(),
}));

// ── Lending pools ───────────────────────────────────────────────────────────
export const lendingPool = onchainTable(
  "lending_pool",
  (t) => ({
    id: t.hex().primaryKey(),
    owner: t.hex(),
    collateralToken: t.hex().notNull(),
    borrowToken: t.hex().notNull(),
    ltv: t.bigint().notNull(),
    supplyLiquidity: t.bigint().notNull(),
    baseRate: t.bigint().notNull(),
    rateAtOptimal: t.bigint().notNull(),
    optimalUtilization: t.bigint().notNull(),
    maxUtilization: t.bigint().notNull(),
    maxRate: t.bigint().notNull(),
    liquidationThreshold: t.bigint().notNull(),
    liquidationBonus: t.bigint().notNull(),
    router: t.hex().notNull(),
    routerImplementation: t.hex().notNull(),
    lendingPoolImplementation: t.hex().notNull(),
    sharesToken: t.hex().notNull(),
    createdAtBlock: t.bigint().notNull(),
    createdAtTimestamp: t.bigint().notNull(),
  }),
  (table) => ({
    collateralTokenIdx: index().on(table.collateralToken),
    borrowTokenIdx: index().on(table.borrowToken),
  }),
);

// ── Emitter: Positions ──────────────────────────────────────────────────────
export const position = onchainTable(
  "position",
  (t) => ({
    id: t.hex().primaryKey(),
    lendingPool: t.hex().notNull(),
    lendingPoolRouter: t.hex().notNull(),
    user: t.hex().notNull(),
    createdAtBlock: t.bigint().notNull(),
    createdAtTimestamp: t.bigint().notNull(),
  }),
  (table) => ({
    userIdx: index().on(table.user),
    lendingPoolIdx: index().on(table.lendingPool),
  }),
);

// ── Emitter: Shares token deployments ───────────────────────────────────────
export const sharesTokenDeployment = onchainTable("shares_token_deployment", (t) => ({
  id: t.hex().primaryKey(),
  lendingPoolRouter: t.hex().notNull(),
}));

// ── Emitter: Supply liquidity events ────────────────────────────────────────
export const supplyLiquidityEvent = onchainTable(
  "supply_liquidity_event",
  (t) => ({
    id: t.text().primaryKey(),
    lendingPool: t.hex().notNull(),
    user: t.hex().notNull(),
    amount: t.bigint().notNull(),
    shares: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.bigint().notNull(),
    txHash: t.hex().notNull(),
  }),
  (table) => ({
    userIdx: index().on(table.user),
    lendingPoolIdx: index().on(table.lendingPool),
  }),
);

// ── Emitter: Withdraw liquidity events ──────────────────────────────────────
export const withdrawLiquidityEvent = onchainTable(
  "withdraw_liquidity_event",
  (t) => ({
    id: t.text().primaryKey(),
    lendingPool: t.hex().notNull(),
    user: t.hex().notNull(),
    amount: t.bigint().notNull(),
    shares: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.bigint().notNull(),
    txHash: t.hex().notNull(),
  }),
  (table) => ({
    userIdx: index().on(table.user),
    lendingPoolIdx: index().on(table.lendingPool),
  }),
);

// ── Emitter: Supply collateral events ───────────────────────────────────────
export const supplyCollateralEvent = onchainTable(
  "supply_collateral_event",
  (t) => ({
    id: t.text().primaryKey(),
    lendingPool: t.hex().notNull(),
    positionAddress: t.hex().notNull(),
    user: t.hex().notNull(),
    amount: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.bigint().notNull(),
    txHash: t.hex().notNull(),
  }),
  (table) => ({
    userIdx: index().on(table.user),
    lendingPoolIdx: index().on(table.lendingPool),
  }),
);

// ── Emitter: Borrow debt events ─────────────────────────────────────────────
export const borrowDebtEvent = onchainTable(
  "borrow_debt_event",
  (t) => ({
    id: t.text().primaryKey(),
    lendingPool: t.hex().notNull(),
    user: t.hex().notNull(),
    protocolFee: t.bigint().notNull(),
    userAmount: t.bigint().notNull(),
    shares: t.bigint().notNull(),
    amount: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.bigint().notNull(),
    txHash: t.hex().notNull(),
  }),
  (table) => ({
    userIdx: index().on(table.user),
    lendingPoolIdx: index().on(table.lendingPool),
  }),
);

// ── Emitter: Repay events ───────────────────────────────────────────────────
export const repayByPositionEvent = onchainTable(
  "repay_by_position_event",
  (t) => ({
    id: t.text().primaryKey(),
    lendingPool: t.hex().notNull(),
    user: t.hex().notNull(),
    amount: t.bigint().notNull(),
    shares: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.bigint().notNull(),
    txHash: t.hex().notNull(),
  }),
  (table) => ({
    userIdx: index().on(table.user),
    lendingPoolIdx: index().on(table.lendingPool),
  }),
);

// ── Emitter: Withdraw collateral events ─────────────────────────────────────
export const withdrawCollateralEvent = onchainTable(
  "withdraw_collateral_event",
  (t) => ({
    id: t.text().primaryKey(),
    lendingPool: t.hex().notNull(),
    user: t.hex().notNull(),
    amount: t.bigint().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.bigint().notNull(),
    txHash: t.hex().notNull(),
  }),
  (table) => ({
    userIdx: index().on(table.user),
    lendingPoolIdx: index().on(table.lendingPool),
  }),
);

// ── Emitter: Admin management ───────────────────────────────────────────────
export const emitterAdmin = onchainTable("emitter_admin", (t) => ({
  id: t.hex().primaryKey(),
  isAdmin: t.boolean().notNull(),
}));

// ── IRM: Pool rate parameters (keyed by LPR address) ───────────────────────
export const poolRateParams = onchainTable("pool_rate_params", (t) => ({
  id: t.hex().primaryKey(),
  baseRate: t.bigint().notNull(),
  rateAtOptimal: t.bigint().notNull(),
  optimalUtilization: t.bigint().notNull(),
  maxUtilization: t.bigint().notNull(),
  maxRate: t.bigint().notNull(),
  reserveFactor: t.bigint().notNull(),
}));

// ── IRM: Config singleton ──────────────────────────────────────────────────
export const irmConfig = onchainTable("irm_config", (t) => ({
  id: t.text().primaryKey(),
  owner: t.hex(),
  scaledPercentage: t.bigint(),
}));

// ── Pool snapshots (time-series for APY/utilization charts) ────────────────
export const poolSnapshot = onchainTable(
  "pool_snapshot",
  (t) => ({
    id: t.text().primaryKey(),
    lendingPool: t.hex().notNull(),
    router: t.hex().notNull(),
    totalSupplyAssets: t.bigint().notNull(),
    totalBorrowAssets: t.bigint().notNull(),
    availableLiquidity: t.bigint().notNull(),
    utilization: t.bigint().notNull(),
    borrowRate: t.bigint().notNull(),
    supplyAPR: t.bigint().notNull(),
    eventType: t.text().notNull(),
    blockNumber: t.bigint().notNull(),
    timestamp: t.bigint().notNull(),
  }),
  (table) => ({
    lendingPoolIdx: index().on(table.lendingPool),
    timestampIdx: index().on(table.timestamp),
  }),
);

// ── User pool balances (running totals per user per pool) ──────────────────
export const userPoolBalance = onchainTable(
  "user_pool_balance",
  (t) => ({
    id: t.text().primaryKey(),
    user: t.hex().notNull(),
    lendingPool: t.hex().notNull(),
    totalSupplied: t.bigint().notNull(),
    totalWithdrawn: t.bigint().notNull(),
    totalBorrowed: t.bigint().notNull(),
    totalRepaid: t.bigint().notNull(),
    totalCollateralSupplied: t.bigint().notNull(),
    totalCollateralWithdrawn: t.bigint().notNull(),
  }),
  (table) => ({
    userIdx: index().on(table.user),
    lendingPoolIdx: index().on(table.lendingPool),
  }),
);
