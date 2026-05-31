import { pgTable, varchar, text, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const dataSnapshots = pgTable('data_snapshots', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  category: varchar('category').notNull(),
  source: varchar('source').notNull(),
  data: jsonb('data').notNull(),
  fetchedAt: timestamp('fetched_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

export const feedbackSubmissions = pgTable('feedback_submissions', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  name: varchar('name'),
  email: varchar('email'),
  message: text('message').notNull(),
  page: varchar('page'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

export const blogPosts = pgTable('blog_posts', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  slug: varchar('slug').unique().notNull(),
  title: varchar('title').notNull(),
  excerpt: text('excerpt').notNull(),
  content: text('content').notNull(),
  tags: text('tags').array(),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  deletedAt: timestamp('deleted_at'),
});
