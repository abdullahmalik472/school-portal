-- LOCAL MySQL: run once in MySQL Workbench (Ctrl+Shift+Enter) or with the mysql command line.
-- Safe to run again: every statement uses IF NOT EXISTS.
CREATE DATABASE IF NOT EXISTS school;
USE school;

CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  role          ENUM('student', 'teacher', 'admin') NOT NULL DEFAULT 'student',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_role_created (role, created_at)   -- speeds up the "new students in last N minutes" report
);

CREATE TABLE IF NOT EXISTS courses (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  title      VARCHAR(150) NOT NULL,
  teacher_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teacher_id) REFERENCES users(id),
  INDEX idx_courses_created (created_at)
);
