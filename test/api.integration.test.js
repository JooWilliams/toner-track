import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { DatabaseSync } from "node:sqlite";
import { verifyBackupDatabase } from "../server/lib/backup-validation.js";

const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "tonertrack-api-test-"));
process.env.TONERTRACK_DB_PATH = path.join(tempDirectory, "integration.db");
process.env.NODE_ENV = "test";

const [{ default: app }, { db }] = await Promise.all([
  import("../server/app.js"),
  import("../server/db.js"),
]);

test("API protects data and keeps metric, audit, edit, pagination, and backup consistent", async () => {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}/api`;
  let cookie = "";

  async function call(endpoint, options = {}) {
    return fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
        ...options.headers,
      },
    });
  }

  try {
    assert.equal((await call("/printers")).status, 401);
    const status = await call("/auth/status");
    assert.deepEqual(await status.json(), { configured: false, authenticated: false, username: null });

    const setup = await call("/auth/setup", {
      method: "POST",
      body: JSON.stringify({ username: "admin.test", password: "senha-segura-de-teste" }),
    });
    assert.equal(setup.status, 201);
    const setCookie = setup.headers.get("set-cookie");
    assert.match(setCookie, /HttpOnly/);
    assert.match(setCookie, /SameSite=Strict/);
    cookie = setCookie.split(";")[0];

    const printerResponse = await call("/printers", {
      method: "POST",
      body: JSON.stringify({ name: "Impressora de teste", expected_toner_yield: 3000 }),
    });
    assert.equal(printerResponse.status, 201);
    const printer = await printerResponse.json();

    const today = new Date().toISOString().slice(0, 10);
    const readings = [
      ["toner", 1000],
      ["cilindro", 1300],
      ["toner", 1800],
    ];
    const created = [];
    for (const [type, page_count] of readings) {
      const response = await call("/changes", {
        method: "POST",
        body: JSON.stringify({ printer_id: printer.id, type, change_date: today, page_count }),
      });
      assert.equal(response.status, 201);
      created.push(await response.json());
    }

    const page = await call("/changes?limit=2&offset=0");
    const pageData = await page.json();
    assert.equal(pageData.total, 3);
    assert.equal(pageData.items.length, 2);
    assert.equal(pageData.items[0].pages_printed, 500);
    assert.equal(pageData.items[0].pages_used, 800);
    const firstRead = await call("/changes?limit=2&offset=2");
    assert.equal((await firstRead.json()).items[0].pages_printed, null);

    const dashboardResponse = await call("/dashboard");
    assert.equal((await dashboardResponse.json()).totals.pages_printed, 800);
    const statsResponse = await call("/stats/printers");
    assert.equal((await statsResponse.json())[0].pages, 800);

    const edit = await call(`/changes/${created[1].id}`, {
      method: "PUT",
      body: JSON.stringify({
        printer_id: printer.id,
        type: "cilindro",
        change_date: today,
        page_count: 1400,
        responsible: "Operador",
        notes: "Corrigido",
      }),
    });
    assert.equal(edit.status, 200);
    const edited = await edit.json();
    assert.equal(edited.pages_printed, 400);

    const auditResponse = await call("/audit?limit=100");
    const audit = await auditResponse.json();
    const editEvent = audit.items.find((entry) => entry.action === "update" && entry.entity === "change");
    assert.equal(editEvent.before.page_count, 1300);
    assert.equal(editEvent.after.page_count, 1400);

    const resetPrinterResponse = await call("/printers", {
      method: "POST",
      body: JSON.stringify({ name: "Impressora com contador reiniciado", expected_toner_yield: 3000 }),
    });
    const resetPrinter = await resetPrinterResponse.json();
    const resetReadings = [
      ["toner", 1000],
      ["cilindro", 1300],
      ["cilindro", 100],
      ["toner", 1200],
    ];
    let afterResetToner;
    for (const [type, page_count] of resetReadings) {
      const response = await call("/changes", {
        method: "POST",
        body: JSON.stringify({ printer_id: resetPrinter.id, type, change_date: today, page_count }),
      });
      assert.equal(response.status, 201);
      const change = await response.json();
      if (type === "toner" && page_count === 1200) afterResetToner = change;
    }
    assert.equal(afterResetToner.pages_printed, 1100);
    assert.equal(afterResetToner.pages_used, null);
    assert.equal(afterResetToner.status.code, "reset");

    const backupResponse = await call("/backup");
    assert.equal(backupResponse.status, 200);
    const backupPath = path.join(tempDirectory, "downloaded-backup.db");
    fs.writeFileSync(backupPath, Buffer.from(await backupResponse.arrayBuffer()));
    const backupDb = new DatabaseSync(backupPath, { readOnly: true });
    try {
      assert.deepEqual(verifyBackupDatabase(backupDb), { integrity: "ok", schemaVersion: 2 });
      assert.ok(backupDb.prepare("SELECT value FROM app_meta WHERE key = 'last_backup_at'").get().value);
    } finally {
      backupDb.close();
    }
    const backupStatus = await call("/backup/status");
    assert.ok((await backupStatus.json()).last_backup_at);

    assert.equal((await call(`/printers/${printer.id}`, { method: "DELETE" })).status, 204);
    const afterDelete = await call("/audit?limit=100");
    const deletedAudit = await afterDelete.json();
    assert.equal(deletedAudit.items.filter((entry) => entry.action === "delete" && entry.entity === "change").length, 3);
    assert.ok(deletedAudit.items.some((entry) => entry.action === "delete" && entry.entity === "printer"));

    assert.equal((await call("/auth/logout", { method: "POST" })).status, 204);
    cookie = "";
    assert.equal((await call("/printers")).status, 401);
    assert.equal(
      (await call("/printers", { headers: { Cookie: "tonertrack_session=%ZZ" } })).status,
      401
    );
    const login = await call("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "admin.test", password: "senha-segura-de-teste" }),
    });
    assert.equal(login.status, 200);
    cookie = login.headers.get("set-cookie").split(";")[0];
    assert.equal((await call("/printers")).status, 200);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    db.close();
    fs.rmSync(tempDirectory, { recursive: true, force: true });
  }
});
