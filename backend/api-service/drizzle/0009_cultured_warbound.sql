CREATE TABLE IF NOT EXISTS "api"."blocked_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blocker_id" text NOT NULL,
	"blocked_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "api"."friendships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester_id" text NOT NULL,
	"addressee_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "api"."profiles" ADD COLUMN "allow_friend_requests" boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "blocked_users_pair_idx" ON "api"."blocked_users" USING btree ("blocker_id","blocked_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "friendships_pair_idx" ON "api"."friendships" USING btree ("requester_id","addressee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "friendships_addressee_idx" ON "api"."friendships" USING btree ("addressee_id");