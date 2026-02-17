import { WAD } from "./constants";

export function calculateBorrowRate(
  totalSupply: bigint,
  totalBorrow: bigint,
  params: {
    baseRate: bigint;
    rateAtOptimal: bigint;
    optimalUtilization: bigint;
    maxUtilization: bigint;
    maxRate: bigint;
  },
): bigint {
  if (totalSupply === 0n || totalBorrow === 0n) {
    return params.baseRate;
  }

  const utilization = (totalBorrow * WAD) / totalSupply;

  if (utilization >= params.maxUtilization) {
    return params.maxRate;
  }

  if (utilization <= params.optimalUtilization) {
    return (
      params.baseRate +
      (utilization * (params.rateAtOptimal - params.baseRate)) /
        params.optimalUtilization
    );
  }

  const excessUtilization = utilization - params.optimalUtilization;
  const maxExcess = WAD - params.optimalUtilization;
  return (
    params.rateAtOptimal +
    (excessUtilization * (params.maxRate - params.rateAtOptimal)) / maxExcess
  );
}

export function calculateSupplyAPR(
  borrowRate: bigint,
  utilization: bigint,
  reserveFactor: bigint,
): bigint {
  return (borrowRate * utilization * (WAD - reserveFactor)) / (WAD * WAD);
}
