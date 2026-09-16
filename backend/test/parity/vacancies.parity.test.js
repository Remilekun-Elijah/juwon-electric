import { test } from "node:test";
import { assertParity } from "../helpers/parity.js";
import { TEST_ENV } from "../scenarios/adminUsers.js";
import { runVacanciesScenario } from "../scenarios/vacancies.js";

// Contract §13.7: new modules compare full masked bodies (fixtures are created through the API).
test("vacancies: Express and Worker return the same statuses and bodies", () =>
  assertParity(runVacanciesScenario, TEST_ENV));
