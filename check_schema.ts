import { db } from "./src/db/index";
import { sql } from "drizzle-orm";

async function checkSchema() {
  console.log("Checking schema...");
  try {
    const tables = ['users', 'photos', 'photo_unlocks', 'conversations', 'messages', 'message_deletions', 'right_now_sessions', 'favorites', 'blocks'];
    for (const table of tables) {
      const result = await db.execute(sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = ${table}
      `);
      console.log(`${table} table columns:`, result.rows.map(r => r.column_name));
    }
  } catch (error) {
    console.error("Failed to check schema:", error);
  }
  process.exit(0);
}

checkSchema();
