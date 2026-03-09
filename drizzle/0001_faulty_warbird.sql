CREATE TABLE "smart_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description_pattern" text,
	"counterparty_id" uuid,
	"container_id" uuid,
	"amount_min" numeric(15, 4),
	"amount_max" numeric(15, 4),
	"transaction_type" text,
	"assign_tag_id" uuid NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"auto_apply" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "containers" ADD COLUMN "is_pinned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "smart_rules" ADD CONSTRAINT "smart_rules_counterparty_id_counterparties_id_fk" FOREIGN KEY ("counterparty_id") REFERENCES "public"."counterparties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smart_rules" ADD CONSTRAINT "smart_rules_container_id_containers_id_fk" FOREIGN KEY ("container_id") REFERENCES "public"."containers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smart_rules" ADD CONSTRAINT "smart_rules_assign_tag_id_tags_id_fk" FOREIGN KEY ("assign_tag_id") REFERENCES "public"."tags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_smart_rules_priority" ON "smart_rules" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "idx_smart_rules_tag" ON "smart_rules" USING btree ("assign_tag_id");