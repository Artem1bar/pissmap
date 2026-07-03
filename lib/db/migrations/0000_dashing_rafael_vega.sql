CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"spot_id" text NOT NULL,
	"rating" integer NOT NULL,
	"body" text NOT NULL,
	"nickname" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"ip_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_rating_range" CHECK ("reviews"."rating" between 1 and 5),
	CONSTRAINT "reviews_body_len" CHECK (char_length("reviews"."body") between 1 and 280),
	CONSTRAINT "reviews_nickname_len" CHECK ("reviews"."nickname" is null or char_length("reviews"."nickname") <= 24),
	CONSTRAINT "reviews_status_values" CHECK ("reviews"."status" in ('pending', 'approved', 'rejected'))
);
--> statement-breakpoint
CREATE TABLE "scans" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "reviews_spot_status_created_idx" ON "reviews" USING btree ("spot_id","status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "reviews_ip_created_idx" ON "reviews" USING btree ("ip_hash","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "scans_slug_idx" ON "scans" USING btree ("slug");