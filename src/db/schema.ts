import {
  pgTable,
  text,
  timestamp,
  boolean,
  jsonb,
  integer,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// ===========================================
// App-specific tables
// ===========================================

/**
 * Conversations - A meeting or discussion session
 */
export const conversation = pgTable("conversation", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  title: text("title"),
  startedAt: timestamp("started_at").notNull(),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

/**
 * Conversation participants - Users participating in a conversation
 */
export const conversationParticipant = pgTable("conversation_participant", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => conversation.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  guestName: text("guest_name"),
  role: text("role").notNull().default("participant"), // 'owner' | 'participant' | 'viewer'
  joinedAt: timestamp("joined_at").notNull(),
});

/**
 * Messages - Transcribed speech segments
 */
export const message = pgTable("message", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => conversation.id, { onDelete: "cascade" }),
  speakerId: text("speaker_id").references(() => user.id, {
    onDelete: "set null",
  }),
  speakerName: text("speaker_name"),
  content: text("content").notNull(),
  startedAt: timestamp("started_at").notNull(),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at").notNull(),
});

/**
 * Topics - Extracted keywords and discussion points
 */
export const topic = pgTable("topic", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => conversation.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  summary: text("summary"),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  createdAt: timestamp("created_at").notNull(),
});

/**
 * Notes - Structured meeting notes generated from conversations
 */
export const note = pgTable("note", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => conversation.id, { onDelete: "cascade" }),
  // JSON structure: { sections: [], decisions: [], todos: [], summary: string }
  structureJson: jsonb("structure_json").notNull(),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

/**
 * Note edits - History of user edits to notes (for learning user preferences)
 */
export const noteEdit = pgTable("note_edit", {
  id: text("id").primaryKey(),
  noteId: text("note_id")
    .notNull()
    .references(() => note.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  beforeJson: jsonb("before_json").notNull(),
  afterJson: jsonb("after_json").notNull(),
  editedAt: timestamp("edited_at").notNull(),
});

/**
 * Inline research logs - Records of inline research queries
 */
export const inlineResearchLog = pgTable("inline_research_log", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => conversation.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  selectedText: text("selected_text").notNull(),
  context: text("context"),
  result: jsonb("result"),
  createdAt: timestamp("created_at").notNull(),
});
