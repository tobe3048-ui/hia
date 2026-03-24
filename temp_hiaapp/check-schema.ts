import { db } from "./src/db/index";
import { users } from "./src/db/schema";
import { sql } from "drizzle-orm";

async function checkSchema() {
  try {
    const result = await db.execute(sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'users'`);
    console.log('Columns in users table:', result.rows.map(r => r.column_name));
  } catch (error) {
    console.error('Error checking schema:', error.message);
  }
}

checkSchema();
