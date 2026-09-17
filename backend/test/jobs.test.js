import { after, test } from "node:test";
import { runJobsScenario } from "./scenarios/jobs.js";
import { expressOpsClient } from "./scenarios/opsKit.js";

const client = await expressOpsClient();
after(() => client.close());

test("Express: installation jobs, engineer endpoints and staff", async () => {
  await runJobsScenario(client);
});
