export const InterestRateModelAbi = [
  {
    "type": "function",
    "name": "owner",
    "inputs": [],
    "outputs": [{ "name": "", "type": "address" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "scaledPercentage",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "lendingPoolBaseRate",
    "inputs": [{ "name": "pool", "type": "address" }],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "lendingPoolRateAtOptimal",
    "inputs": [{ "name": "pool", "type": "address" }],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "lendingPoolOptimalUtilization",
    "inputs": [{ "name": "pool", "type": "address" }],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "lendingPoolMaxUtilization",
    "inputs": [{ "name": "pool", "type": "address" }],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "tokenReserveFactor",
    "inputs": [{ "name": "pool", "type": "address" }],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "lendingPoolMaxRate",
    "inputs": [{ "name": "pool", "type": "address" }],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "calculateBorrowRate",
    "inputs": [
      { "name": "lending_pool", "type": "address" },
      { "name": "total_supply", "type": "uint256" },
      { "name": "total_borrow", "type": "uint256" }
    ],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "OwnershipTransferred",
    "inputs": [
      { "name": "previousOwner", "type": "address", "indexed": true },
      { "name": "newOwner", "type": "address", "indexed": true }
    ]
  },
  {
    "type": "event",
    "name": "LendingPoolBaseRateSet",
    "inputs": [
      { "name": "lendingPool", "type": "address", "indexed": true },
      { "name": "rate", "type": "uint256", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "LendingPoolRateAtOptimalSet",
    "inputs": [
      { "name": "lendingPool", "type": "address", "indexed": true },
      { "name": "rate", "type": "uint256", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "LendingPoolOptimalUtilizationSet",
    "inputs": [
      { "name": "lendingPool", "type": "address", "indexed": true },
      { "name": "utilization", "type": "uint256", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "LendingPoolMaxUtilizationSet",
    "inputs": [
      { "name": "lendingPool", "type": "address", "indexed": true },
      { "name": "utilization", "type": "uint256", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "LendingPoolMaxRateSet",
    "inputs": [
      { "name": "lendingPool", "type": "address", "indexed": true },
      { "name": "maxRate", "type": "uint256", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "TokenReserveFactorSet",
    "inputs": [
      { "name": "lendingPool", "type": "address", "indexed": true },
      { "name": "reserveFactor", "type": "uint256", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "ScaledPercentageSet",
    "inputs": [
      { "name": "percentage", "type": "uint256", "indexed": false }
    ]
  }
] as const;
