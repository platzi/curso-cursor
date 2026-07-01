import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export type FlagType = "release";
export type FlagStatus = "draft" | "active" | "deprecated" | "archived";
export type FailMode = "fail_closed" | "fail_open";
export type RuleType = "environment" | "company" | "percentage";
export type Environment = "development" | "staging" | "production";

export const flags = sqliteTable(
  "flags",
  {
    id: text("id").primaryKey(),
    key: text("key").notNull().unique(),
    name: text("name").notNull(),
    description: text("description"),
    type: text("type").$type<FlagType>().notNull().default("release"),
    status: text("status").$type<FlagStatus>().notNull().default("draft"),
    defaultValue: integer("default_value").notNull().default(0),
    failMode: text("fail_mode").$type<FailMode>().notNull().default("fail_closed"),
    createdAt: integer("created_at").notNull().default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at").notNull().default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({ keyIdx: uniqueIndex("flags_key_idx").on(t.key) }),
);

export const targetingRules = sqliteTable("targeting_rules", {
  id: text("id").primaryKey(),
  flagId: text("flag_id")
    .notNull()
    .references(() => flags.id),
  type: text("type").$type<RuleType>().notNull(),
  environment: text("environment").$type<Environment>(),
  companyId: text("company_id"),
  percentage: integer("percentage"),
  value: integer("value").notNull(),
  priority: integer("priority").notNull().default(0),
  createdAt: integer("created_at").notNull().default(sql`(unixepoch() * 1000)`),
});

export const auditLog = sqliteTable("audit_log", {
  id: text("id").primaryKey(),
  entityType: text("entity_type").$type<"flag" | "rule">().notNull(),
  entityId: text("entity_id").notNull(),
  action: text("action").$type<"create" | "update" | "archive" | "delete">().notNull(),
  field: text("field"),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  timestamp: integer("timestamp").notNull().default(sql`(unixepoch() * 1000)`),
});
