import { test } from "node:test";
import { assertParity } from "../helpers/parity.js";
import { TEST_ENV, runAdminUsersScenario } from "../scenarios/adminUsers.js";

test("admin users: Express and Worker return the same statuses and bodies", () =>
  assertParity(runAdminUsersScenario, TEST_ENV));
