CREATE TABLE "overrides" (
	"spot_id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"note" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "overrides_kind_values" CHECK ("overrides"."kind" in ('hide', 'warn')),
	CONSTRAINT "overrides_note_len" CHECK ("overrides"."note" is null or char_length("overrides"."note") <= 140)
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"spot_id" text NOT NULL,
	"reason" text NOT NULL,
	"detail" text,
	"ip_hash" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reports_reason_values" CHECK ("reports"."reason" in ('closed', 'wrong-hours', 'no-restroom', 'other')),
	CONSTRAINT "reports_detail_len" CHECK ("reports"."detail" is null or char_length("reports"."detail") <= 200),
	CONSTRAINT "reports_status_values" CHECK ("reports"."status" in ('open', 'resolved', 'dismissed'))
);
--> statement-breakpoint
CREATE INDEX "reports_spot_status_created_idx" ON "reports" USING btree ("spot_id","status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "reports_ip_created_idx" ON "reports" USING btree ("ip_hash","created_at" DESC NULLS LAST);