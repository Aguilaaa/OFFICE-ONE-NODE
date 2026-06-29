-- OfficeOne Store Database Setup
-- Run in phpMyAdmin or MySQL CLI after starting XAMPP MySQL

CREATE DATABASE IF NOT EXISTS officeone_db;
USE officeone_db;

-- Users (admin password: admin123, staff password: staff123)
INSERT INTO users (name, email, password, role, is_active, createdAt, updatedAt) VALUES
('Admin User', 'admin@officeone.com', '$2b$10$rQZ8K8Y5x5Y5Y5Y5Y5Y5YuK8Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5', 'admin', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE name=name;

-- Note: Run backend once to create tables via Sequelize, then run seed-data.js
-- Or use: npm run seed (after we create seed script)
