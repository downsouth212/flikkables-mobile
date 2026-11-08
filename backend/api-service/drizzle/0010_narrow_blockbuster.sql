CREATE TABLE IF NOT EXISTS "api"."trade_offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_user_id" text NOT NULL,
	"to_user_id" text NOT NULL,
	"offered_id" uuid NOT NULL,
	"requested_id" uuid,
	"stamp_amount" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "trade_offers_from_idx" ON "api"."trade_offers" USING btree ("from_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "trade_offers_to_idx" ON "api"."trade_offers" USING btree ("to_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "trade_offers_status_idx" ON "api"."trade_offers" USING btree ("status");