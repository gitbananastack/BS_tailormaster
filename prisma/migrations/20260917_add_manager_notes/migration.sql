CREATE TABLE `OrderManagerNote` (
  `id` VARCHAR(191) NOT NULL,
  `orderId` VARCHAR(191) NOT NULL,
  `stage` ENUM('CUTTING', 'STITCHING', 'QUALITY_CHECK', 'PACKING', 'DELIVERY') NOT NULL,
  `message` TEXT NOT NULL,
  `authorId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `OrderManagerNote_orderId_stage_createdAt_idx` (`orderId`, `stage`, `createdAt`),
  CONSTRAINT `OrderManagerNote_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `OrderManagerNote_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
);
