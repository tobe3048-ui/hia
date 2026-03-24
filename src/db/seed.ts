import { db } from "./index";
import { users } from "./schema";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("Seeding users...");

  const hashedPassword = await bcrypt.hash("password123", 10);

  const seedUsers = [
    {
      email: "test1@me.com",
      password: hashedPassword,
      displayName: "Test User 1",
      age: 25,
      lookingFor: "Friends",
      neighborhood: "West Village",
      height: "5'10\"",
      weight: "165 lbs",
      bodyType: "Athletic",
      ethnicity: "Mixed",
      position: "Vers",
      profilePhotoUrl: "https://picsum.photos/seed/user1/800/1000",
    },
    {
      email: "test2@me.com",
      password: hashedPassword,
      displayName: "Test User 2",
      age: 30,
      lookingFor: "Dates",
      neighborhood: "Chelsea",
      height: "6'1\"",
      weight: "180 lbs",
      bodyType: "Muscular",
      ethnicity: "White",
      position: "Top",
      profilePhotoUrl: "https://picsum.photos/seed/user2/800/1000",
    },
    {
      email: "test3@me.com",
      password: hashedPassword,
      displayName: "Test User 3",
      age: 22,
      lookingFor: "Right Now",
      neighborhood: "Hell's Kitchen",
      height: "5'8\"",
      weight: "150 lbs",
      bodyType: "Slim",
      ethnicity: "Asian",
      position: "Bottom",
      profilePhotoUrl: "https://picsum.photos/seed/user3/800/1000",
    },
    {
      email: "test4@me.com",
      password: hashedPassword,
      displayName: "Test User 4",
      age: 28,
      lookingFor: "Relationship",
      neighborhood: "Brooklyn Heights",
      height: "5'11\"",
      weight: "170 lbs",
      bodyType: "Average",
      ethnicity: "Black",
      position: "Vers Top",
      profilePhotoUrl: "https://picsum.photos/seed/user4/800/1000",
    },
    {
      email: "test5@me.com",
      password: hashedPassword,
      displayName: "Test User 5",
      age: 35,
      lookingFor: "Networking",
      neighborhood: "Upper East Side",
      height: "6'0\"",
      weight: "190 lbs",
      bodyType: "Large",
      ethnicity: "Latino",
      position: "Vers Bottom",
      profilePhotoUrl: "https://picsum.photos/seed/user5/800/1000",
    }
  ];

  for (const user of seedUsers) {
    try {
      await db.insert(users).values(user).onConflictDoNothing();
      console.log(`User ${user.email} seeded successfully.`);
    } catch (error) {
      console.error(`Error seeding user ${user.email}:`, error);
    }
  }

  console.log("Seeding completed.");
  process.exit(0);
}

seed();
