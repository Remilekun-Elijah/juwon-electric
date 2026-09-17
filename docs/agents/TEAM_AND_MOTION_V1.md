# Team page and storefront motion (v1)

Status: **binding**.
Branch: `agents/v3-commerce`.
Owner request (2026-09-17): a team page with dummy pictures and nice animations, "just like the sample site", plus nice animations across the landing page.
Builds on `LANDING_V1.md`. Its sample and copying rules apply here too: sample data is flagged, seeds are local only, and **nothing is copied from the reference site**. That includes its names, photos and org structure.

Reference observation: the reference "Meet the team" is a grid of headshot cards (name and role) grouped into tiers, with almost no motion. We keep the idea (grouped headshot cards) and add our own tasteful motion.

## 1. Team members (backend, both runtimes)

Collection `teamMembers`. Admin CRUD is at `/admin/team` and requires `content:read` / `content:write`. The public list is at `/team`.

```ts
type TeamMember = {
  id; name: string /* 1–100 */; role: string /* 1–80, e.g. "Lead installation engineer" */;
  group: string /* 1–60, e.g. "Leadership", "Engineering & installations", "Sales & customer care", "Operations" */;
  bio: string | null /* ≤300 plain text */;
  photoUrl: string | null /* http(s) URL or site path "/..." (LANDING_V1 rule) */;
  linkedinUrl: string | null /* https URL */;
  sortOrder: number; isActive: boolean; sample: boolean; createdAt; updatedAt;
};
```

- **Public read:** `GET /team` returns active members as an array, sorted by `sortOrder`, then `createdAt`.
- **Group order** is the order in which each group first appears in that sorted list.
- **Messages:** "Team retrieved.", "Team member created.", "Team member updated.", "Team member deleted.", "Team member not found."
- **Audit:** entity `team_member`, with actions `team_member.create`, `team_member.update` and `team_member.delete`.
- **Sample flag:** the same rules as LANDING_V1 plus `keepSampleUnlessEdited`. Moving, hiding, or saving without changes keeps the flag.
- **Seeds:** extend `backend/shared/sampleWebsite.js`, the Express `seed:sample` script, and the exported D1 `seeds/sample-website.sql`.
  - 12 sample members with **fictional** Nigerian names across the four groups above, with plausible roles for a solar and electrical installer.
  - Bios are one sentence and tied to real work: sizing systems, installations, after-sales.
  - `photoUrl` is `/samples/team/member-1.svg` to `member-12.svg`.
  - LinkedIn is null.
- **Revalidation:** tag `team` and mapping `/admin/team` → `team`. The storefront agent adds these in `lib/storefront/data.ts` and `notify.ts`.
- **Tests:** parity scenario plus seed tests. `backend/docs/API.md` is updated.

## 2. Admin: "Team" module in the Website nav group

- **List:** photo thumbnail (a round avatar with initials fallback), name, role, group, active status, a Sample badge, a group filter, and ▲▼ reorder buttons.
- **Create/edit drawer:**
  - name, role, and group (free text with suggestions from existing groups)
  - bio with a character count
  - photo URL or site path with live preview
  - LinkedIn URL
  - a "Show on the website" switch
- **Other:** delete confirmation, and the sample banner, as the other Website modules have. Follow `components/admin/website/*` patterns exactly.

## 3. Dummy pictures (storefront public assets)

Add `frontend-next/public/samples/team/member-1.svg` … `member-12.svg`.
- **Style:** neutral illustrated portraits. An abstract head-and-shoulders silhouette on a soft background, varied across brand-50/100, slate-100 and amber-50 tones, with subtle clothing colour variation.
- **Restrictions:** no faces of real people, no stock photos, no text.
- **Size:** square 400×400 viewBox, each under 3 KB.
- **Fallback:** team cards also handle a null photo with an initials avatar.

## 4. Team page `/team` (storefront)

- **Header:** `PageIntro` with eyebrow "Our people", title "Meet the team", and the description "The engineers, installers and customer care staff behind every Juwon Electric system."
- **Stats strip:** team size, number of groups and engineers count, computed from the data (members in groups whose name contains "Engineer" or "Install"). Uses the count-up animation (§5). No invented figures.
- **Groups:** each group is a section with an h2 group name and a responsive card grid (2 columns at 375 px, 3 at 768, 4 at 1280).
- **Card:**
  - square photo (rounded-2xl), name, role
  - on hover or focus: the photo zooms gently (scale 1.04), and a brand-800/80 gradient overlay slides up showing the bio (when present) and a LinkedIn icon link (when present)
  - on touch devices the bio is shown under the role instead, since there's no hover
  - a Sample pill on sample members
- **Call to action band:** "Want to join us?" linking to `/vacancies`.
- **Discoverability:** add `/team` to the sitemap, the footer (Company column), and the header nav only if it fits. Metadata with canonical. `loading.tsx`. JSON-LD `Organization` with `employee` entries (name, jobTitle) for non-sample members only.

## 5. Motion system (storefront-wide; no new dependencies)

Build it with CSS transitions and keyframes plus a tiny `IntersectionObserver` hook. **No animation libraries.**

1. **`Reveal` component** (`components/storefront/motion/Reveal.tsx`, client).
   - Wraps children and fades and slides them in (`opacity 0→1`, `translateY 16px→0`, 500 ms, ease-out) when about 15% visible. It animates once.
   - Props: `delay` (ms), `as`, and `stagger` (for lists: children get incremental delays of 60 ms each, capped at 8 items).
   - **Content must be visible without JavaScript, and to crawlers.** Render visible by default; apply the hidden pre-animation state only after mount and only when the element is below the fold at mount. Nothing may flash or shift layout.
2. **`CountUp` component.** Animates numbers inside a string ("500+" → counts 0→500 then shows "+"; "8 yrs" → 0→8) over about 1.2 s when revealed. Non-numeric values render as-is.
3. **Hover polish utilities.**
   - Cards lift (translate-y −2px, shadow elev-2→elev-3, 200 ms).
   - Images zoom 1.03–1.05 inside `overflow-hidden`.
   - Buttons get a subtle press state (`active:scale-[0.98]`).
   - Arrow icons nudge right on hover.
4. **Client logos marquee.** When there are more logos than fit, a slow continuous horizontal scroll (duplicated track, CSS keyframes, about 40 s per loop). It pauses on hover and on focus-within, has edge fade masks, and shows the static grid under reduced motion.
5. **Hero entrance.** Staggered entrance of eyebrow → h1 → text → buttons → chips → photo card (Reveal with delays). The price card floats in slightly after the photo.
6. **Section headings.** Eyebrow and title reveal as you scroll.
7. **How it works.** Steps reveal in sequence, and the connecting line draws across (scaleX 0→1) on reveal.
8. **Stats band and team stats** use `CountUp`.
9. **Calculator results** animate number changes with a short count, 250 ms.
10. **Accessibility.**
    - Under `prefers-reduced-motion: reduce` there's no movement: fades are at most 150 ms, or disabled, and there's no marquee or count-up (final values show immediately).
    - Nothing flashes more than 3 times a second.
    - Focus states are unchanged.
11. **Performance.**
    - Animate only `transform` and `opacity`.
    - At most one `IntersectionObserver` per Reveal instance, disconnected after it reveals.
    - No scroll listeners.
    - No layout shift (CLS) from animations.

**Apply motion to:** the home hero; every home section (stats, logos, why choose us, solutions, packages, calculator teaser, case studies, reviews, how it works, financing, FAQ, final CTA); product and package cards; the portfolio grid; the team page; the FAQ page; the calculator page. Keep it tasteful: motion supports reading and never delays access to content.

## 6. Ownership

| Agent | Owns |
|---|---|
| Team backend+admin | `backend/**`; `frontend-next/lib/api/types.ts` (TeamMember types, commit first); `frontend-next/{app,components,lib}/admin/**`; `lib/api/admin.ts` |
| Storefront team+motion (starts after the Landing storefront agent finishes) | `frontend-next/{app,components,lib}/storefront/**` (including the `team` tag in `data.ts` and `notify.ts`); `lib/api/public.ts`; `app/sitemap.ts`; `public/samples/team/**` |
| Docs | `PRODUCT_REQUIREMENTS.md`, `docs/USER_GUIDE.md` (after the two agents above) |
