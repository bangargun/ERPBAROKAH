-- ==============================================================================
-- SKRIP INISIALISASI DATABASE MYSQL SYSTEM MRIS (mris_db)
-- Hostinger phpMyAdmin & VPS Cloud Enterprise Engine
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS `mris_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `mris_db`;

-- 1. TABEL CABANG / OUTLET
CREATE TABLE IF NOT EXISTS `outlets` (
  `id` BIGINT PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(255) NOT NULL,
  `address` TEXT,
  `location` TEXT,
  `manager_name` VARCHAR(150),
  `phone` VARCHAR(50),
  `target_omzet` DECIMAL(15,2) DEFAULT 0,
  `employee_count` INT DEFAULT 0,
  `status` VARCHAR(50) DEFAULT 'Aktif',
  `color` VARCHAR(20) DEFAULT '#6366f1',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. TABEL KATEGORI PRODUK & EXPENSE
CREATE TABLE IF NOT EXISTS `categories` (
  `id` BIGINT PRIMARY KEY,
  `code` VARCHAR(50),
  `name` VARCHAR(255) NOT NULL,
  `type` VARCHAR(50) DEFAULT 'income', -- 'income' atau 'expense'
  `icon` VARCHAR(100) DEFAULT 'Utensils',
  `status` VARCHAR(50) DEFAULT 'Aktif',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. TABEL KATALOG PRODUK & MENU KASIR
CREATE TABLE IF NOT EXISTS `products` (
  `id` BIGINT PRIMARY KEY,
  `sku` VARCHAR(100),
  `name` VARCHAR(255) NOT NULL,
  `category_id` BIGINT,
  `category_name` VARCHAR(255),
  `price` DECIMAL(15,2) NOT NULL DEFAULT 0,
  `cost_price` DECIMAL(15,2) DEFAULT 0,
  `stock` DECIMAL(15,2) DEFAULT 0,
  `unit` VARCHAR(50) DEFAULT 'Porsi',
  `outlet_id` BIGINT,
  `selected_outlet_ids` TEXT,
  `image_url` LONGTEXT,
  `description` TEXT,
  `status` VARCHAR(50) DEFAULT 'Aktif',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_prod_cat` (`category_id`),
  INDEX `idx_prod_outlet` (`outlet_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. TABEL PELANGGAN & MEMBER LOYALITAS
CREATE TABLE IF NOT EXISTS `customers` (
  `id` BIGINT PRIMARY KEY,
  `code` VARCHAR(50) UNIQUE,
  `name` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(50),
  `outlet_id` BIGINT,
  `join_date` DATE,
  `total_spend` DECIMAL(15,2) DEFAULT 0,
  `points` INT DEFAULT 0,
  `tier` VARCHAR(50) DEFAULT 'Reguler',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. TABEL LEDGER TRANSAKSI PENJUALAN UTAMA (SALES TRANSACTIONS)
CREATE TABLE IF NOT EXISTS `sales_transactions` (
  `id` VARCHAR(100) PRIMARY KEY,
  `receipt_no` VARCHAR(100),
  `date` DATE NOT NULL,
  `time` TIME,
  `outlet_id` BIGINT,
  `branch_id` BIGINT,
  `branch_name` VARCHAR(255),
  `outlet` VARCHAR(255),
  `customer_name` VARCHAR(255) DEFAULT 'Pelanggan Umum',
  `table_number` VARCHAR(50),
  `order_type` VARCHAR(50) DEFAULT 'Dine In',
  `subtotal` DECIMAL(15,2) NOT NULL DEFAULT 0,
  `discount_amount` DECIMAL(15,2) DEFAULT 0,
  `service_charge` DECIMAL(15,2) DEFAULT 0,
  `tax_amount` DECIMAL(15,2) DEFAULT 0,
  `adjustment_amount` DECIMAL(15,2) DEFAULT 0,
  `amount` DECIMAL(15,2) NOT NULL DEFAULT 0,
  `paid_amount` DECIMAL(15,2) DEFAULT 0,
  `change_amount` DECIMAL(15,2) DEFAULT 0,
  `payment_method` VARCHAR(100) DEFAULT 'Cash',
  `cashier` VARCHAR(150),
  `notes` TEXT,
  `status` VARCHAR(50) DEFAULT 'approved',
  `type` VARCHAR(50) DEFAULT 'income',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_sales_date` (`date`),
  INDEX `idx_sales_outlet` (`outlet_id`),
  INDEX `idx_sales_payment` (`payment_method`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. TABEL RINCIAN ITEM TERJUAL PER STRUK (TRANSACTION ITEMS)
CREATE TABLE IF NOT EXISTS `transaction_items` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `transaction_id` VARCHAR(100) NOT NULL,
  `product_id` BIGINT,
  `product_name` VARCHAR(255) NOT NULL,
  `price` DECIMAL(15,2) NOT NULL DEFAULT 0,
  `qty` DECIMAL(15,2) NOT NULL DEFAULT 1,
  `subtotal` DECIMAL(15,2) NOT NULL DEFAULT 0,
  `notes` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`transaction_id`) REFERENCES `sales_transactions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. TABEL TUTUP SHIFT KASIR & REKONSILIASI KAS (SHIFT CLOSINGS)
CREATE TABLE IF NOT EXISTS `shift_closings` (
  `id` VARCHAR(100) PRIMARY KEY,
  `date` DATE NOT NULL,
  `outlet_id` BIGINT,
  `branch_name` VARCHAR(255),
  `author_name` VARCHAR(150) NOT NULL,
  `opening_float` DECIMAL(15,2) DEFAULT 0,
  `net_sales` DECIMAL(15,2) DEFAULT 0,
  `cash_sales` DECIMAL(15,2) DEFAULT 0,
  `non_cash_sales` DECIMAL(15,2) DEFAULT 0,
  `total_expense` DECIMAL(15,2) DEFAULT 0,
  `expected_cash` DECIMAL(15,2) DEFAULT 0,
  `cash_physical` DECIMAL(15,2) DEFAULT 0,
  `cash_variance` DECIMAL(15,2) DEFAULT 0,
  `status` VARCHAR(50) DEFAULT 'ditunda',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_shift_date` (`date`),
  INDEX `idx_shift_outlet` (`outlet_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. TABEL LOG MUTASI STOK BAHAN BAKU (STOCK MOVEMENT)
CREATE TABLE IF NOT EXISTS `stock_movement` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `date` DATE NOT NULL,
  `time` TIME,
  `ingredient_id` BIGINT,
  `ingredient_name` VARCHAR(255) NOT NULL,
  `type` VARCHAR(50) NOT NULL, -- 'IN', 'OUT', 'TRANSFER', 'WASTE'
  `qty` DECIMAL(15,2) NOT NULL DEFAULT 0,
  `unit` VARCHAR(50) DEFAULT 'kg',
  `outlet_id` BIGINT,
  `source_outlet` VARCHAR(255),
  `target_outlet` VARCHAR(255),
  `reason` TEXT,
  `user_name` VARCHAR(150),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_stock_date` (`date`),
  INDEX `idx_stock_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. TABEL AKUN PENGGUNA (USERS)
CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `username` VARCHAR(100) UNIQUE NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `role` VARCHAR(100) DEFAULT 'Kasir',
  `outlet` VARCHAR(255) DEFAULT 'Semua Outlet (Central)',
  `status` VARCHAR(50) DEFAULT 'Aktif',
  `can_login_mobile` TINYINT(1) DEFAULT 1,
  `mobile_login_password` VARCHAR(100),
  `can_access_mobile_reports` TINYINT(1) DEFAULT 1,
  `mobile_report_password` VARCHAR(100),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. TABEL DOKUMEN SOP RESTORAN
CREATE TABLE IF NOT EXISTS `sop_documents` (
  `id` BIGINT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100) DEFAULT 'Operasional Kasir',
  `version` VARCHAR(50) DEFAULT 'v1.0',
  `author` VARCHAR(150),
  `status` VARCHAR(50) DEFAULT 'Aktif',
  `content` LONGTEXT,
  `last_updated` DATE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==============================================================================
-- INSERTS DUMMY / INITIAL ACCOUNTS SETUP
-- ==============================================================================

INSERT INTO `users` (`id`, `name`, `username`, `password`, `role`, `outlet`, `status`, `can_login_mobile`, `mobile_login_password`, `can_access_mobile_reports`, `mobile_report_password`)
VALUES (1, 'Super Admin Restoran', 'superadmin', '888', 'Super Admin', 'Semua Outlet (Central)', 'Aktif', 1, '888', 1, '8888')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);
