-- Speed up current-stage and per-worker status lookups as order history grows.
CREATE INDEX `OrderStatusUpdate_orderId_stage_userId_createdAt_idx`
ON `OrderStatusUpdate`(`orderId`, `stage`, `userId`, `createdAt`);
