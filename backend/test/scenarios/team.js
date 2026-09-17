// Team and motion v1 (docs/agents/TEAM_AND_MOTION_V1.md §1): team members. CRUD, validation,
// capabilities, public filtering and order (sortOrder, then createdAt), the sample flag (kept when
// moved, hidden or re-saved unchanged; cleared on a real edit) and audit. Runtime-agnostic
// scenario; returns the transcript for parity.
import assert from "node:assert/strict";
import { recorder } from "./opsKit.js";

const FORBIDDEN = "You do not have permission to perform this action.";

const TEAM_KEYS = ["bio", "createdAt", "group", "id", "isActive", "linkedinUrl", "name", "photoUrl", "role", "sample", "sortOrder", "updatedAt"];

export const runTeamScenario = async (client) => {
  const { transcript, expect } = recorder(client);
  const support = await client.seedAdmin("support");
  const sales = await client.seedAdmin("sales");
  const engineer = await client.seedAdmin("engineer");

  // ---- capabilities ------------------------------------------------------------------------
  await expect("engineer cannot read the team", "GET", "/admin/team", { token: engineer.token }, 403, FORBIDDEN);
  await expect("support reads the team", "GET", "/admin/team", { token: support.token }, 200, "Team retrieved.");
  await expect("support cannot create team members", "POST", "/admin/team", { token: support.token, body: {} }, 403, FORBIDDEN);
  await expect("anonymous cannot read the admin team", "GET", "/admin/team", { token: null }, 401);

  // ---- validation ----------------------------------------------------------------------------
  const member = { name: "Chidera Okonkwo", role: "Lead installation engineer", group: "Engineering & installations" };
  const bad = (label, body, message) => expect(label, "POST", "/admin/team", { body }, 400, message);
  await bad("name required", { ...member, name: "  " }, "Name is required.");
  await bad("name too long", { ...member, name: "n".repeat(101) }, "Name must be 100 characters or fewer.");
  await bad("role required", { ...member, role: undefined }, "Role is required.");
  await bad("role too long", { ...member, role: "r".repeat(81) }, "Role must be 80 characters or fewer.");
  await bad("group required", { ...member, group: "" }, "Group is required.");
  await bad("group too long", { ...member, group: "g".repeat(61) }, "Group must be 60 characters or fewer.");
  await bad("bio too long", { ...member, bio: "b".repeat(301) }, "Bio must be 300 characters or fewer.");
  await bad("bio is one line of plain text", { ...member, bio: "Sizes systems.\nInstalls them." }, "Bio contains invalid characters.");
  await bad("name must be text", { ...member, name: 42 }, "Name must be text.");
  await bad("photo url scheme", { ...member, photoUrl: "javascript:alert(1)" }, "Photo URL must be an http(s) URL or a path starting with /.");
  await bad("photo path characters", { ...member, photoUrl: "/samples/team/member 1.svg" }, "Photo URL must be an http(s) URL or a path starting with /.");
  await bad("linkedin must be https", { ...member, linkedinUrl: "http://linkedin.com/in/chidera" }, "LinkedIn URL must be an https URL.");
  await bad("linkedin must be a url", { ...member, linkedinUrl: "/in/chidera" }, "LinkedIn URL must be an https URL.");
  await bad("sort order range", { ...member, sortOrder: -1 }, "Sort order must be between 0 and 1,000,000.");
  await bad("isActive boolean", { ...member, isActive: "yes" }, "isActive must be true or false.");

  // ---- create ----------------------------------------------------------------------------------
  const lead = (
    await expect("create team member", "POST", "/admin/team", {
      token: sales.token,
      body: {
        ...member,
        name: "  Chidera Okonkwo  ",
        bio: "Sizes and installs home and office solar systems.",
        photoUrl: "/samples/team/member-1.svg",
        linkedinUrl: "https://www.linkedin.com/in/example",
        unknown: "ignored",
        sample: true,
      },
    }, 201, "Team member created.")
  ).body.data;
  assert.deepEqual(Object.keys(lead).sort(), TEAM_KEYS);
  assert.equal(lead.name, "Chidera Okonkwo");
  assert.equal(lead.sample, false, "sample is never accepted from a request");
  assert.equal(lead.isActive, true);
  assert.equal(lead.sortOrder, 1, "first record goes first");

  const bare = (
    await expect("create team member with defaults", "POST", "/admin/team", {
      body: { name: "Bisola Adeyemi", role: "Customer care lead", group: "Sales & customer care", bio: " ", photoUrl: "", linkedinUrl: null },
    }, 201)
  ).body.data;
  assert.deepEqual([bare.bio, bare.photoUrl, bare.linkedinUrl, bare.sortOrder], [null, null, null, 2]);

  await expect("create hidden team member", "POST", "/admin/team", {
    body: { name: "Hidden Member", role: "Storekeeper", group: "Operations", isActive: false, sortOrder: 0 },
  }, 201);
  const photo = (
    await expect("create with an absolute photo url", "POST", "/admin/team", {
      body: { name: "Tobi Lawal", role: "Managing director", group: "Leadership", photoUrl: "https://images.juwon.test/tobi.jpg", sortOrder: 3 },
    }, 201)
  ).body.data;
  assert.equal(photo.sortOrder, 3);

  await client.seedRecord("teamMembers", {
    id: "sample-team-test",
    name: "Sample Member",
    role: "Installation technician",
    group: "Engineering & installations",
    bio: "Installs and tests inverter systems.",
    photoUrl: "/samples/team/member-9.svg",
    linkedinUrl: null,
    sortOrder: 0,
    isActive: true,
    sample: true,
    createdAt: "2026-12-31T00:00:00.000Z",
  });
  // Same sortOrder as the first member, created earlier: listed before it.
  await client.seedRecord("teamMembers", {
    id: "team-early",
    name: "Early Member",
    role: "Operations director",
    group: "Leadership",
    bio: null,
    photoUrl: null,
    linkedinUrl: null,
    sortOrder: 1,
    isActive: true,
    sample: false,
    createdAt: "2026-01-01T00:00:00.000Z",
  });

  // ---- public filtering and order -------------------------------------------------------------------
  const publicTeam = (await expect("public team", "GET", "/team", { token: null }, 200, "Team retrieved.")).body.data;
  assert.deepEqual(
    publicTeam.map((item) => item.name),
    ["Sample Member", "Early Member", "Chidera Okonkwo", "Bisola Adeyemi", "Tobi Lawal"],
    "active only, by sortOrder then createdAt"
  );
  assert.deepEqual(Object.keys(publicTeam[0]).sort(), TEAM_KEYS);
  assert.equal(publicTeam[0].sample, true);
  const groups = [...new Set(publicTeam.map((item) => item.group))];
  assert.deepEqual(groups, ["Engineering & installations", "Leadership", "Sales & customer care"], "group order is first appearance");

  const adminTeam = (await expect("admin team includes hidden", "GET", "/admin/team", { token: support.token }, 200)).body.data;
  assert.equal(adminTeam.length, 6);
  assert.equal(adminTeam[0].name, "Hidden Member", "sortOrder 0, created before the seeded sample");

  // ---- update ---------------------------------------------------------------------------------------
  const moved = (await expect("move a team member", "PUT", `/admin/team/${lead.id}`, { body: { sortOrder: 9 } }, 200, "Team member updated.")).body.data;
  assert.deepEqual([moved.name, moved.role, moved.bio, moved.sortOrder], [lead.name, lead.role, lead.bio, 9]);
  const cleared = (await expect("clear optional fields", "PUT", `/admin/team/${lead.id}`, { body: { bio: "", linkedinUrl: null, photoUrl: null } }, 200)).body.data;
  assert.deepEqual([cleared.bio, cleared.linkedinUrl, cleared.photoUrl], [null, null, null]);
  await expect("required fields cannot be cleared", "PUT", `/admin/team/${lead.id}`, { body: { group: "" } }, 400, "Group is required.");

  const reordered = (await expect("reordering a sample member keeps it sample", "PUT", "/admin/team/sample-team-test", { body: { sortOrder: 7 } }, 200)).body.data;
  assert.equal(reordered.sample, true, "moving a sample record is not an edit");
  const hiddenSample = (await expect("hiding a sample member keeps it sample", "PUT", "/admin/team/sample-team-test", { body: { isActive: false } }, 200)).body.data;
  assert.deepEqual([hiddenSample.isActive, hiddenSample.sample], [false, true]);
  const resaved = (
    await expect("re-saving an unchanged sample member keeps it sample", "PUT", "/admin/team/sample-team-test", {
      body: {
        name: reordered.name,
        role: reordered.role,
        group: reordered.group,
        bio: reordered.bio,
        photoUrl: reordered.photoUrl,
        linkedinUrl: "",
        isActive: true,
        sortOrder: 7,
      },
    }, 200)
  ).body.data;
  assert.equal(resaved.sample, true, "unchanged values are not an edit");
  const edited = (await expect("editing a sample member makes it real", "PUT", "/admin/team/sample-team-test", { body: { role: "Senior installation technician" } }, 200)).body.data;
  assert.deepEqual([edited.role, edited.sample], ["Senior installation technician", false]);

  const afterEdits = (await expect("public team after edits", "GET", "/team", { token: null }, 200)).body.data;
  assert.deepEqual(afterEdits.map((item) => item.name), ["Early Member", "Bisola Adeyemi", "Tobi Lawal", "Sample Member", "Chidera Okonkwo"]);

  // ---- not found and delete ----------------------------------------------------------------------------
  await expect("unknown team member update", "PUT", "/admin/team/missing", { body: { role: "x" } }, 404, "Team member not found.");
  await expect("delete team member", "DELETE", `/admin/team/${bare.id}`, {}, 200, "Team member deleted.");
  await expect("delete team member again", "DELETE", `/admin/team/${bare.id}`, {}, 404, "Team member not found.");
  await expect("support cannot delete", "DELETE", `/admin/team/${photo.id}`, { token: support.token }, 403, FORBIDDEN);

  // ---- audit --------------------------------------------------------------------------------------------
  const entries = (
    await expect("team audit entries", "GET", "/admin/audit-logs?entity=team_member", {
      project: (body) => ({ actions: body?.data?.items?.map((item) => item.action).sort() }),
    }, 200)
  ).body.data.items.map((item) => [item.action, item.summary]);
  assert.ok(entries.some(([action, summary]) => action === "team_member.create" && summary === 'Created team member "Chidera Okonkwo"'));
  assert.ok(entries.some(([action, summary]) => action === "team_member.update" && summary === 'Updated team member "Sample Member"'));
  assert.ok(entries.some(([action, summary]) => action === "team_member.delete" && summary === 'Deleted team member "Bisola Adeyemi"'));

  return transcript;
};
