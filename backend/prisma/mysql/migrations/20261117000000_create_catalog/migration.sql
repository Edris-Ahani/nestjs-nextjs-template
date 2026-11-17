-- CreateTable
CREATE TABLE `catalog_items` (
    `id` VARCHAR(36) NOT NULL,
    `slug` VARCHAR(80) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `description` VARCHAR(1000) NOT NULL,
    `created_at` TIMESTAMP(3) NOT NULL,

    UNIQUE INDEX `catalog_items_slug_key`(`slug`),
    INDEX `catalog_items_created_at_id_idx`(`created_at` DESC, `id` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
