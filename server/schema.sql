-- 雨仪待办 (YuYi Do) MySQL 数据库表结构
CREATE DATABASE IF NOT EXISTS `yuyi_do` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `yuyi_do`;

-- 1. 用户表（支持账号注册、密码哈希、性别选择）
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(64) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `gender` ENUM('male', 'female', 'other') NOT NULL DEFAULT 'other',
  `avatar_emoji` VARCHAR(16) NOT NULL DEFAULT '✨',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. 协作空间表（支持单人 solo / 双人 couple / 多人 group + 邀请码）
CREATE TABLE IF NOT EXISTS `spaces` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `usage_mode` ENUM('solo', 'couple', 'group') NOT NULL DEFAULT 'couple',
  `invite_code` VARCHAR(12) NOT NULL UNIQUE,
  `owner_id` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_spaces_owner` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. 空间成员关联表
CREATE TABLE IF NOT EXISTS `space_members` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `space_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `role` ENUM('owner', 'member') NOT NULL DEFAULT 'member',
  `joined_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uniq_space_user` (`space_id`, `user_id`),
  CONSTRAINT `fk_sm_space` FOREIGN KEY (`space_id`) REFERENCES `spaces`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sm_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. 空间待办任务表（JSON 存储子任务、已完成成员列表与留言）
CREATE TABLE IF NOT EXISTS `tasks` (
  `id` VARCHAR(64) PRIMARY KEY,
  `space_id` INT NOT NULL,
  `creator_id` INT NOT NULL,
  `payload_json` JSON NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_tasks_space` FOREIGN KEY (`space_id`) REFERENCES `spaces`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
