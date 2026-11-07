import { pgSchema, text, integer, timestamp, jsonb, index, doublePrecision, uuid } from 'drizzle-orm/pg-core';

// api-service tables live in their own Postgres schema so the auth-service
// (which shares the tenant Neon DB) can migrate without touching api
// tables / sequences, and vice versa. The Worker connects
// with the default search_path; queries against these tables use the
// schema-qualified names emitted by drizzle.
export const apiSchema = pgSchema('api');

export const newlyMeta = apiSchema.table(
  '_newly_meta',
  {
    id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
    project_id: text('project_id').notNull(),
    env: text('env').notNull(),
    template_version: text('template_version').notNull(),
  },
  (table) => ({
    projectIdIdx: index('_newly_meta_project_id_idx').on(table.project_id),
  }),
);

export type NewlyMetaRow = typeof newlyMeta.$inferSelect;
export type NewlyMetaInsert = typeof newlyMeta.$inferInsert;

export const kvEntries = apiSchema.table(
  'kv_entries',
  {
    key: text('key').primaryKey(),
    value: jsonb('value'),
    expires_at: timestamp('expires_at', { withTimezone: true }),
  },
  (table) => ({
    expiresAtIdx: index('kv_entries_expires_at_idx').on(table.expires_at),
  }),
);

export type KvEntriesRow = typeof kvEntries.$inferSelect;
export type KvEntriesInsert = typeof kvEntries.$inferInsert;

export const profiles = apiSchema.table('profiles', {
  user_id: text('user_id').primaryKey(),
  display_name: text('display_name').notNull(),
  home_lat: doublePrecision('home_lat').notNull(),
  home_lng: doublePrecision('home_lng').notNull(),
  home_name: text('home_name').notNull().default('Home'),
  stamps: integer('stamps').notNull().default(0),
  picked_up_count: integer('picked_up_count').notNull().default(0),
  flick_count: integer('flick_count').notNull().default(0),
  streak: integer('streak').notNull().default(0),
  last_claim_day: text('last_claim_day'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type ProfileRow = typeof profiles.$inferSelect;

export const flikkables = apiSchema.table(
  'flikkables',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    owner_id: text('owner_id').notNull(),
    owner_name: text('owner_name').notNull(),
    name: text('name').notNull(),
    emoji: text('emoji').notNull(),
    rarity: text('rarity').notNull().default('common'),
    status: text('status').notNull().default('home'),
    current_lat: doublePrecision('current_lat').notNull(),
    current_lng: doublePrecision('current_lng').notNull(),
    current_place: text('current_place').notNull(),
    home_lat: doublePrecision('home_lat').notNull(),
    home_lng: doublePrecision('home_lng').notNull(),
    total_km: doublePrecision('total_km').notNull().default(0),
    places: jsonb('places').$type<string[]>().notNull().default([]),
    times_returned: integer('times_returned').notNull().default(0),
    picked_up_by: text('picked_up_by'),
    picked_up_by_name: text('picked_up_by_name'),
    picked_up_at: timestamp('picked_up_at', { withTimezone: true }),
    last_flicked_at: timestamp('last_flicked_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    ownerIdx: index('flikkables_owner_idx').on(t.owner_id),
    statusIdx: index('flikkables_status_idx').on(t.status),
    holderIdx: index('flikkables_holder_idx').on(t.picked_up_by),
  }),
);

export type FlikkableRow = typeof flikkables.$inferSelect;

export const journeys = apiSchema.table(
  'journeys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    flikkable_id: uuid('flikkable_id').notNull(),
    event: text('event').notNull(),
    place: text('place').notNull(),
    lat: doublePrecision('lat').notNull(),
    lng: doublePrecision('lng').notNull(),
    distance_km: doublePrecision('distance_km').notNull().default(0),
    stamps: integer('stamps').notNull().default(0),
    by_user_id: text('by_user_id').notNull(),
    by_name: text('by_name').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    flikIdx: index('journeys_flikkable_idx').on(t.flikkable_id),
    byIdx: index('journeys_by_idx').on(t.by_user_id),
  }),
);

export type JourneyRow = typeof journeys.$inferSelect;

export const postcards = apiSchema.table(
  'postcards',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    flikkable_id: uuid('flikkable_id').notNull(),
    user_id: text('user_id').notNull(),
    place: text('place').notNull(),
    job_id: text('job_id').notNull(),
    status: text('status').notNull().default('queued'),
    error: text('error'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    flikIdx: index('postcards_flikkable_idx').on(t.flikkable_id),
  }),
);

export type PostcardRow = typeof postcards.$inferSelect;
