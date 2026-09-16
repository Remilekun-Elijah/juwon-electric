import { after, test } from "node:test";
import { runJobsScenario } from "../../test/scenarios/jobs.js";
import { workerOpsClient } from "../../test/scenarios/opsKit.js";

const client = await workerOpsClient();
after(() => client.close());

test("Worker: installation jobs, engineer endpoints and staff", async () => {
  await runJobsScenario(client);
});
