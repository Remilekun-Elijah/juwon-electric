// Team page helpers (docs/agents/TEAM_AND_MOTION_V1.md §4). Pure: server and client safe.
import type { TeamMember } from "@/lib/api/types";

export type TeamGroup = { name: string; members: TeamMember[] };

/** Groups in the order each first appears in the API's sorted list; members keep that order. */
export function groupTeam(members: TeamMember[]): TeamGroup[] {
  const groups = new Map<string, TeamGroup>();
  for (const member of members) {
    const name = member.group?.trim() || "Our Team";
    const group = groups.get(name) ?? { name, members: [] };
    group.members.push(member);
    groups.set(name, group);
  }
  return [...groups.values()];
}
