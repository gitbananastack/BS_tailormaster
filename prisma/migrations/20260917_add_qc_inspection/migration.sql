CREATE TABLE `QcInspection` (
  `id` VARCHAR(191) NOT NULL,
  `orderId` VARCHAR(191) NOT NULL,
  `inspectorId` VARCHAR(191) NOT NULL,
  `result` ENUM('PENDING', 'PASSED', 'REWORK_REQUIRED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  `stitchingPassed` BOOLEAN NOT NULL DEFAULT false,
  `measurementPassed` BOOLEAN NOT NULL DEFAULT false,
  `finishingPassed` BOOLEAN NOT NULL DEFAULT false,
  `defectPhotoPath` TEXT NULL,
  `rejectionReason` TEXT NULL,
  `reworkStage` ENUM('CUTTING', 'STITCHING', 'QUALITY_CHECK', 'PACKING', 'DELIVERY') NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`), UNIQUE INDEX `QcInspection_orderId_key` (`orderId`),
  CONSTRAINT `QcInspection_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `QcInspection_inspectorId_fkey` FOREIGN KEY (`inspectorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
);
