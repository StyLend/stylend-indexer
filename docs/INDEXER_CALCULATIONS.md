# StyLend Indexer Calculations

Reference document for implementing pool metrics in the indexer (Ponder/subgraph).

---

## Table of Contents

1. [Contract Addresses & Data Sources](#1-contract-addresses--data-sources)
2. [Events to Index](#2-events-to-index)
3. [On-Chain Read Functions](#3-on-chain-read-functions)
4. [TVL (Total Value Locked)](#4-tvl-total-value-locked)
5. [Available Liquidity](#5-available-liquidity)
6. [Utilization Rate](#6-utilization-rate)
7. [Borrow Interest Rate (APR)](#7-borrow-interest-rate-apr)
8. [Earn APY (Supply APY)](#8-earn-apy-supply-apy)
9. [Historical APY & Interest Rate](#9-historical-apy--interest-rate)
10. [Per-User Metrics](#10-per-user-metrics)
11. [Decimal Handling](#11-decimal-handling)
12. [Interest Rate Model Parameters](#12-interest-rate-model-parameters)

---

## 1. Contract Addresses & Data Sources

### Singleton Contracts (Arbitrum Sepolia)

| Contract | Address | Purpose |
|----------|---------|---------|
| Factory | `0x6ce797460987931a88d061d0cb2729af36e6e754` | Pool registry, creates new pools |
| InterestRateModel (IRM) | `0x1c1c290df8fe859778fe21eeada7a30c6d91587f` | Rate calculation params per pool |
| Protocol | `0x1017e1509e6ac180e4864bc46407a8bec70363d3` | Protocol fee config |
| StyLendEmitter V2 | `0xf39ce77de228b30effb947fdab1ec2ac961212e7` | Centralized event emitter |
| TokenDataStream | `0x1145895ef3d3eb9f624acb8dc65ec40bd8e4cd39` | Token price feeds |
| IsHealthy | `0x04cf7500937c675c3b7e3fdff007523ada184fcf` | Health factor / liquidation checks |

### Per-Pool Contracts (created by Factory)

Each pool consists of 3 EIP-1167 clones:

| Contract | Role |
|----------|------|
| **LendingPool (LP)** | User-facing entry point (supply, borrow, withdraw, repay) |
| **LendingPoolRouter (LPR)** | State management (balances, shares, interest accrual) |
| **SharesToken (ST)** | ERC20 representing supply shares |

Plus per-user **Position** contracts for collateral management.

### How to Discover Pools

Listen to `PoolCreated` event from Factory, or call Factory view functions to enumerate pools.

---

## 2. Events to Index

### From StyLendEmitter V2 (`0xf39ce77...`)

All lending events are emitted through the centralized emitter. The `msg.sender` to the emitter is the LendingPool contract.

```solidity
// Pool creation
event PositionCreated(address lendingPool, address lendingPoolRouter, address user, address position);
event SharesTokenDeployed(address lendingPoolRouter, address sharesToken);

// Supply/Withdraw
event SupplyLiquidity(address user, uint256 amount, uint256 shares);
event WithdrawLiquidity(address user, uint256 amount, uint256 shares);

// Borrow/Repay
event BorrowDebt(address user, uint256 protocolFee, uint256 userAmount, uint256 shares, uint256 amount);
event RepayByPosition(address user, uint256 amount, uint256 shares);

// Collateral
event SupplyCollateral(address positionAddress, address user, uint256 amount);
event WithdrawCollateral(address user, uint256 amount);

// Admin
event AdminGranted(address account);
event AdminRevoked(address account);
event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
```

### From InterestRateModel (`0x1c1c29...`)

Listen to these to track parameter changes per pool:

```solidity
event LendingPoolBaseRateSet(address indexed lendingPool, uint256 rate);
event LendingPoolRateAtOptimalSet(address indexed lendingPool, uint256 rate);
event LendingPoolOptimalUtilizationSet(address indexed lendingPool, uint256 utilization);
event LendingPoolMaxUtilizationSet(address indexed lendingPool, uint256 utilization);
event LendingPoolMaxRateSet(address indexed lendingPool, uint256 maxRate);
event TokenReserveFactorSet(address indexed lendingPool, uint256 reserveFactor);
```

> **Note:** Emitter events don't include the pool address in the event data itself.
> The **LendingPool address** that called the emitter can be identified from `msg.sender` context
> (the emitter's `onlyAdmin` check ensures only authorized LPs call it).
> For the indexer, you'll need to track which LP called each emission.

---

## 3. On-Chain Read Functions

### LendingPoolRouter (per pool)

| Function | Selector | Returns | Description |
|----------|----------|---------|-------------|
| `totalSupplyAssets()` | `0x8914cd3d` | `uint256` | Total deposited assets (includes accrued supplier yield) |
| `totalBorrowAssets()` | `0x8914cd3d` | `uint256` | Total outstanding borrows (includes accrued interest) |
| `totalBorrowShares()` | `0x...` | `uint256` | Total borrow share tokens |
| `userBorrowShares(address)` | `0x...` | `uint256` | User's borrow share balance |
| `borrowToken()` | `0x...` | `address` | Borrow/supply token address |
| `collateralToken()` | `0x...` | `address` | Collateral token address |
| `sharesToken()` | `0x...` | `address` | ERC20 supply shares token |
| `ltv()` | `0x...` | `uint256` | Loan-to-Value ratio (scaled 1e18) |
| `lendingPool()` | `0x...` | `address` | Associated LendingPool address |
| `factory()` | `0x...` | `address` | Factory address |

### InterestRateModel (singleton, pass LPR address as param)

| Function | Selector | Returns | Description |
|----------|----------|---------|-------------|
| `lendingPoolBaseRate(address)` | `0x...` | `uint256` | Base rate (scaled 1e18) |
| `lendingPoolRateAtOptimal(address)` | `0x...` | `uint256` | Rate at optimal utilization |
| `lendingPoolOptimalUtilization(address)` | `0x...` | `uint256` | Optimal utilization target |
| `lendingPoolMaxUtilization(address)` | `0x...` | `uint256` | Max utilization cap |
| `lendingPoolMaxRate(address)` | `0x...` | `uint256` | Maximum rate cap |
| `tokenReserveFactor(address)` | `0x...` | `uint256` | Reserve factor (default: 10%) |
| `calculateBorrowRate(address,uint256,uint256)` | `0x...` | `uint256` | Current borrow rate |

### SharesToken (ERC20, per pool)

| Function | Returns | Description |
|----------|---------|-------------|
| `totalSupply()` | `uint256` | Total supply shares (18 decimals) |
| `balanceOf(address)` | `uint256` | User's supply share balance |
| `decimals()` | `uint8` | Always 18 |
| `underlyingDecimals()` | `uint8` | Borrow token decimals (6 for USDC, 18 for WETH) |

---

## 4. TVL (Total Value Locked)

### Per Pool

```
Supply TVL (in borrow token) = totalSupplyAssets
Borrow TVL (in borrow token) = totalBorrowAssets

Supply TVL (USD) = totalSupplyAssets × tokenPriceUSD / 10^tokenDecimals
Borrow TVL (USD) = totalBorrowAssets × tokenPriceUSD / 10^tokenDecimals
```

### Collateral TVL (per pool)

Sum of all positions' collateral for the pool:

```
Collateral TVL = Σ position.totalCollateral() for all positions in pool
Collateral TVL (USD) = Collateral TVL × collateralPriceUSD / 10^collateralDecimals
```

Or track incrementally from events:

```
On SupplyCollateral: collateralTVL += amount
On WithdrawCollateral: collateralTVL -= amount
On Liquidation: collateralTVL -= position.totalCollateral()
```

### Protocol-Wide TVL

```
Total TVL (USD) = Σ (Supply TVL USD + Collateral TVL USD) for all pools
```

> **Note:** Don't double-count. `totalSupplyAssets` is the deposited liquidity.
> Collateral is separate (held in Position contracts).

---

## 5. Available Liquidity

The amount available for borrowers to borrow or suppliers to withdraw:

```
Available Liquidity = totalSupplyAssets - totalBorrowAssets
```

Read directly:

```javascript
const totalSupply = await lpr.totalSupplyAssets();
const totalBorrow = await lpr.totalBorrowAssets();
const available = totalSupply - totalBorrow;
```

---

## 6. Utilization Rate

```
Utilization = totalBorrowAssets / totalSupplyAssets

// As percentage:
Utilization% = (totalBorrowAssets × 1e18) / totalSupplyAssets
```

When `totalSupplyAssets = 0`, utilization is `0`.

---

## 7. Borrow Interest Rate (APR)

### Two-Slope Model

The interest rate model uses a **kink/two-slope** design (similar to Aave/Compound):

```
Parameters per pool (read from InterestRateModel, keyed by LPR address):
  - baseRate          : minimum rate (at 0% utilization)
  - rateAtOptimal     : rate at optimal utilization
  - optimalUtilization: kink point (e.g., 75%)
  - maxRate           : maximum rate cap (at 100% utilization)
  - maxUtilization    : hard cap (e.g., 95%, reverts above this)

All values scaled by 1e18 (where 1e18 = 100%)
```

### Formula

```javascript
function calculateBorrowRate(totalSupply, totalBorrow, params) {
  if (totalSupply == 0 || totalBorrow == 0) {
    return params.baseRate;
  }

  const utilization = (totalBorrow * 1e18) / totalSupply;

  if (utilization >= params.maxUtilization) {
    // Reverts on-chain; for display, show maxRate
    return params.maxRate;
  }

  if (utilization <= params.optimalUtilization) {
    // Slope 1: gentle increase
    return params.baseRate +
      (utilization * (params.rateAtOptimal - params.baseRate)) / params.optimalUtilization;
  } else {
    // Slope 2: steep increase after kink
    const excessUtilization = utilization - params.optimalUtilization;
    const maxExcess = 1e18 - params.optimalUtilization;
    return params.rateAtOptimal +
      (excessUtilization * (params.maxRate - params.rateAtOptimal)) / maxExcess;
  }
}
```

### Borrow APR vs APY

```
Borrow APR = borrowRate (already annualized, scaled by 1e18)

// To display as percentage:
Borrow APR% = borrowRate / 1e16

// Borrow APY (compounded per second):
Borrow APY = (1 + borrowRate / YEAR_SECONDS)^YEAR_SECONDS - 1

// Simplified (for small rates, APR ≈ APY):
Borrow APY ≈ e^(borrowRate / 1e18) - 1
```

Where `YEAR_SECONDS = 31_536_000` (365 days).

### Or Just Read From Chain

```javascript
const borrowRate = await irm.calculateBorrowRate(lprAddress, totalSupply, totalBorrow);
// borrowRate is annualized, scaled by 1e18
```

---

## 8. Earn APY (Supply APY)

Suppliers earn a share of the interest paid by borrowers, minus the reserve factor (protocol cut).

### Formula

```
Supply APR = Borrow Rate × Utilization × (1 - Reserve Factor)
```

Expanded:

```javascript
function calculateSupplyAPR(totalSupply, totalBorrow, borrowRate, reserveFactor) {
  if (totalSupply == 0) return 0;

  const utilization = totalBorrow / totalSupply;  // as decimal (0-1)
  const reserveCut = reserveFactor / 1e18;         // typically 0.10 (10%)

  return borrowRate * utilization * (1 - reserveCut);
}
```

### With Exact On-Chain Values (all scaled 1e18)

```javascript
// All values in 1e18 scale
const utilization = (totalBorrow * 1e18n) / totalSupply;
const reserveFactor = await irm.tokenReserveFactor(lprAddress);
// If reserveFactor is 0, use default: 10e16 (10%)
const effectiveReserveFactor = reserveFactor == 0n ? 100_000_000_000_000_000n : reserveFactor;

const supplyAPR = (borrowRate * utilization * (1e18n - effectiveReserveFactor)) / (1e18n * 1e18n);
```

### Example

```
Pool: WETH/USDC
totalSupplyAssets = 1,000,000 USDC (1e12 raw, 6 decimals)
totalBorrowAssets =   600,000 USDC (6e11 raw)
borrowRate = 5e16 (5% APR)
reserveFactor = 1e17 (10%)

Utilization = 600,000 / 1,000,000 = 60%
Supply APR = 5% × 60% × (1 - 10%) = 5% × 60% × 90% = 2.7%
```

### Supply APY (Compounded)

```
Supply APY = (1 + supplyAPR / YEAR_SECONDS)^YEAR_SECONDS - 1
```

For practical purposes with typical DeFi rates, APR ≈ APY (difference < 0.1% for rates under 20%).

---

## 9. Historical APY & Interest Rate

### Strategy A: Event-Driven Snapshots (Recommended)

On every emitter event (`SupplyLiquidity`, `WithdrawLiquidity`, `BorrowDebt`, `RepayByPosition`), read and store the pool state:

```javascript
// On each lending event for a pool:
async function snapshotPoolMetrics(lprAddress, blockNumber, timestamp) {
  const totalSupply = await lpr.totalSupplyAssets({ blockTag: blockNumber });
  const totalBorrow = await lpr.totalBorrowAssets({ blockTag: blockNumber });
  const borrowRate = await irm.calculateBorrowRate(lprAddress, totalSupply, totalBorrow, { blockTag: blockNumber });
  const reserveFactor = await irm.tokenReserveFactor(lprAddress, { blockTag: blockNumber });

  const utilization = totalSupply > 0n ? (totalBorrow * 1e18n) / totalSupply : 0n;
  const effectiveRF = reserveFactor == 0n ? 100_000_000_000_000_000n : reserveFactor;
  const supplyAPR = totalSupply > 0n
    ? (borrowRate * utilization * (1e18n - effectiveRF)) / (1e18n * 1e18n)
    : 0n;

  return {
    pool: lprAddress,
    blockNumber,
    timestamp,
    totalSupply,
    totalBorrow,
    utilization,
    borrowRate,      // Borrow APR (1e18 scale)
    supplyAPR,       // Supply APR (1e18 scale)
    availableLiquidity: totalSupply - totalBorrow,
  };
}
```

Store these snapshots in a time-series table for historical charts.

### Strategy B: Periodic Polling

Run a cron job every N minutes (e.g., every 15 min) to snapshot all active pools.

### Strategy C: Compute from Interest Accrual Deltas

Track `totalSupplyAssets` changes over time to derive actual realized APY:

```javascript
// Between two snapshots t1 and t2:
const deltaAssets = totalSupplyAssets_t2 - totalSupplyAssets_t1;
const deltaTime = timestamp_t2 - timestamp_t1;

// Annualized realized supply yield:
const realizedAPY = (deltaAssets / totalSupplyAssets_t1) * (YEAR_SECONDS / deltaTime);
```

This gives the **actual** APY earned, accounting for utilization changes over the period.

### Recommended Schema

```sql
CREATE TABLE pool_snapshots (
  id              SERIAL PRIMARY KEY,
  pool_address    TEXT NOT NULL,         -- LendingPoolRouter address
  block_number    BIGINT NOT NULL,
  timestamp       BIGINT NOT NULL,
  total_supply    NUMERIC NOT NULL,      -- totalSupplyAssets (raw)
  total_borrow    NUMERIC NOT NULL,      -- totalBorrowAssets (raw)
  utilization     NUMERIC NOT NULL,      -- scaled 1e18
  borrow_rate     NUMERIC NOT NULL,      -- annual, scaled 1e18
  supply_apr      NUMERIC NOT NULL,      -- annual, scaled 1e18
  available_liq   NUMERIC NOT NULL,      -- raw token amount

  UNIQUE(pool_address, block_number)
);
```

### Rolling Averages

```sql
-- 7-day average supply APR for a pool
SELECT pool_address,
       AVG(supply_apr) as avg_supply_apr_7d
FROM pool_snapshots
WHERE timestamp > (EXTRACT(EPOCH FROM NOW()) - 7 * 86400)
GROUP BY pool_address;
```

---

## 10. Per-User Metrics

### User Supply Balance

```javascript
const userShares = await sharesToken.balanceOf(userAddress);
const totalShares = await sharesToken.totalSupply();
const totalSupplyAssets = await lpr.totalSupplyAssets();

// Shares token has 18 decimals, underlying may differ
const underlyingDecimals = await sharesToken.underlyingDecimals();
const sharesDecimals = 18;

const adjustedShares = (userShares * 10n**underlyingDecimals) / (10n**sharesDecimals);
const adjustedTotal = (totalShares * 10n**underlyingDecimals) / (10n**sharesDecimals);

const userSupplyBalance = (adjustedShares * totalSupplyAssets) / adjustedTotal;
```

### User Borrow Balance (with accrued interest)

```javascript
const userBorrowShares = await lpr.userBorrowShares(userAddress);
const totalBorrowShares = await lpr.totalBorrowShares();
const totalBorrowAssets = await lpr.totalBorrowAssets();

// Note: totalBorrowAssets already includes accrued interest
// (updated on every supply/borrow/repay/withdraw/liquidation operation)
const userBorrowBalance = totalBorrowShares > 0n
  ? (userBorrowShares * totalBorrowAssets) / totalBorrowShares
  : 0n;
```

### User Earnings

Track from events or compute delta:

```javascript
// From events:
// totalDeposited = Σ SupplyLiquidity.amount (for user) - Σ WithdrawLiquidity.amount (for user)
// currentBalance = userSupplyBalance (computed above)
// earnings = currentBalance - totalDeposited

// Or realized: on WithdrawLiquidity, compare withdrawn amount with originally deposited proportional shares
```

---

## 11. Decimal Handling

### Token Decimals

| Token | Decimals | 1 unit raw |
|-------|----------|-----------|
| USDC | 6 | `1_000_000` |
| USDT | 6 | `1_000_000` |
| WETH | 18 | `1_000_000_000_000_000_000` |
| WBTC | 8 | `100_000_000` |

### Rate Scaling

All rates and percentages use **1e18 = 100%**:

| Display Value | Raw Value (1e18 scale) | Calculation |
|---------------|----------------------|-------------|
| 0.01% | `1e14` | `100_000_000_000_000` |
| 0.1% | `1e15` | `1_000_000_000_000_000` |
| 1% | `1e16` | `10_000_000_000_000_000` |
| 5% | `5e16` | `50_000_000_000_000_000` |
| 10% | `1e17` | `100_000_000_000_000_000` |
| 75% | `75e16` | `750_000_000_000_000_000` |
| 80% | `8e17` | `800_000_000_000_000_000` |
| 95% | `95e16` | `950_000_000_000_000_000` |
| 100% | `1e18` | `1_000_000_000_000_000_000` |

### Converting for Display

```javascript
// Rate to percentage string
function formatRate(rate) {
  return (Number(rate) / 1e16).toFixed(2) + '%';
}

// Token amount to human readable
function formatAmount(amount, decimals) {
  return (Number(amount) / 10**decimals).toFixed(decimals > 6 ? 4 : 2);
}
```

---

## 12. Interest Rate Model Parameters

### Default Values

| Parameter | Default | Description |
|-----------|---------|-------------|
| `reserveFactor` | `1e17` (10%) | Protocol cut of interest |
| `creatorFee` | `1e14` (0.01%) | Pool creator fee on borrows |
| `protocolFee` | Read from Protocol contract | Protocol fee on borrows |

### How Interest Accrues On-Chain

Called automatically before every supply/borrow/repay/withdraw:

```
elapsedTime = block.timestamp - lastAccrued

if (elapsedTime == 0 || totalBorrowAssets == 0) → skip

// Get interest from IRM
(interest, supplyYield, reserveYield) = IRM.calculateInterest(
    lprAddress, elapsedTime, totalSupplyAssets, totalBorrowAssets
)

// Where internally:
//   interestPerYear = (totalBorrow × borrowRate) / 1e18
//   interest = (interestPerYear × elapsedTime) / YEAR_SECONDS
//   supplyYield = interest × (1 - reserveFactor)
//   reserveYield = interest × reserveFactor

// Update state:
totalBorrowAssets += interest        // debt grows
totalSupplyAssets += supplyYield     // supplier earnings grow
totalReserveAssets += reserveYield   // protocol earnings grow
lastAccrued = block.timestamp
```

### Fee Breakdown on Borrow

When a user borrows `amount`:

```
protocolFee = (amount × protocolFeeRate) / 1e18
creatorFee  = (amount × creatorFeeRate) / 1e18
userReceives = amount - protocolFee - creatorFee

// User's debt = full `amount` (fees are deducted from what they receive)
```

This is visible in the `BorrowDebt` event:
```
BorrowDebt(user, protocolFee, userAmount, shares, amount)
// where: userAmount = amount - protocolFee - creatorFee
//        protocolFee = protocolFee + creatorFee (combined in event)
```

---

## Quick Reference: Complete Indexer Flow

```
1. Listen to Factory for new pools → store pool addresses (LP, LPR, ST)
2. Listen to Emitter V2 events → track supply/borrow/repay/withdraw per pool per user
3. On each event, snapshot pool state:
   - totalSupplyAssets, totalBorrowAssets from LPR
   - Calculate utilization, borrowRate, supplyAPR
   - Store as time-series for historical charts
4. For TVL: sum totalSupplyAssets across all pools, convert to USD via price feeds
5. For APY display: use latest snapshot's supplyAPR/borrowRate
6. For historical: query snapshots over time range, compute rolling averages
```
