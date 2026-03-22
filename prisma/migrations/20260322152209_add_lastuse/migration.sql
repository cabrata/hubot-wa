-- AlterTable
ALTER TABLE `chats` ADD COLUMN `warngempa` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `guilds` ADD COLUMN `aliansi` JSON NOT NULL,
    ADD COLUMN `donasi` JSON NOT NULL,
    ADD COLUMN `storage` JSON NOT NULL;

-- AlterTable
ALTER TABLE `user_cooldown` ADD COLUMN `lastBirthday` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `lastLeaveG` BIGINT NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `lastUseCommand` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `lastUseTime` BIGINT NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `staff_activity` (
    `jid` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL,
    `management` VARCHAR(191) NOT NULL DEFAULT '-',
    `age` VARCHAR(191) NOT NULL DEFAULT '-',
    `botNumber` VARCHAR(191) NOT NULL DEFAULT '-',
    `addedAt` BIGINT NOT NULL DEFAULT 0,
    `dailyCmds` INTEGER NOT NULL DEFAULT 0,
    `modCmds` INTEGER NOT NULL DEFAULT 0,
    `inactiveDays` INTEGER NOT NULL DEFAULT 0,
    `lastResetDay` VARCHAR(191) NOT NULL DEFAULT '2026-01-01',

    PRIMARY KEY (`jid`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bot_ownership` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'Official',
    `owner` VARCHAR(191) NOT NULL,
    `staff` JSON NOT NULL,
    `bots` JSON NOT NULL,
    `names` JSON NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bursa` (
    `id` VARCHAR(191) NOT NULL,
    `ownerJid` VARCHAR(191) NOT NULL,
    `ticker` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `price` DOUBLE NOT NULL DEFAULT 0,
    `sharesAvailable` BIGINT NOT NULL DEFAULT 0,
    `totalShares` BIGINT NOT NULL DEFAULT 0,
    `funds` DOUBLE NOT NULL DEFAULT 0,

    UNIQUE INDEX `bursa_ownerJid_key`(`ownerJid`),
    UNIQUE INDEX `bursa_ticker_key`(`ticker`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `market_assets` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `basePrice` DOUBLE NOT NULL DEFAULT 0,
    `volatility` DOUBLE NOT NULL DEFAULT 0,
    `vLiq` DOUBLE NOT NULL DEFAULT 0,
    `currentPrice` DOUBLE NOT NULL DEFAULT 0,
    `previousPrice` DOUBLE NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `market_global` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `lastUpdate` BIGINT NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `giveaway` (
    `id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `isDaget` BOOLEAN NOT NULL DEFAULT false,
    `amount` DOUBLE NULL,
    `totalAmount` DOUBLE NULL,
    `remainingAmount` DOUBLE NULL,
    `totalReceivers` INTEGER NOT NULL DEFAULT 0,
    `creator` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'open',
    `closedAt` BIGINT NULL,
    `participants` JSON NULL,
    `claimed` JSON NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `redeem_codes` (
    `code` VARCHAR(191) NOT NULL,
    `creator` VARCHAR(191) NOT NULL,
    `since` BIGINT NOT NULL DEFAULT 0,
    `reward` JSON NOT NULL,
    `claim` JSON NOT NULL,
    `expired` BIGINT NOT NULL DEFAULT 0,
    `limituser` INTEGER NOT NULL DEFAULT 0,
    `forWho` JSON NOT NULL,
    `blocked` JSON NOT NULL,

    PRIMARY KEY (`code`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mod_redeem_state` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `weeklyCount` INTEGER NOT NULL DEFAULT 0,
    `dailyCount` JSON NOT NULL,
    `resetWeekly` BIGINT NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
