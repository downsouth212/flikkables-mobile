ALTER TABLE "auth"."jwks" ADD COLUMN "expiresAt" timestamp;--> statement-breakpoint
ALTER TABLE "auth"."jwks" ADD COLUMN "alg" text;--> statement-breakpoint
ALTER TABLE "auth"."jwks" ADD COLUMN "crv" text;