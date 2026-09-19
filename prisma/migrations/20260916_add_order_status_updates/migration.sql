ALTER TABLE `Order` ADD COLUMN `estimatedCompletion` DATETIME(3) NULL;

CREATE TABLE `OrderStatusUpdate` (
  `id` VARCHAR(191) NOT NULL,
  `orderId` VARCHAR(191) NOT NULL,
  `status` ENUM('CREATED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED') NOT NULL,
  `comment` TEXT NULL,
  `eta` DATETIME(3) NULL,
  `userId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `OrderStatusUpdate_orderId_createdAt_idx` (`orderId`, `createdAt`),
  KEY `OrderStatusUpdate_userId_idx` (`userId`),
  CONSTRAINT `OrderStatusUpdate_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `OrderStatusUpdate_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
