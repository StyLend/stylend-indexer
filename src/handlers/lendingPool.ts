import { ponder } from "ponder:registry";
import { lendingPool } from "ponder:schema";

ponder.on("LendingPool:OwnershipTransferred", async ({ event, context }) => {
  const pool = await context.db.find(lendingPool, { id: event.log.address });
  if (pool) {
    await context.db
      .update(lendingPool, { id: event.log.address })
      .set({ owner: event.args.newOwner });
  }
});
