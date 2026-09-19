ALTER TABLE `Order`
  ADD COLUMN `inwardValue` DECIMAL(12,2) NULL,
  ADD COLUMN `qrToken` VARCHAR(191) NULL,
  ADD UNIQUE KEY `Order_qrToken_key` (`qrToken`);
