import pkg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pkg;

export const pool = new Pool({
    connectionString: process.env.SA_DATABASE_URL,
    ssl: {
        require: true,
        rejectUnauthorized: false, // Neon requires this
    },
});

pool.connect()
    .then(() => console.log("✅ Connected to Neon PostgreSQL"))
    .catch(err => console.error("❌ DB Error:", err));
