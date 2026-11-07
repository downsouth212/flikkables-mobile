CREATE TABLE IF NOT EXISTS "api"."admins" (
	"email" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"role" text DEFAULT 'admin' NOT NULL,
	"granted_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admins_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "api"."game_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "api"."profiles" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "api"."profiles" ADD COLUMN "locked" boolean DEFAULT false NOT NULL;