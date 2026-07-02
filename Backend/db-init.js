import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function initializeDatabase() {
    try {
        console.log("Connecting to MySQL on", process.env.DB_HOST || '127.0.0.1', "...");
        
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            port: process.env.DB_PORT || 3306
        });

        const dbName = process.env.DB_NAME || 'hostel_allocation_db';
        
        await connection.query(`DROP DATABASE IF EXISTS \`${dbName}\`;`);
        await connection.query(`CREATE DATABASE \`${dbName}\`;`);
        await connection.query(`USE \`${dbName}\`;`);
        
        console.log(`✅ Database '${dbName}' is ready!`);

        // 1. Create Rooms
        await connection.query(`
            CREATE TABLE IF NOT EXISTS rooms (
                id INT PRIMARY KEY AUTO_INCREMENT,
                room_number VARCHAR(50) NOT NULL,
                hostel_name VARCHAR(50) NOT NULL,
                floor INT NOT NULL,
                capacity INT NOT NULL DEFAULT 2,
                occupied_beds INT DEFAULT 0,
                room_type ENUM('Single', 'Double', 'Triple') NOT NULL,
                gender ENUM('Male', 'Female', 'Both') NOT NULL DEFAULT 'Both',
                current_occupant_gender ENUM('Male', 'Female', 'Both') DEFAULT 'Both',
                allowed_years JSON,
                version INT DEFAULT 0,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            );
        `);

        // 2. Create Students
        await connection.query(`
            CREATE TABLE IF NOT EXISTS students (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(100) NOT NULL,
                roll_number VARCHAR(20) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                gender ENUM('Male', 'Female') NOT NULL,
                cgpa FLOAT NOT NULL,
                year_of_study INT NOT NULL,
                preferences JSON,
                roommate_ids JSON,
                allocated_room_id INT,
                allocation_status ENUM('unallocated', 'allocated', 'confirmed', 'waitlisted') DEFAULT 'unallocated',
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (allocated_room_id) REFERENCES rooms(id) ON DELETE SET NULL
            );
        `);

        // 3. Create Authorized Users (MISSING TABLE ADDED)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS authorized_users (
                id INT PRIMARY KEY AUTO_INCREMENT,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255),
                role ENUM('ADMIN', 'HOSTEL_WARDEN') DEFAULT 'HOSTEL_WARDEN',
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            );
        `);

        // 4. Create Token Blacklists (MISSING TABLE ADDED)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS token_blacklists (
                token VARCHAR(512) PRIMARY KEY,
                expiresAt DATETIME NOT NULL
            );
        `);

        console.log(`✅ All tables initialized successfully!`);
        await connection.end();
        
    } catch (error) {
        console.error("❌ CRITICAL ERROR:", error);
        process.exit(1);
    }
}

initializeDatabase();