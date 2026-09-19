CREATE TABLE `LaborCostEntry` (
  `id` VARCHAR(191) NOT NULL,
  `orderId` VARCHAR(191) NOT NULL,
  `stage` ENUM('CUTTING', 'STITCHING', 'QUALITY_CHECK', 'PACKING', 'DELIVERY') NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `amount` DECIMAL(12, 2) NOT NULL,
  `note` TEXT NULL,
  `isApproved` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `LaborCostEntry_orderId_stage_idx` (`orderId`, `stage`),
  INDEX `LaborCostEntry_userId_idx` (`userId`),
  CONSTRAINT `LaborCostEntry_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `LaborCostEntry_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
);
