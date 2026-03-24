import { db } from "./src/db/index";
import { sql } from "drizzle-orm";

async function migrate() {
  console.log("Migrating database...");
  try {
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS show_distance BOOLEAN DEFAULT TRUE`);
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS show_neighborhood BOOLEAN DEFAULT TRUE`);
    await db.execute(sql`ALTER TABLE photos ADD COLUMN IF NOT EXISTS thumb_data TEXT`);
    console.log("Migration successful.");
  } catch (error) {
    console.error("Migration failed:", error);
  }
  process.exit(0);
}

migrate();
