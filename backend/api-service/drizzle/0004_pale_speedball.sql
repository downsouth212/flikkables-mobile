CREATE TABLE IF NOT EXISTS "api"."decorations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"emoji" text NOT NULL,
	"category" text NOT NULL,
	"stamp_cost" integer DEFAULT 0 NOT NULL,
	"happiness_boost" integer DEFAULT 0 NOT NULL,
	"description" text,
	"level_requirement" integer DEFAULT 1 NOT NULL,
	"locked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "api"."trophies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"quest_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"icon" text NOT NULL,
	"rarity" text NOT NULL,
	"stamps_value" integer DEFAULT 100 NOT NULL,
	"exchanged" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "api"."user_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"decoration_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"is_placed" boolean DEFAULT false NOT NULL,
	"x" double precision DEFAULT 50 NOT NULL,
	"y" double precision DEFAULT 50 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "api"."flikkables" ADD COLUMN "happiness" integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE "api"."flikkables" ADD COLUMN "last_fed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "api"."flikkables" ADD COLUMN "mood_day" text;--> statement-breakpoint
ALTER TABLE "api"."flikkables" ADD COLUMN "is_flikkstar" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "api"."flikkables" ADD COLUMN "pickers" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "api"."profiles" ADD COLUMN "returned_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "api"."profiles" ADD COLUMN "total_km" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "api"."profiles" ADD COLUMN "garden_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "api"."profiles" ADD COLUMN "longest_streak" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "api"."profiles" ADD COLUMN "total_logins" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "api"."profiles" ADD COLUMN "streak_cycle" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "api"."profiles" ADD COLUMN "last_spin_day" text;--> statement-breakpoint
ALTER TABLE "api"."profiles" ADD COLUMN "last_spin_prize" text;--> statement-breakpoint
ALTER TABLE "api"."profiles" ADD COLUMN "dq_day" text;--> statement-breakpoint
ALTER TABLE "api"."profiles" ADD COLUMN "dq_flicked" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "api"."profiles" ADD COLUMN "dq_returned" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "api"."profiles" ADD COLUMN "dq_flikk_claimed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "api"."profiles" ADD COLUMN "dq_return_claimed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "api"."profiles" ADD COLUMN "milestones" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "api"."profiles" ADD COLUMN "quests" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "api"."profiles" ADD COLUMN "last_seen_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "trophies_user_idx" ON "api"."trophies" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_items_user_idx" ON "api"."user_items" USING btree ("user_id");