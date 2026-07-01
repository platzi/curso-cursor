CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`action` text NOT NULL,
	`field` text,
	`old_value` text,
	`new_value` text,
	`timestamp` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `flags` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`type` text DEFAULT 'release' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`default_value` integer DEFAULT 0 NOT NULL,
	`fail_mode` text DEFAULT 'fail_closed' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `flags_key_unique` ON `flags` (`key`);--> statement-breakpoint
CREATE UNIQUE INDEX `flags_key_idx` ON `flags` (`key`);--> statement-breakpoint
CREATE TABLE `targeting_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`flag_id` text NOT NULL,
	`type` text NOT NULL,
	`environment` text,
	`company_id` text,
	`percentage` integer,
	`value` integer NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`flag_id`) REFERENCES `flags`(`id`) ON UPDATE no action ON DELETE no action
);
