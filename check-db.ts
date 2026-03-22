import { db } from "./src/db/index";
import { users } from "./src/db/schema";

async function checkDb() {
  try {
    const allUsers = await db.select().from(users);
    console.log('✅ DB Connection: Success');
    console.log('Total Users:', allUsers.length);
    if (allUsers.length > 0) {
      console.log('Last User Email:', allUsers[allUsers.length - 1].email);
    }
  } catch (error) {
    console.error('❌ DB Connection Failed:', error.message);
  }
}

checkDb();
