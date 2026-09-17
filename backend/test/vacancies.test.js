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
