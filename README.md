<p align="center">
  <img src="./stylend-logo.webp" alt="StyLend" width="200" />
</p>

<h1 align="center">StyLend Indexer</h1>

<p align="center"><b>Real-time on-chain indexer for the StyLend lending protocol on Arbitrum Stylus</b></p>

StyLend Indexer tracks all lending pool activity (supply, borrow, repay, withdraw, collateral) and computes real-time metrics like APY, utilization, and interest rates. Built with [Ponder](https://ponder.sh) for event-driven indexing with a GraphQL API.

## Features

- **Real-time pool metrics** — Utilization rate, available liquidity per pool
- **APY calculations** — Supply APY, borrow APR computed from the two-slope interest rate model
- **Historical snapshots** — Time-series pool snapshots on every supply/borrow/repay/withdraw event
- **Per-user tracking** — Running totals of supply, borrow, collateral per user per pool
- **Multi-pool support** — Automatically discovers new pools from Factory events
- **IRM parameter tracking** — Real-time interest rate model configuration changes

## Architecture

```
Arbitrum Sepolia
        │
        │  Events
        ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  StyLendEmitter │     │ InterestRateModel │     │     Factory     │
│  (all lending   │     │  (rate param      │     │  (pool creation │
│   events)       │     │   changes)        │     │   events)       │
└────────┬────────┘     └────────┬──────────┘     └────────┬────────┘
         │                       │                          │
         └───────────────────────┼──────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │     Ponder Indexer      │
                    │                        │
                    │  • Event handlers      │
                    │  • Rate calculations   │
                    │  • Snapshot logic       │
                    └────────────┬───────────┘
                                 │
                    ┌────────────┴───────────┐
                    │      PostgreSQL         │
                    │                        │
                    │  • 20 tables           │
                    │  • Snapshots           │
                    │  • User balances       │
                    └────────────┬───────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │   GraphQL + SQL API    │
                    │                        │
                    │  • /           (GQL)   │
                    │  • /graphql    (GQL)   │
                    │  • /sql/*     (client) │
                    └────────────────────────┘
```

## Indexed Events

### StyLendEmitter V2 (`0xf39ce77de228b30effb947fdab1ec2ac961212e7`)

| Event | Description |
|-------|-------------|
| `SupplyLiquidity(user, amount, shares)` | User deposits into pool |
| `WithdrawLiquidity(user, amount, shares)` | User withdraws from pool |
| `BorrowDebt(user, protocolFee, userAmount, shares, amount)` | User borrows from pool |
| `RepayByPosition(user, amount, shares)` | User repays debt |
| `SupplyCollateral(positionAddress, user, amount)` | User deposits collateral |
| `WithdrawCollateral(user, amount)` | User withdraws collateral |
| `PositionCreated(lendingPool, router, user, position)` | New borrower position |
| `SharesTokenDeployed(router, sharesToken)` | Pool shares token created |
| `AdminGranted / AdminRevoked(account)` | Emitter admin management |

### InterestRateModel (`0x1c1c290df8fe859778fe21eeada7a30c6d91587f`)

| Event | Description |
|-------|-------------|
| `LendingPoolBaseRateSet(pool, rate)` | Base rate updated |
| `LendingPoolRateAtOptimalSet(pool, rate)` | Kink rate updated |
| `LendingPoolOptimalUtilizationSet(pool, utilization)` | Optimal utilization updated |
| `LendingPoolMaxUtilizationSet(pool, utilization)` | Max utilization updated |
| `LendingPoolMaxRateSet(pool, maxRate)` | Max rate cap updated |
| `TokenReserveFactorSet(pool, reserveFactor)` | Reserve factor updated |
| `ScaledPercentageSet(percentage)` | Global scaled percentage updated |

### LendingPoolFactory (`0x6ce797460987931a88d061d0cb2729af36e6e754`)

22 events tracked including `LendingPoolCreated`, `OperatorSet`, `MinSupplyLiquiditySet`, `FactoryPaused/Unpaused`, and all configuration changes.

## Key Calculations

All rates use **1e18 = 100%** scaling. See [`docs/INDEXER_CALCULATIONS.md`](./docs/INDEXER_CALCULATIONS.md) for full formulas.

### Utilization Rate

```
utilization = totalBorrowAssets × 1e18 / totalSupplyAssets
```

### Borrow APR (Two-Slope Model)

```
if utilization <= optimalUtilization:
    borrowRate = baseRate + (utilization × (rateAtOptimal - baseRate)) / optimalUtilization

if utilization > optimalUtilization:
    borrowRate = rateAtOptimal + (excess × (maxRate - rateAtOptimal)) / (1e18 - optimalUtilization)
```

### Supply APR

```
supplyAPR = borrowRate × utilization × (1e18 - reserveFactor) / (1e18 × 1e18)
```

Where `reserveFactor` defaults to 1e17 (10%).

## Data Schema

### Core Tables

```
lending_pool
├── id                      # LendingPool address (primary key)
├── collateralToken / borrowToken
├── ltv / liquidationThreshold / liquidationBonus
├── router / routerImplementation / lendingPoolImplementation
├── sharesToken
├── baseRate / rateAtOptimal / optimalUtilization / maxUtilization / maxRate
├── supplyLiquidity
└── createdAtBlock / createdAtTimestamp

pool_snapshot                    # Time-series (created on each supply/borrow/repay/withdraw)
├── id                           # ${lp}_${block}_${logIndex}
├── lendingPool / router
├── totalSupplyAssets / totalBorrowAssets / availableLiquidity
├── utilization / borrowRate / supplyAPR
├── eventType
└── blockNumber / timestamp

user_pool_balance                # Running totals per user per pool
├── id                           # ${user}_${lp}
├── user / lendingPool
├── totalSupplied / totalWithdrawn
├── totalBorrowed / totalRepaid
└── totalCollateralSupplied / totalCollateralWithdrawn

pool_rate_params                 # IRM parameters per pool router
├── id                           # LendingPoolRouter address
├── baseRate / rateAtOptimal / optimalUtilization
├── maxUtilization / maxRate / reserveFactor

position                         # Borrower positions
├── id                           # Position contract address
├── lendingPool / lendingPoolRouter / user
└── createdAtBlock / createdAtTimestamp
```

### Event Tables

`supply_liquidity_event`, `withdraw_liquidity_event`, `supply_collateral_event`, `borrow_debt_event`, `repay_by_position_event`, `withdraw_collateral_event` — each with `lendingPool`, `user`, `amount`, `blockNumber`, `timestamp`, `txHash`.

### Factory Tables

`factory_config`, `factory_operator`, `factory_oft_address`, `factory_min_supply`, `factory_creator_fee`, `factory_chain_eid`.

### Other

`irm_config` (singleton), `shares_token_deployment`, `emitter_admin`.

## On-Chain Data Sources

The indexer reads on-chain state via `readContract` after each lending event to compute snapshots:

| Contract | Function | Data |
|----------|----------|------|
| LendingPoolRouter | `totalSupplyAssets()` | Total supplied |
| LendingPoolRouter | `totalBorrowAssets()` | Total borrowed |

> **Note:** Requires an archive RPC node for historical block reads during backfill. Public RPCs may not support this.

## Project Structure

```
stylend-indexer/
├── ponder.config.ts              # Chain, contract, & block config
├── ponder.schema.ts              # Database schema (20 tables)
├── src/
│   ├── index.ts                  # Barrel imports for all handlers
│   ├── handlers/
│   │   ├── factory.ts            # 22 LendingPoolFactory event handlers
│   │   ├── lendingPool.ts        # LendingPool ownership handler
│   │   ├── irm.ts                # 8 InterestRateModel handlers
│   │   └── emitter.ts            # 13 EmitterV2 event handlers
│   ├── lib/
│   │   ├── constants.ts          # WAD, default reserve factor, IDs
│   │   ├── calculations.ts       # Borrow rate & supply APR formulas
│   │   └── pool.ts               # Snapshot creation & user balance upsert
│   ├── constant/
│   │   └── addresses.ts          # Contract addresses
│   ├── abis/                     # TypeScript ABI definitions
│   │   ├── LendingPoolFactoryAbi.ts
│   │   ├── LendingPoolAbi.ts
│   │   ├── LendingPoolRouterAbi.ts
│   │   ├── StyLendEmitterAbi.ts
│   │   └── InterestRateModelAbi.ts
│   └── api/
│       └── index.ts              # GraphQL + SQL API routes (Hono)
├── abis/                         # JSON ABIs (source)
├── docs/
│   └── INDEXER_CALCULATIONS.md   # Detailed calculation reference
├── .env.local                    # Environment config (gitignored)
├── package.json
├── pnpm-lock.yaml
└── tsconfig.json
```

## Getting Started

### Prerequisites

- Node.js >= 18
- pnpm >= 8
- PostgreSQL 15+

### Setup

```bash
# Install dependencies
pnpm install

# Create environment config
cp .env.local.example .env.local
# Edit .env.local with your RPC URL and database config

# Run the indexer (development)
pnpm dev

# Run the indexer (production)
pnpm start
```

### Environment Variables

```env
# Arbitrum Sepolia RPC (archive node recommended for full backfill)
PONDER_RPC_URL_421614=wss://arbitrum-sepolia-rpc.publicnode.com

# PostgreSQL database
DATABASE_URL=postgresql://user:password@localhost:5432/ponder_db
```

> `DATABASE_SCHEMA` is auto-generated with a timestamp on `pnpm start` (e.g. `stylend_20260217_151535`).

### GraphQL API

Once running, the GraphQL playground is available at:
- **Development:** `http://localhost:42069`
- **Production:** `https://api.stylend.xyz`

**Example queries:**

```graphql
# Get all lending pools
query {
  lendingPools {
    items {
      id
      router
      borrowToken
      collateralToken
      ltv
      liquidationThreshold
    }
  }
}

# Get historical snapshots for a pool
query {
  poolSnapshots(
    where: { lendingPool: "0x..." }
    orderBy: "timestamp"
    orderDirection: "desc"
    limit: 100
  ) {
    items {
      timestamp
      totalSupplyAssets
      totalBorrowAssets
      borrowRate
      supplyAPR
      utilization
      eventType
    }
  }
}

# Get user balances across all pools
query {
  userPoolBalances(where: { user: "0x..." }) {
    items {
      lendingPool
      totalSupplied
      totalWithdrawn
      totalBorrowed
      totalRepaid
      totalCollateralSupplied
      totalCollateralWithdrawn
    }
  }
}

# Get rate parameters for a pool
query {
  poolRateParamss {
    items {
      id
      baseRate
      rateAtOptimal
      optimalUtilization
      maxRate
      reserveFactor
    }
  }
}
```

## Contract Addresses (Arbitrum Sepolia)

| Contract | Address |
|----------|---------|
| **LendingPoolFactory** | [`0x6ce797460987931a88d061d0cb2729af36e6e754`](https://sepolia.arbiscan.io/address/0x6ce797460987931a88d061d0cb2729af36e6e754) |
| **StyLendEmitter V2** | [`0xf39ce77de228b30effb947fdab1ec2ac961212e7`](https://sepolia.arbiscan.io/address/0xf39ce77de228b30effb947fdab1ec2ac961212e7) |
| **InterestRateModel** | [`0x1c1c290df8fe859778fe21eeada7a30c6d91587f`](https://sepolia.arbiscan.io/address/0x1c1c290df8fe859778fe21eeada7a30c6d91587f) |

See the [smart contract repo](https://github.com/StyLend/stylend-sc) for full contract details and ABIs.

## Related

- [stylend-sc](https://github.com/StyLend/stylend-sc) — Smart contracts (Rust/Stylus)
- [Indexer Calculations Reference](./docs/INDEXER_CALCULATIONS.md) — Detailed formulas for all metrics

## Tech Stack

| Component | Technology |
|-----------|------------|
| Indexer Framework | [Ponder](https://ponder.sh) v0.16.3 |
| Language | TypeScript |
| Database | PostgreSQL |
| API | GraphQL + SQL (Hono) |
| Network | Arbitrum Sepolia (421614) |
| Node | Node.js 18+ |

## License

MIT / Apache-2.0
