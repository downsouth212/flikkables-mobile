CREATE TABLE IF NOT EXISTS "api"."flikkables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"owner_name" text NOT NULL,
	"name" text NOT NULL,
	"emoji" text NOT NULL,
	"rarity" text DEFAULT 'common' NOT NULL,
	"status" text DEFAULT 'home' NOT NULL,
	"current_lat" double precision NOT NULL,
	"current_lng" double precision NOT NULL,
	"current_place" text NOT NULL,
	"home_lat" double precision NOT NULL,
	"home_lng" double precision NOT NULL,
	"total_km" double precision DEFAULT 0 NOT NULL,
	"places" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"times_returned" integer DEFAULT 0 NOT NULL,
	"picked_up_by" text,
	"picked_up_by_name" text,
	"picked_up_at" timestamp with time zone,
	"last_flicked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "api"."journeys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"flikkable_id" uuid NOT NULL,
	"event" text NOT NULL,
	"place" text NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"distance_km" double precision DEFAULT 0 NOT NULL,
	"stamps" integer DEFAULT 0 NOT NULL,
	"by_user_id" text NOT NULL,
	"by_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "api"."postcards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"flikkable_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"place" text NOT NULL,
	"job_id" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "api"."profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"home_lat" double precision NOT NULL,
	"home_lng" double precision NOT NULL,
	"home_name" text DEFAULT 'Home' NOT NULL,
	"stamps" integer DEFAULT 0 NOT NULL,
	"picked_up_count" integer DEFAULT 0 NOT NULL,
	"flick_count" integer DEFAULT 0 NOT NULL,
	"streak" integer DEFAULT 0 NOT NULL,
	"last_claim_day" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "flikkables_owner_idx" ON "api"."flikkables" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "flikkables_status_idx" ON "api"."flikkables" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "flikkables_holder_idx" ON "api"."flikkables" USING btree ("picked_up_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "journeys_flikkable_idx" ON "api"."journeys" USING btree ("flikkable_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "journeys_by_idx" ON "api"."journeys" USING btree ("by_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "postcards_flikkable_idx" ON "api"."postcards" USING btree ("flikkable_id");