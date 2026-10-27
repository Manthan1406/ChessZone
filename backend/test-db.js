
import "dotenv/config";
import pool from "./db.js";

async function testDatabase() {
  try {
    const [rows] = await pool.query("SHOW TABLES");

    console.log("MySQL connected successfully!");
    console.table(rows);
  } catch (error) {
    console.error("Database connection failed:", error.message);
  } finally {
    await pool.end();
  }
}

testDatabase();
