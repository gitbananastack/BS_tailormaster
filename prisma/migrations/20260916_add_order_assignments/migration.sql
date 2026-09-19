CREATE TABLE `OrderAssignment` (
  `id` VARCHAR(191) NOT NULL,
  `orderId` VARCHAR(191) NOT NULL,
  `stage` ENUM('CUTTING', 'STITCHING', 'QUALITY_CHECK', 'PACKING', 'DELIVERY') NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `OrderAssignment_orderId_stage_key` (`orderId`, `stage`),
  KEY `OrderAssignment_userId_idx` (`userId`),
  CONSTRAINT `OrderAssignment_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `OrderAssignment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
