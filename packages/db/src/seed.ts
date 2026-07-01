import { eq } from "drizzle-orm";
import { db, schema } from "./client.js";

const demoUsername = process.env.DEMO_USERNAME ?? "admin";
const demoPassword = process.env.DEMO_PASSWORD ?? "demo123";

async function seed() {
  const existing = await db.query.flags.findFirst({
    where: eq(schema.flags.key, "checkout_v2"),
  });
  if (existing) {
    await db.delete(schema.targetingRules).where(eq(schema.targetingRules.flagId, existing.id));
    await db.delete(schema.flags).where(eq(schema.flags.id, existing.id));
  }

  const flagId = crypto.randomUUID();
  await db.insert(schema.flags).values({
    id: flagId,
    key: "checkout_v2",
    name: "Checkout v2",
    description: "Nuevo flujo de checkout (ejemplo de seed)",
    type: "release",
    status: "draft",
    defaultValue: 0,
    failMode: "fail_closed",
  });

  await db.insert(schema.targetingRules).values([
    {
      id: crypto.randomUUID(),
      flagId,
      type: "environment",
      environment: "staging",
      value: 1,
      priority: 1,
    },
    {
      id: crypto.randomUUID(),
      flagId,
      type: "company",
      companyId: "acme",
      value: 1,
      priority: 2,
    },
    {
      id: crypto.randomUUID(),
      flagId,
      type: "percentage",
      percentage: 50,
      value: 1,
      priority: 3,
    },
  ]);

  console.log("Seed completado: checkout_v2 + 3 reglas");
  console.log("");
  console.log("Usuario demo (login):");
  console.log(`  username: ${demoUsername}`);
  console.log(`  password: ${demoPassword}`);
  console.log("  (configurable via DEMO_USERNAME / DEMO_PASSWORD en .env)");
}

seed()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
