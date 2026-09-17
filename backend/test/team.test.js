import { after, test } from "node:test";
import { runTeamScenario } from "./scenarios/team.js";
import { expressOpsClient } from "./scenarios/opsKit.js";

const client = await expressOpsClient();
after(() => client.close());

test("Express: team members (Team and motion v1 §1)", async () => {
  await runTeamScenario(client);
});
