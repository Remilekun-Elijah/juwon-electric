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

## 7. Addendum (owner, 2026-09-17): immersive hero, header and a darker, less white home page

The owner shared a screenshot of the reference hero and asked for: "the homepage of the storefront is too white. the header area also needs work, make it look like the attached image with animations. make the sections that can animate do it."

We match the **look and motion**, not the content. Don't copy the reference's registration number, founding year, customer counts, city list, wording or photos.

### 7.1 Colour tokens
Add a gold accent scale in `app/globals.css` `@theme`. Gold comes from the Juwon logo, and `--gold #dfc638` already exists in the Vite `App.css`:
- `--color-gold-300: #ecd873`
- `--color-gold-400: #dfc638`
- `--color-gold-500: #c9ad1f`
- `--color-gold-600: #a48c16`

Rules:
- Gold is for accents on **dark** surfaces only: highlighted headline words, stat numbers, primary buttons on dark.
- Dark surfaces use `slate-950`, `slate-900` or `brand-950`.
- Text on gold buttons is `slate-950`.
- Keep contrast at 4.5:1 or better for body text.

### 7.2 Header (`StoreHeader`)
- **Home page at the top (scrollY < 24):**
  - The header is transparent and overlays the hero.
  - Nav links are white/90, with a gold underline (2px) on the active item.
  - The logo sits on a small white rounded chip, so the multicolour logo stays legible.
  - The phone link is white.
  - The cart button is a glass button (`bg-white/10 border-white/20`).
  - A gold pill CTA reads **"Get a quote"** and links to `/contact?topic=Quote`.
- **After scrolling, and on every other page:** the solid white header with its bottom border and `shadow-elev-2`, as today. It transitions smoothly (background, colour and shadow, 250 ms) using a passive scroll check throttled with `requestAnimationFrame`. This is the one scroll listener allowed.
- **Mobile:** the same transparent-then-solid behaviour. The menu button is a glass button while transparent.
- The header must not shift layout. The hero reserves the header height at the top.

### 7.3 Hero (`HomeHero`), full-bleed and immersive
- **Size and placement:**
  - Edge to edge, not the rounded panel.
  - `min-h-[640px] h-[100svh] max-h-[920px]`.
  - It sits under the transparent header.
- **Background slideshow:**
  - Up to 4 installation photos from `public/panel-1.webp`…`panel-6.webp`, `next/image` with `fill`.
  - The first image has `priority`; the others load lazily.
  - Crossfade every 7 s (opacity, 1 s).
  - The active image slowly zooms in, Ken Burns style (scale 1 → 1.08 over 8 s).
- **Overlay:**
  - A left-to-right gradient from `slate-950/90` to `slate-950/40`, plus a bottom gradient to `slate-950/80`.
  - Text contrast must pass on every photo.
- **Slide indicators:**
  - 4 thin bars, bottom centre.
  - The active bar fills with a gold progress animation over 7 s.
  - Clicking or pressing a bar jumps to that slide.
  - Autoplay pauses on hover and on focus-within.
  - A small visible **pause/play** button sits next to the bars, for accessibility.
  - Under `prefers-reduced-motion`: no autoplay and no zoom. The first image is static and the bars still work.
- **Content** (left, `max-w-3xl`):
  1. **Status pill (glass):** a green dot with a soft pulse and the text "Inverter, battery & solar systems in Lagos". No invented registration or founding year.
  2. **h1:** "Reliable power for Lagos homes and **businesses**", sized `text-4xl sm:text-6xl lg:text-7xl`, white. The last word uses a gold gradient text fill.
     - Entrance: each line slides up from a clipped mask, staggered.
  3. **Lead paragraph:** the existing copy, white/80, `text-lg sm:text-xl`.
  4. **Buttons:**
     - Primary gold pill "Shop packages" with an arrow.
     - Secondary glass pill "Chat on WhatsApp" with the WhatsApp brand glyph in lucide (`MessageCircle`) when `website.whatsappNumber` is set; otherwise "Talk to an engineer" (tel).
     - Both are 56 px tall with a hover lift.
  5. **Divider:** a thin `white/15` line.
  6. **Stats row:** from `settings.website.stats`, up to 4.
     - Gold numbers `text-4xl sm:text-5xl`, with CountUp when revealed.
     - Uppercase white/70 labels, tracking-wide, small.
     - The Sample pill shows when the stats are sample.
     - The separate "Juwon Electric in numbers" band is removed from the home page.
  7. **If there are no stats:** show the reassurance ticks row (existing) instead.
- **Floating price card:** bottom-right of the hero on `lg+`, glass (`bg-white/10 backdrop-blur border-white/20`).
  - Text: "Complete packages from ₦…" in gold, with an arrow link.
  - It floats in after the content.
  - Hidden on mobile.
- **"Shop by battery type" chips:** move them to the "Find your package" section header, as tabs or chips.
- **Scroll cue:** bottom-left, "SCROLL" in small tracking-wide type beside a vertical line with a gold dot sliding down (loop, 2 s). Hidden under reduced motion. It's a button that scrolls to the next section.
- **Load animations:** the background zooms in; then the pill, the h1 lines, the lead, the buttons, the stats (count-up) and the price card appear in sequence (about 80–120 ms steps). Content must still be in the HTML and visible without JavaScript.

### 7.4 Floating actions (replace the current WhatsApp button)
The stack sits bottom-right, respects the safe area, and is hidden on `/cart` and `/checkout`.
- **"Size your system"** (sub-label "Load calculator"): a gold pill with a `Calculator` icon on a darker circle. Links to `/calculator`. Shown only when the calculator is enabled.
- **"Chat on WhatsApp"** (sub-label "We reply during business hours"): a green-free brand pill (`brand-600` background, white text) with a `MessageCircle` icon. Shown only when a WhatsApp number is set.
  - No fake "online" status and no fake notification badge.
- **Behaviour:**
  - On load, the pills slide in from the right after about 1.2 s.
  - On phones they collapse to 56 px circles with an aria-label.
  - When the footer is in view, they fade their background so they don't cover footer links.

### 7.5 Less white: section rhythm on the home page
Alternate surfaces so no two adjacent sections share the same white background:

| # | Section | Surface |
|---|---|---|
| 1 | hero | dark photo |
| 2 | client logos | white, marquee |
| 3 | why choose us | **dark `slate-950`**: white text, cards `bg-white/5 border-white/10`, icons in gold circles, hover glow |
| 4 | solutions (who we power) | `slate-50`: image-led cards with a dark gradient overlay, title on the image, zoom on hover |
| 5 | find your package | white, with battery-type chips in the header |
| 6 | shop by category | `slate-50` |
| 7 | popular products | white |
| 8 | calculator teaser | **brand panel**: `brand-900` with a gold accent, animated numbers preview |
| 9 | case studies | white: image cards with overlay badges, zoom on hover |
| 10 | reviews | `brand-50` tint: quote cards, star fill animation on reveal |
| 11 | how it works | **dark `slate-950`**: gold step numbers, connector line draw |
| 12 | financing | white |
| 13 | FAQ | `slate-50` |
| 14 | careers teaser | white, compact |
| 15 | final CTA | brand red panel with a background photo overlay and gold primary button |

- The **footer** turns dark `slate-950` with white/70 text and gold hover links, on every storefront page.
- Section eyebrows are gold on dark and brand-700 on light.

### 7.6 Animation checklist (everything that can animate)
- Reveal on scroll for every section heading and card grid (staggered).
- CountUp: hero stats, team stats, the calculator teaser preview.
- Marquee: client logos.
- Hover: card lift and glow; image zoom; arrow nudge; button press.
- How it works: the line draws and steps appear in sequence.
- Reviews: the stars fill one by one on reveal.
- Solutions and case studies: the image overlay text slides up on hover.
- Financing: the worked-example numbers count up when revealed.
- FAQ: smooth height and opacity when an answer opens (CSS `details` transition via `grid-template-rows` trick or JS measure), with the chevron rotating.
- Calculator page: the results tween.
- Team page: as in §4.
- Header: the transparent→solid transition.
- Floating actions: slide in.
- `prefers-reduced-motion` turns off all movement: no autoplay, marquee, count-up or zoom. Content still shows instantly.
