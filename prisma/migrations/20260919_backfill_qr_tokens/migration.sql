UPDATE `Order`
SET `qrToken` = CONCAT('ORDER-', `orderNumber`, '-', UUID())
WHERE `qrToken` IS NULL;
