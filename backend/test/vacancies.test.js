import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { startExpress } from "./helpers/express.js";
import { TEST_ENV } from "./scenarios/adminUsers.js";
import { runVacanciesScenario } from "./scenarios/vacancies.js";

let server;

before(async () => {
  server = await startExpress(TEST_ENV);
});

after(async () => {
  await server?.close();
});

test("Express: vacancies", async () => {
  await runVacanciesScenario(server.request);
});

test("Express: legacy X-User-Role middleware and models are gone", async () => {
  const { existsSync } = await import("node:fs");
  for (const file of ["../middleware/auth.js", "../routes/vacancies.js", "../models/Vacancy.js"]) {
    assert.equal(existsSync(new URL(file, import.meta.url)), false, file);
  }
});
