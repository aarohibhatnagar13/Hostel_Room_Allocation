import db from './models/index.js';

console.log("Connecting and altering database tables...");

db.sequelize.sync({ alter: true })
  .then(() => {
    console.log("✅ Database tables successfully synchronized and altered!");
    process.exit(0);
  })
  .catch(err => {
    console.error("❌ Sync failed:", err.message);
    process.exit(1);
  });