import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function initializeDatabase() {
    try {
        console.log("Connecting to MySQL...");
        
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            port: process.env.DB_PORT
        });

        const dbName = process.env.DB_NAME || 'hostel_allocation_db';
        
        console.log(`Checking if database '${dbName}' exists...`);
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
        
        // Use the created database
        await connection.query(`USE \`${dbName}\`;`);
        console.log(`✅ Database '${dbName}' is ready!`);

        // 1. Create Rooms Table (Renamed from Labs)
        console.log("Creating 'rooms' table...");
        await connection.query(`
            CREATE TABLE IF NOT EXISTS rooms (
                id INT PRIMARY KEY AUTO_INCREMENT,
                room_number VARCHAR(50) NOT NULL,
                hostel_block VARCHAR(10) NOT NULL, -- e.g., 'A', 'B', 'C'
                capacity INT NOT NULL DEFAULT 2,     -- Total beds
                occupied_beds INT DEFAULT 0,         -- Currently filled beds
                floor INT NOT NULL,
                room_type ENUM('AC', 'Non-AC') NOT NULL,
                version INT DEFAULT 0                -- FOR OPTIMISTIC LOCKING
            );
        `);

        // 2. Create Students Table
        console.log("Creating 'students' table...");
        await connection.query(`
            CREATE TABLE IF NOT EXISTS students (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(100) NOT NULL,
                roll_number VARCHAR(20) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                cgpa FLOAT NOT NULL,
                year_of_study INT NOT NULL,
                priority_score FLOAT DEFAULT 0,      -- Calculated: CGPA*10 + Year*2
                preferred_block VARCHAR(10),
                preferred_floor INT,
                ac_preference ENUM('AC', 'Non-AC'),
                allocated_room_id INT,               -- Foreign key to rooms table
                FOREIGN KEY (allocated_room_id) REFERENCES rooms(id) ON DELETE SET NULL
            );
        `);

        // 3. Create Users Table (For Auth)
        console.log("Creating 'users' table...");
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT PRIMARY KEY AUTO_INCREMENT,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role ENUM('admin', 'student', 'hostel_warden') DEFAULT 'student'
            );
        `);

        console.log(`✅ All tables (Rooms, Students, Users) initialized for Hostel System.`);
        
        await connection.end();
        console.log(`Database setup complete. You can now start the backend server.`);
    } catch (error) {
        console.error("❌ Failed to initialize database.");
        console.error(error.message);
        process.exit(1);
    }
}

initializeDatabase();