import { after, test } from "node:test";
import { runTeamScenario } from "../../test/scenarios/team.js";
import { workerOpsClient } from "../../test/scenarios/opsKit.js";

const client = await workerOpsClient();
after(() => client.close());

test("Worker: team members (Team and motion v1 §1)", async () => {
  await runTeamScenario(client);
});
