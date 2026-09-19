-- Resume the job-order intake migration after adding REFERENCES to stitchflow_app.
-- The metadata columns on `Order` were created in the preceding migration.

CREATE TABLE `OrderItem` (
  `id` VARCHAR(191) NOT NULL,
  `orderId` VARCHAR(191) NOT NULL,
  `itemName` VARCHAR(191) NOT NULL,
  `color` VARCHAR(191) NULL,
  `clientOrderReference` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `OrderItem_orderId_idx` (`orderId`),
  CONSTRAINT `OrderItem_orderId_fkey`
    FOREIGN KEY (`orderId`) REFERENCES `Order` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `OrderSizeQuantity` (
  `id` VARCHAR(191) NOT NULL,
  `orderItemId` VARCHAR(191) NOT NULL,
  `size` INT NOT NULL,
  `quantity` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `OrderSizeQuantity_orderItemId_size_key` (`orderItemId`, `size`),
  KEY `OrderSizeQuantity_size_idx` (`size`),
  CONSTRAINT `OrderSizeQuantity_orderItemId_fkey`
    FOREIGN KEY (`orderItemId`) REFERENCES `OrderItem` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `OrderSizeQuantity_size_check` CHECK (`size` IN (38, 40, 42, 44, 46, 48, 50)),
  CONSTRAINT `OrderSizeQuantity_quantity_check` CHECK (`quantity` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `RawMaterialReceipt` (
  `id` VARCHAR(191) NOT NULL,
  `orderId` VARCHAR(191) NOT NULL,
  `itemCode` VARCHAR(191) NULL,
  `itemName` VARCHAR(191) NOT NULL,
  `color` VARCHAR(191) NULL,
  `panna` DECIMAL(12,2) NULL,
  `quantity` DECIMAL(12,2) NOT NULL,
  `unit` VARCHAR(191) NOT NULL DEFAULT 'm',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `RawMaterialReceipt_orderId_idx` (`orderId`),
  CONSTRAINT `RawMaterialReceipt_orderId_fkey`
    FOREIGN KEY (`orderId`) REFERENCES `Order` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `RawMaterialReceipt_quantity_check` CHECK (`quantity` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
