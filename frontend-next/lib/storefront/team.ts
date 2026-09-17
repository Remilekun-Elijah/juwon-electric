// Team page helpers (docs/agents/TEAM_AND_MOTION_V1.md §4). Pure: server and client safe.
import type { TeamMember } from "@/lib/api/types";

export type TeamGroup = { name: string; members: TeamMember[] };

/** Groups in the order each first appears in the API's sorted list; members keep that order. */
export function groupTeam(members: TeamMember[]): TeamGroup[] {
  const groups = new Map<string, TeamGroup>();
  for (const member of members) {
    const name = member.group?.trim() || "Our team";
    const group = groups.get(name) ?? { name, members: [] };
    group.members.push(member);
    groups.set(name, group);
  }
  return [...groups.values()];
}

/** Engineers and installers: members of groups whose name mentions "Engineer" or "Install". */
export const isEngineeringGroup = (name: string) => /engineer|install/i.test(name);

export type TeamStat = { label: string; value: string };

/** Figures computed from the list only (no invented numbers). Engineers are left out when there are none. */
export function teamStats(groups: TeamGroup[]): TeamStat[] {
  const size = groups.reduce((total, group) => total + group.members.length, 0);
  const engineers = groups.filter((group) => isEngineeringGroup(group.name)).reduce((total, group) => total + group.members.length, 0);
  const stats: TeamStat[] = [
    { label: size === 1 ? "Team member" : "Team members", value: String(size) },
    { label: groups.length === 1 ? "Team" : "Teams", value: String(groups.length) },
  ];
  if (engineers > 0) stats.push({ label: engineers === 1 ? "Engineer and installer" : "Engineers and installers", value: String(engineers) });
  return stats;
}
