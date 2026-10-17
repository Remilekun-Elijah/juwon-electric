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

/** Engineers and installers: members of groups whose name mentions "Engineer" or "Install". */
export const isEngineeringGroup = (name: string) => /engineer|install/i.test(name);

/** Leadership: groups named for heads of department, leadership, management, directors or executives (whole words). */
export const isLeadershipGroup = (name: string) => /\b(heads?|leadership|management|directors?|executives?)\b/i.test(name);

/**
 * One-line description for a support team panel, matched on the group name. Placeholder copy (2026-10-12) until
 * groups carry their own description; unmatched groups get none.
 */
export function groupBlurb(name: string): string | null {
  if (/customer|support|care|sales/i.test(name)) return "Always ready to listen, support and provide the best solutions for our clients.";
  if (/admin|operation|logistic/i.test(name)) return "Keeping the business running efficiently and effectively.";
  if (/financ|account/i.test(name)) return "Ensuring financial integrity, planning and accountability.";
  if (/market|brand|communicat/i.test(name)) return "Telling our story and keeping customers informed.";
  return null;
}
