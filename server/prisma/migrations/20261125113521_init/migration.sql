-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(24) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `rating` INTEGER NOT NULL DEFAULT 1000,
    `wins` INTEGER NOT NULL DEFAULT 0,
    `losses` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_username_key`(`username`),
    UNIQUE INDEX `User_email_key`(`email`),
    INDEX `User_rating_idx`(`rating`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Character` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `class` ENUM('WARRIOR', 'MAGE', 'ASSASSIN', 'GUARDIAN', 'SUPPORT') NOT NULL,
    `health` INTEGER NOT NULL,
    `attack` INTEGER NOT NULL,
    `defense` INTEGER NOT NULL,
    `speed` INTEGER NOT NULL,
    `imageUrl` VARCHAR(191) NULL,
    `isStarter` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Character_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlayerCharacter` (
    `userId` VARCHAR(191) NOT NULL,
    `characterId` VARCHAR(191) NOT NULL,
    `unlockedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`userId`, `characterId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Deck` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Deck_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DeckCharacter` (
    `deckId` VARCHAR(191) NOT NULL,
    `characterId` VARCHAR(191) NOT NULL,
    `position` INTEGER NOT NULL,

    UNIQUE INDEX `DeckCharacter_deckId_characterId_key`(`deckId`, `characterId`),
    PRIMARY KEY (`deckId`, `position`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Match` (
    `id` VARCHAR(191) NOT NULL,
    `player1Id` VARCHAR(191) NOT NULL,
    `player2Id` VARCHAR(191) NOT NULL,
    `winnerId` VARCHAR(191) NULL,
    `mode` ENUM('QUICK', 'RANKED') NOT NULL,
    `status` ENUM('WAITING', 'ACTIVE', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'WAITING',
    `gameState` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `finishedAt` DATETIME(3) NULL,

    INDEX `Match_player1Id_createdAt_idx`(`player1Id`, `createdAt`),
    INDEX `Match_player2Id_createdAt_idx`(`player2Id`, `createdAt`),
    INDEX `Match_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PlayerCharacter` ADD CONSTRAINT `PlayerCharacter_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlayerCharacter` ADD CONSTRAINT `PlayerCharacter_characterId_fkey` FOREIGN KEY (`characterId`) REFERENCES `Character`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Deck` ADD CONSTRAINT `Deck_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DeckCharacter` ADD CONSTRAINT `DeckCharacter_deckId_fkey` FOREIGN KEY (`deckId`) REFERENCES `Deck`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DeckCharacter` ADD CONSTRAINT `DeckCharacter_characterId_fkey` FOREIGN KEY (`characterId`) REFERENCES `Character`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Match` ADD CONSTRAINT `Match_player1Id_fkey` FOREIGN KEY (`player1Id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Match` ADD CONSTRAINT `Match_player2Id_fkey` FOREIGN KEY (`player2Id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Match` ADD CONSTRAINT `Match_winnerId_fkey` FOREIGN KEY (`winnerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
