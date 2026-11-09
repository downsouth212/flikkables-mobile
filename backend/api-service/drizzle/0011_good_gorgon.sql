CREATE TABLE IF NOT EXISTS "api"."garden_plants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"bed" integer NOT NULL,
	"flower" text NOT NULL,
	"planted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "garden_plants_user_bed" ON "api"."garden_plants" USING btree ("user_id","bed");