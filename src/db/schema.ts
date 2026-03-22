import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, boolean, doublePrecision, timestamp, unique } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  displayName: text("display_name").notNull(),
  age: integer("age"),
  bio: text("bio"),
  lookingFor: varchar("looking_for", { length: 100 }),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password"),
  dateOfBirth: varchar("date_of_birth", { length: 20 }),
  height: varchar("height", { length: 20 }),
  weight: varchar("weight", { length: 20 }),
  bodyType: varchar("body_type", { length: 50 }),
  ethnicity: varchar("ethnicity", { length: 100 }),
  relationshipStatus: varchar("relationship_status", { length: 100 }),
  position: varchar("position", { length: 50 }),
  lastSeen: timestamp("last_seen").default(sql`NOW()`),
  isOnline: boolean("is_online").default(false),
  isIncognito: boolean("is_incognito").default(false),
  profilePhotoUrl: text("profile_photo_url"),
  profilePhotoThumbUrl: text("profile_photo_thumb_url"),
  showAge: boolean("show_age").default(true),
  neighborhood: varchar("neighborhood", { length: 100 }),
  showNeighborhood: boolean("show_neighborhood").default(true),
  meetAt: varchar("meet_at", { length: 200 }),
  createdAt: timestamp("created_at").default(sql`NOW()`),
});

export const photos = pgTable("photos", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  photoData: text("photo_data").notNull(),
  isLocked: boolean("is_locked").default(false),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").default(sql`NOW()`),
});

export const photoUnlocks = pgTable("photo_unlocks", {
  id: serial("id").primaryKey(),
  photoOwnerId: integer("photo_owner_id").references(() => users.id),
  unlockedForUserId: integer("unlocked_for_user_id").references(() => users.id),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").default(sql`NOW()`),
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  user1Id: integer("user1_id").references(() => users.id),
  user2Id: integer("user2_id").references(() => users.id),
  createdAt: timestamp("created_at").default(sql`NOW()`),
  updatedAt: timestamp("updated_at").default(sql`NOW()`),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => conversations.id),
  senderId: integer("sender_id").references(() => users.id),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  unsentAt: timestamp("unsent_at"),
  createdAt: timestamp("created_at").default(sql`NOW()`),
});

export const messageDeletions = pgTable("message_deletions", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").references(() => messages.id),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").default(sql`NOW()`),
}, (t) => [unique().on(t.messageId, t.userId)]);

export const rightNowSessions = pgTable("right_now_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  status: text("status"),
  isHosting: boolean("is_hosting").default(false),
  isActive: boolean("is_active").default(true),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").default(sql`NOW()`),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Photo = typeof photos.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type RightNowSession = typeof rightNowSessions.$inferSelect;
