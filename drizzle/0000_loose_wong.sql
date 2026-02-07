CREATE TABLE "budget_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period_id" uuid NOT NULL,
	"tag_id" uuid,
	"subject_id" uuid,
	"allocated_amount" numeric(15, 4) NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budget_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "containers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"provider" text,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"is_multi_currency" boolean DEFAULT false NOT NULL,
	"initial_balance" numeric(15, 4) DEFAULT '0',
	"billing_day" integer,
	"linked_container_id" uuid,
	"goal_amount" numeric(15, 4),
	"goal_description" text,
	"icon" text,
	"color" text,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "counterparties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text,
	"default_category" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exchange_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"base_currency" text NOT NULL,
	"target_currency" text NOT NULL,
	"rate" numeric(12, 6) NOT NULL,
	"date" date NOT NULL,
	"source" text DEFAULT 'manual'
);
--> statement-breakpoint
CREATE TABLE "import_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid,
	"container_id" uuid NOT NULL,
	"filename" text NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"total_rows" integer,
	"imported_rows" integer,
	"skipped_rows" integer,
	"duplicate_rows" integer,
	"status" text DEFAULT 'completed' NOT NULL,
	"error_log" jsonb,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "import_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"container_id" uuid NOT NULL,
	"name" text NOT NULL,
	"file_type" text NOT NULL,
	"delimiter" text DEFAULT ',',
	"date_format" text DEFAULT 'DD/MM/YYYY',
	"decimal_separator" text DEFAULT ',',
	"thousands_separator" text DEFAULT '.',
	"encoding" text DEFAULT 'UTF-8',
	"skip_rows" integer DEFAULT 0,
	"column_mapping" jsonb NOT NULL,
	"amount_inverted" boolean DEFAULT false,
	"separate_amount_columns" boolean DEFAULT false,
	"income_column" text,
	"expense_column" text,
	"dedup_columns" text[],
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "installment_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"description" text NOT NULL,
	"total_amount" numeric(15, 4) NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"number_of_installments" integer NOT NULL,
	"counterparty_id" uuid,
	"container_id" uuid,
	"reminder_days_before" integer,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "installments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"installment_number" integer NOT NULL,
	"amount" numeric(15, 4) NOT NULL,
	"due_date" date NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"transaction_id" uuid,
	"reminder_days_before" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recurrence_tags" (
	"recurrence_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "recurrence_tags_recurrence_id_tag_id_pk" PRIMARY KEY("recurrence_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "recurrences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"description" text NOT NULL,
	"frequency" text NOT NULL,
	"interval_days" integer,
	"day_of_month" integer,
	"day_of_week" integer,
	"business_days_only" boolean DEFAULT false NOT NULL,
	"amount" numeric(15, 4),
	"amount_is_estimate" boolean DEFAULT false NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"container_id" uuid,
	"counterparty_id" uuid,
	"type" text NOT NULL,
	"shared_with_subject_id" uuid,
	"share_percentage" numeric(5, 2),
	"start_date" date NOT NULL,
	"end_date" date,
	"reminder_days_before" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"recurrence_id" uuid,
	"installment_id" uuid,
	"due_date" date NOT NULL,
	"reminder_date" date NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "savings_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"container_id" uuid NOT NULL,
	"name" text NOT NULL,
	"target_amount" numeric(15, 4) NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"target_date" date,
	"current_amount" numeric(15, 4) DEFAULT '0',
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"legal_form" text,
	"tax_id" text,
	"country" text DEFAULT 'IT',
	"role" text,
	"parent_subject_id" uuid,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"parent_id" uuid,
	"type" text NOT NULL,
	"color" text,
	"icon" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transaction_tags" (
	"transaction_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "transaction_tags_transaction_id_tag_id_pk" PRIMARY KEY("transaction_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" date NOT NULL,
	"value_date" date,
	"description" text,
	"notes" text,
	"amount" numeric(15, 4) NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"amount_eur" numeric(15, 4),
	"exchange_rate" numeric(12, 6),
	"container_id" uuid NOT NULL,
	"counterparty_id" uuid,
	"type" text NOT NULL,
	"transfer_linked_id" uuid,
	"status" text DEFAULT 'completed' NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"import_batch_id" uuid,
	"recurrence_id" uuid,
	"split_parent_id" uuid,
	"shared_with_subject_id" uuid,
	"share_percentage" numeric(5, 2),
	"installment_plan_id" uuid,
	"installment_number" integer,
	"external_id" text,
	"external_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "budget_allocations" ADD CONSTRAINT "budget_allocations_period_id_budget_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "public"."budget_periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_allocations" ADD CONSTRAINT "budget_allocations_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_allocations" ADD CONSTRAINT "budget_allocations_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "containers" ADD CONSTRAINT "containers_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_profile_id_import_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."import_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_container_id_containers_id_fk" FOREIGN KEY ("container_id") REFERENCES "public"."containers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_profiles" ADD CONSTRAINT "import_profiles_container_id_containers_id_fk" FOREIGN KEY ("container_id") REFERENCES "public"."containers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installment_plans" ADD CONSTRAINT "installment_plans_counterparty_id_counterparties_id_fk" FOREIGN KEY ("counterparty_id") REFERENCES "public"."counterparties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installment_plans" ADD CONSTRAINT "installment_plans_container_id_containers_id_fk" FOREIGN KEY ("container_id") REFERENCES "public"."containers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installments" ADD CONSTRAINT "installments_plan_id_installment_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."installment_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installments" ADD CONSTRAINT "installments_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurrence_tags" ADD CONSTRAINT "recurrence_tags_recurrence_id_recurrences_id_fk" FOREIGN KEY ("recurrence_id") REFERENCES "public"."recurrences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurrence_tags" ADD CONSTRAINT "recurrence_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurrences" ADD CONSTRAINT "recurrences_container_id_containers_id_fk" FOREIGN KEY ("container_id") REFERENCES "public"."containers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurrences" ADD CONSTRAINT "recurrences_counterparty_id_counterparties_id_fk" FOREIGN KEY ("counterparty_id") REFERENCES "public"."counterparties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurrences" ADD CONSTRAINT "recurrences_shared_with_subject_id_subjects_id_fk" FOREIGN KEY ("shared_with_subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_recurrence_id_recurrences_id_fk" FOREIGN KEY ("recurrence_id") REFERENCES "public"."recurrences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_installment_id_installments_id_fk" FOREIGN KEY ("installment_id") REFERENCES "public"."installments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savings_goals" ADD CONSTRAINT "savings_goals_container_id_containers_id_fk" FOREIGN KEY ("container_id") REFERENCES "public"."containers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_tags" ADD CONSTRAINT "transaction_tags_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_tags" ADD CONSTRAINT "transaction_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_container_id_containers_id_fk" FOREIGN KEY ("container_id") REFERENCES "public"."containers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_counterparty_id_counterparties_id_fk" FOREIGN KEY ("counterparty_id") REFERENCES "public"."counterparties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_shared_with_subject_id_subjects_id_fk" FOREIGN KEY ("shared_with_subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_budget_allocations_period" ON "budget_allocations" USING btree ("period_id");--> statement-breakpoint
CREATE INDEX "idx_budget_allocations_tag" ON "budget_allocations" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "idx_containers_subject" ON "containers" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "idx_containers_type" ON "containers" USING btree ("type");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_exchange_rates_unique" ON "exchange_rates" USING btree ("base_currency","target_currency","date");--> statement-breakpoint
CREATE INDEX "idx_installments_plan" ON "installments" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "idx_installments_due_date" ON "installments" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "idx_installments_status" ON "installments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_reminders_date" ON "reminders" USING btree ("reminder_date");--> statement-breakpoint
CREATE INDEX "idx_reminders_status" ON "reminders" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_tags_name_type" ON "tags" USING btree ("name","type");--> statement-breakpoint
CREATE INDEX "idx_transactions_date" ON "transactions" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_transactions_container" ON "transactions" USING btree ("container_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_type" ON "transactions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_transactions_status" ON "transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_transactions_counterparty" ON "transactions" USING btree ("counterparty_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_split_parent" ON "transactions" USING btree ("split_parent_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_transfer_linked" ON "transactions" USING btree ("transfer_linked_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_recurrence" ON "transactions" USING btree ("recurrence_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_import_batch" ON "transactions" USING btree ("import_batch_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_date_container" ON "transactions" USING btree ("date","container_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_external" ON "transactions" USING btree ("external_id","container_id");