import Sequelize from 'sequelize';
import dbConfig from '../config/dbConfig.js';

const isProduction = process.env.NODE_ENV === "production";

const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
  host: dbConfig.HOST,
  port: process.env.DB_PORT, 
  dialect: dbConfig.dialect,
  timezone: '+05:30', 
  dialectOptions: {
    ...(isProduction && {
      ssl: { require: true, rejectUnauthorized: false }
    }),
    dateStrings: true, 
    typeCast: true
  },
  logging: false,
  pool: dbConfig.pool
});

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// --- 1. STUDENT MODEL (Updated for Hostel) ---
db.Student = sequelize.define("student", {
  id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: Sequelize.STRING, allowNull: false },
  rollNo: { type: Sequelize.STRING, unique: true, allowNull: false },
  email: { type: Sequelize.STRING, unique: true, allowNull: false },
  password: { type: Sequelize.STRING, allowNull: false },
  
  // Academic fields for Priority Score
  yearOfStudy: { type: Sequelize.INTEGER, allowNull: false },
  cgpa: { type: Sequelize.DOUBLE, defaultValue: 0 },
  priorityScore: { type: Sequelize.DOUBLE, defaultValue: 0 },

  // Preference fields
  preferredBlock: { type: Sequelize.STRING },
  preferredFloor: { type: Sequelize.INTEGER },
  acPreference: { type: Sequelize.ENUM('AC', 'Non-AC'), defaultValue: 'Non-AC' },

  isBlacklisted: { type: Sequelize.BOOLEAN, defaultValue: false }
}, { timestamps: true, tableName: 'students' });

// --- 2. ROOM MODEL (Renamed from Lab + Optimistic Locking) ---
db.Room = sequelize.define("room", {
  id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
  roomNumber: { type: Sequelize.STRING, allowNull: false },
  hostelBlock: { type: Sequelize.STRING, allowNull: false },
  floor: { type: Sequelize.INTEGER, allowNull: false },
  capacity: { type: Sequelize.INTEGER, defaultValue: 2 },
  occupiedBeds: { type: Sequelize.INTEGER, defaultValue: 0 },
  roomType: { type: Sequelize.ENUM('AC', 'Non-AC'), defaultValue: 'Non-AC' },
  
  // OPTIMISTIC LOCKING: Sequelize increments this automatically on every update
  version: { type: Sequelize.INTEGER, defaultValue: 0 }
}, { 
  timestamps: true, 
  tableName: 'rooms',
  version: true // Tells Sequelize to handle optimistic locking via the 'version' column
});

// --- 3. AUTHORIZED USERS (Updated Role) ---
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

// =====================================
// RELATIONSHIPS
// =====================================

// A student can be allocated to ONE room
db.Student.belongsTo(db.Room, { foreignKey: 'allocatedRoomId', as: 'allocatedRoom' });

// A room can have MANY students (up to its capacity)
db.Room.hasMany(db.Student, { foreignKey: 'allocatedRoomId', as: 'residents' });

export default db;