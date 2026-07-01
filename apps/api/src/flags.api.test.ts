import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestApp, jsonRequest } from "./test/helpers.js";

describe("API feature flags (spec 04)", () => {
  let app: Awaited<ReturnType<typeof createTestApp>>["app"];
  let close: () => void;
  let flagId = "";
  let envRuleId = "";
  let companyRuleId = "";
  let percentageRuleId = "";

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    close = testApp.close;
  });

  afterAll(() => {
    close();
  });

  it("CA-04.1: crea flag con 201", async () => {
    const res = await jsonRequest(app, "/api/v1/flags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: "checkout_v2",
        name: "Checkout v2",
        description: "Nuevo checkout",
        type: "release",
        default_value: false,
        fail_mode: "fail_closed",
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.key).toBe("checkout_v2");
    expect(body.id).toBeTruthy();
    expect(body.status).toBe("draft");
    expect(body.created_at).toBeTypeOf("number");
    expect(body.updated_at).toBeTypeOf("number");
    flagId = body.id;
  });

  it("CA-04.2: key duplicada responde 409", async () => {
    const res = await jsonRequest(app, "/api/v1/flags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: "checkout_v2",
        name: "Duplicada",
        default_value: false,
      }),
    });
    expect(res.status).toBe(409);
  });

  it("CA-04.3: key inválida responde 400", async () => {
    const res = await jsonRequest(app, "/api/v1/flags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: "Checkout V2!",
        name: "Invalid",
        default_value: false,
      }),
    });
    expect(res.status).toBe(400);
  });

  it("CA-04.4: listar y filtrar por status", async () => {
    await jsonRequest(app, "/api/v1/flags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: "active_flag",
        name: "Active",
        default_value: true,
      }),
    });
    await jsonRequest(app, "/api/v1/flags/active_flag", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "active" }),
    });

    const allRes = await jsonRequest(app, "/api/v1/flags");
    const all = await allRes.json();
    expect(allRes.status).toBe(200);
    expect(all.length).toBeGreaterThanOrEqual(2);

    const draftRes = await jsonRequest(app, "/api/v1/flags?status=draft");
    const draft = await draftRes.json();
    expect(draftRes.status).toBe(200);
    expect(draft.every((f: { status: string }) => f.status === "draft")).toBe(true);
    expect(draft.some((f: { key: string }) => f.key === "checkout_v2")).toBe(true);
    expect(draft.some((f: { key: string }) => f.key === "active_flag")).toBe(false);
  });

  it("CA-04.5: detalle 200 y 404", async () => {
    const ok = await jsonRequest(app, "/api/v1/flags/checkout_v2");
    expect(ok.status).toBe(200);
    const flag = await ok.json();
    expect(flag.key).toBe("checkout_v2");

    const missing = await jsonRequest(app, "/api/v1/flags/no_existe");
    expect(missing.status).toBe(404);
  });

  it("CA-04.6: editar default_value", async () => {
    const before = await (await jsonRequest(app, "/api/v1/flags/checkout_v2")).json();
    const res = await jsonRequest(app, "/api/v1/flags/checkout_v2", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ default_value: true }),
    });
    expect(res.status).toBe(200);
    const updated = await res.json();
    expect(updated.default_value).toBe(true);
    expect(updated.updated_at).toBeGreaterThanOrEqual(before.updated_at);
  });

  it("CA-04.7: no DELETE de flag; archivar con PATCH", async () => {
    const deleteRes = await jsonRequest(app, "/api/v1/flags/checkout_v2", {
      method: "DELETE",
    });
    expect(deleteRes.status).toBe(404);

    const res = await jsonRequest(app, "/api/v1/flags/checkout_v2", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "archived" }),
    });
    expect(res.status).toBe(200);
    const archived = await res.json();
    expect(archived.status).toBe("archived");
  });

  it("CA-04.8: crear reglas environment, company y percentage", async () => {
    const activeFlag = await (
      await jsonRequest(app, "/api/v1/flags/active_flag")
    ).json();

    const envRes = await jsonRequest(app, `/api/v1/flags/${activeFlag.id}/rules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "environment",
        environment: "staging",
        value: true,
        priority: 1,
      }),
    });
    expect(envRes.status).toBe(201);
    envRuleId = (await envRes.json()).id;

    const companyRes = await jsonRequest(app, `/api/v1/flags/${activeFlag.id}/rules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "company",
        company_id: "acme",
        value: true,
        priority: 2,
      }),
    });
    expect(companyRes.status).toBe(201);
    companyRuleId = (await companyRes.json()).id;

    const pctRes = await jsonRequest(app, `/api/v1/flags/${activeFlag.id}/rules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "percentage",
        percentage: 50,
        value: true,
        priority: 3,
      }),
    });
    expect(pctRes.status).toBe(201);
    percentageRuleId = (await pctRes.json()).id;

    const listRes = await jsonRequest(app, `/api/v1/flags/${activeFlag.id}/rules`);
    const rules = await listRes.json();
    expect(rules).toHaveLength(3);
  });

  it("CA-04.9: percentage fuera de rango responde 400", async () => {
    const activeFlag = await (
      await jsonRequest(app, "/api/v1/flags/active_flag")
    ).json();

    for (const percentage of [150, -1]) {
      const res = await jsonRequest(app, `/api/v1/flags/${activeFlag.id}/rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "percentage",
          percentage,
          value: true,
          priority: 99,
        }),
      });
      expect(res.status).toBe(400);
    }
  });

  it("CA-04.10: eliminar regla", async () => {
    const activeFlag = await (
      await jsonRequest(app, "/api/v1/flags/active_flag")
    ).json();

    const delRes = await jsonRequest(
      app,
      `/api/v1/flags/${activeFlag.id}/rules/${envRuleId}`,
      { method: "DELETE" },
    );
    expect(delRes.status).toBe(204);

    const list = await (
      await jsonRequest(app, `/api/v1/flags/${activeFlag.id}/rules`)
    ).json();
    expect(list.some((r: { id: string }) => r.id === envRuleId)).toBe(false);
  });

  it("CA-04.11: reglas ordenadas por priority", async () => {
    const activeFlag = await (
      await jsonRequest(app, "/api/v1/flags/active_flag")
    ).json();
    const rules = await (
      await jsonRequest(app, `/api/v1/flags/${activeFlag.id}/rules`)
    ).json();
    const priorities = rules.map((r: { priority: number }) => r.priority);
    expect(priorities).toEqual([...priorities].sort((a, b) => a - b));
  });

  it("CA-04.12: audit en create de flag", async () => {
    const res = await jsonRequest(app, "/api/v1/audit-log?flag=checkout_v2");
    const entries = await res.json();
    expect(entries.some((e: { entity_type: string; action: string }) => e.entity_type === "flag" && e.action === "create")).toBe(true);
  });

  it("CA-04.13: audit en update de default_value", async () => {
    const res = await jsonRequest(app, "/api/v1/audit-log?flag=checkout_v2");
    const entries = await res.json();
    const update = entries.find(
      (e: { action: string; field: string | null }) =>
        e.action === "update" && e.field === "default_value",
    );
    expect(update).toBeTruthy();
    expect(update.old_value).toBe("false");
    expect(update.new_value).toBe("true");
  });

  it("CA-04.14: audit en archive", async () => {
    const res = await jsonRequest(app, "/api/v1/audit-log?flag=checkout_v2");
    const entries = await res.json();
    expect(entries.some((e: { action: string }) => e.action === "archive")).toBe(true);
  });

  it("CA-04.15: audit en create y delete de regla", async () => {
    const activeFlag = await (
      await jsonRequest(app, "/api/v1/flags/active_flag")
    ).json();
    const res = await jsonRequest(app, `/api/v1/audit-log?flag=${activeFlag.key}`);
    const entries = await res.json();
    expect(entries.some((e: { entity_type: string; action: string; entity_id: string }) => e.entity_type === "rule" && e.action === "create" && e.entity_id === companyRuleId)).toBe(true);
    expect(entries.some((e: { entity_type: string; action: string; entity_id: string }) => e.entity_type === "rule" && e.action === "delete" && e.entity_id === envRuleId)).toBe(true);
  });
});
