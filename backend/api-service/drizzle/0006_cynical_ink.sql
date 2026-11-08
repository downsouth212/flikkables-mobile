CREATE TABLE IF NOT EXISTS "api"."character_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"prompt" text DEFAULT '' NOT NULL,
	"job_id" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"error" text,
	"is_published" boolean DEFAULT false NOT NULL,
	"is_locked" boolean DEFAULT false NOT NULL,
	"stamp_cost" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "api"."template_unlocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"template_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "api"."flikkables" ADD COLUMN "template_id" uuid;--> statement-breakpoint
ALTER TABLE "api"."postcards" ADD COLUMN "owner_id" text;--> statement-breakpoint
ALTER TABLE "api"."postcards" ADD COLUMN "user_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "api"."postcards" ADD COLUMN "character_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "api"."postcards" ADD COLUMN "character_emoji" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "api"."postcards" ADD COLUMN "sent_to_owner" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "api"."postcards" ADD COLUMN "sent_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "template_unlocks_user_idx" ON "api"."template_unlocks" USING btree ("user_id");