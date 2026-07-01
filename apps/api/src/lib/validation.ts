import { FLAG_KEY_PATTERN, FLAG_STATUSES } from "@ff/domain";
import { z } from "zod";

export function isValidFlagKey(key: string): boolean {
  return FLAG_KEY_PATTERN.test(key);
}

const failModeSchema = z.enum(["fail_closed", "fail_open"]);
const flagStatusSchema = z.enum(["draft", "active", "deprecated", "archived"]);
const environmentSchema = z.enum(["development", "staging", "production"]);

export const createFlagBodySchema = z.object({
  key: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.literal("release").optional(),
  default_value: z.boolean(),
  fail_mode: failModeSchema.optional(),
});

export const patchFlagBodySchema = z
  .object({
    name: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    default_value: z.boolean().optional(),
    fail_mode: failModeSchema.optional(),
    status: flagStatusSchema.optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one field is required",
  });

export const flagStatusQuerySchema = z.enum(FLAG_STATUSES).optional();

const ruleBaseSchema = z.object({
  value: z.boolean(),
  priority: z.number().int(),
});

export const createRuleBodySchema = z.discriminatedUnion("type", [
  ruleBaseSchema.extend({
    type: z.literal("environment"),
    environment: environmentSchema,
  }),
  ruleBaseSchema.extend({
    type: z.literal("company"),
    company_id: z.string().min(1),
  }),
  ruleBaseSchema.extend({
    type: z.literal("percentage"),
    percentage: z.number().int().min(0).max(100),
  }),
]);

export function parseJsonBody<T>(body: unknown, schema: z.ZodType<T>): T | { error: string } {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((issue) => issue.message).join("; ") };
  }
  return parsed.data;
}
