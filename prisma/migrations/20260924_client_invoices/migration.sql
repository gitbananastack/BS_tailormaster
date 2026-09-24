CREATE TABLE `ClientInvoice` (
  `id` VARCHAR(191) NOT NULL,
  `invoiceNumber` VARCHAR(191) NOT NULL,
  `shareToken` VARCHAR(191) NOT NULL,
  `orderId` VARCHAR(191) NOT NULL,
  `amount` DECIMAL(12, 2) NOT NULL,
  `description` TEXT NULL,
  `notes` TEXT NULL,
  `status` ENUM('DRAFT', 'ISSUED', 'PAID', 'CANCELLED') NOT NULL DEFAULT 'ISSUED',
  `issueDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `dueDate` DATETIME(3) NULL,
  `createdById` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `ClientInvoice_invoiceNumber_key`(`invoiceNumber`),
  UNIQUE INDEX `ClientInvoice_shareToken_key`(`shareToken`),
  INDEX `ClientInvoice_orderId_idx`(`orderId`),
  INDEX `ClientInvoice_createdById_idx`(`createdById`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `ClientInvoice` ADD CONSTRAINT `ClientInvoice_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ClientInvoice` ADD CONSTRAINT `ClientInvoice_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
