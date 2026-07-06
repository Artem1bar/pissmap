CREATE TABLE "suggestions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"category" text NOT NULL,
	"tip" text DEFAULT '' NOT NULL,
	"hours_text" text,
	"nickname" text,
	"ip_hash" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "suggestions_category_values" CHECK ("suggestions"."category" in ('public', 'customers', 'lobby')),
	CONSTRAINT "suggestions_status_values" CHECK ("suggestions"."status" in ('new', 'accepted', 'rejected')),
	CONSTRAINT "suggestions_name_len" CHECK (char_length("suggestions"."name") between 1 and 80),
	CONSTRAINT "suggestions_tip_len" CHECK (char_length("suggestions"."tip") <= 280),
	CONSTRAINT "suggestions_nickname_len" CHECK ("suggestions"."nickname" is null or char_length("suggestions"."nickname") <= 24)
);
--> statement-breakpoint
CREATE INDEX "suggestions_status_created_idx" ON "suggestions" USING btree ("status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "suggestions_ip_created_idx" ON "suggestions" USING btree ("ip_hash","created_at" DESC NULLS LAST);