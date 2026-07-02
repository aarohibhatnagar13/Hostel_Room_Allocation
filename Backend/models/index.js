import Sequelize from 'sequelize';
import dbConfig from '../config/dbConfig.js';

const isProduction = process.env.NODE_ENV === "production";

const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
  host: dbConfig.HOST,
  port: process.env.DB_PORT, 
  dialect: dbConfig.dialect,
  timezone: '+05:30', 
  logging: false,
  pool: dbConfig.pool
});

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// --- 1. STUDENT MODEL ---
db.Student = sequelize.define("student", {
  id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: Sequelize.STRING, allowNull: false },
  roll_number: { type: Sequelize.STRING, unique: true, allowNull: false },
  email: { type: Sequelize.STRING, unique: true, allowNull: false },
  password: { type: Sequelize.STRING, allowNull: false },
  gender: { type: Sequelize.ENUM('Male', 'Female'), allowNull: false },
  
  year_of_study: { type: Sequelize.INTEGER, allowNull: false },
  cgpa: { type: Sequelize.DOUBLE, defaultValue: 0 },

  // New JSON Fields for the optimized algorithm!
  preferences: { type: Sequelize.JSON, defaultValue: [] },
  roommate_ids: { type: Sequelize.JSON, defaultValue: [] },

  allocationStatus: { 
    type: Sequelize.ENUM('unallocated', 'allocated', 'confirmed', 'waitlisted'), 
    field: 'allocation_status',
    defaultValue: 'unallocated' 
  }
}, { timestamps: true, tableName: 'students' });

// --- 2. ROOM MODEL ---
db.Room = sequelize.define("room", {
  id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
  room_number: { type: Sequelize.STRING, allowNull: false },
  hostel_name: { type: Sequelize.STRING, allowNull: false },
  floor: { type: Sequelize.INTEGER, allowNull: false },
  capacity: { type: Sequelize.INTEGER, defaultValue: 2 },
  occupied_beds: { type: Sequelize.INTEGER, defaultValue: 0 },
  room_type: { type: Sequelize.ENUM('Single', 'Double', 'Triple'), allowNull: false },
  gender: { type: Sequelize.ENUM('Male', 'Female', 'Both'), defaultValue: 'Both' },
  current_occupant_gender: { type: Sequelize.ENUM('Male', 'Female', 'Both'), defaultValue: 'Both' },
  allowed_years: { type: Sequelize.JSON, allowNull: true },
  version: { type: Sequelize.INTEGER, defaultValue: 0 } 
}, { timestamps: true, tableName: 'rooms', version: true });

// --- 3. AUTHORIZED USERS ---
db.AuthorizedUser = sequelize.define("authorized_user", {
  id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
  email: { type: Sequelize.STRING, unique: true, allowNull: false },
  password: { type: Sequelize.STRING, allowNull: true },
  role: { type: Sequelize.ENUM('ADMIN', 'HOSTEL_WARDEN'), defaultValue: 'HOSTEL_WARDEN' }
}, { timestamps: true, tableName: 'authorized_users' });

// --- 4. JWT BLACKLIST ---
db.TokenBlacklist = sequelize.define("token_blacklist", {
  token: { type: Sequelize.STRING(512), primaryKey: true },
  expiresAt: { type: Sequelize.DATE, allowNull: false }
}, { timestamps: false, tableName: 'token_blacklists' });

// --- RELATIONSHIPS ---
db.Student.belongsTo(db.Room, { foreignKey: 'allocated_room_id', as: 'allocatedRoom' });
db.Room.hasMany(db.Student, { foreignKey: 'allocated_room_id', as: 'residents' });

export default db;