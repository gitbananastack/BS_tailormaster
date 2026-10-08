ALTER TABLE `OrderAssignment`
  DROP INDEX `OrderAssignment_orderId_stage_key`,
  ADD UNIQUE INDEX `OrderAssignment_orderId_stage_userId_key` (`orderId`, `stage`, `userId`),
  ADD INDEX `OrderAssignment_orderId_stage_idx` (`orderId`, `stage`);
