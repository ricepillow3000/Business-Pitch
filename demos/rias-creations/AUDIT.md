# Design audit: Ria's Creations demo

Measured in a real browser (Chromium, 1440×900 and iPhone 13) by `tests/audit.cjs`.
Re-run it from the repo root:

```bash
node demos/rias-creations/tests/audit.cjs "$PWD/demos/rias-creations" /tmp
```

## Result

```
PASS  No gradients in code  (0 found)
PASS  No glassmorphism (backdrop-filter)
PASS  No italic type
PASS  All caps only in the logo (her real logo uses them)
PASS  No emojis  (©)
PASS  Consistent icon stroke  (stroke-width="1.5")
PASS  Favicon + social meta tags
PASS  Every text passes WCAG AA contrast  (161 text elements checked)
PASS  No gradient backgrounds (computed)
PASS  No glass (computed)
PASS  No italic text (computed)
PASS  Sharp corners (only the arch mirrors and status dots are round)  (arch:999px, photo-btn:999px)
PASS  Readable labels (smallest text ≥ 12px)  (12px)
PASS  One highlighted word
PASS  Single-button hero  (1 button(s))
PASS  Every photo used once  (7 photos)
PASS  No fade-in on every section (nothing animating after the intro)  (0 running)
PASS  No JS errors
PASS  A few strong reviews, not a wall of testimonials  (5 reviews)
PASS  Every review links to its source (Google or Yelp)
PASS  Consistent section spacing  (120px)
PASS  No em dashes in the copy  (0 found)
PASS  Privacy policy and terms linked
PASS  Evening (dark) mode passes WCAG AA contrast too
PASS  No sideways scroll on phone
```

## The checklist, item by item

| Rule | Where it stands |
|---|---|
| Real photos, each used once | 7 of her own photos; nothing repeats |
| Real logo | Script "Ria's" over "Creations Salon", matched to her flyer |
| Her own colors | Espresso, white, gold and a hint of blush, taken from the salon |
| One highlighted word | "beautifully" in gold, upright (not italic) |
| Sharp corners, matched radii | Every corner is square; only the arched mirror shape is round |
| Solid cards, no colored borders | Flat white cards with a thin neutral edge |
| No gradients, glows, glass or orbs | None in the code or on screen |
| Readable labels, less all caps | Smallest text 12px; caps only in the logo |
| No pill badges, consistent icons, no emoji | Square tags; one icon stroke width (1.5) |
| Single-button hero, no headline badge, no stat banner | One "Book a visit" button under a single sentence |
| No 1-2-3 steps | None; booking progress is three unnumbered segments |
| No bounce | Springs are critically damped |
| 3-word captions | Every photo caption is three words or fewer |
| No fade-in on every section | Only the opening animation; nothing else animates on its own |
| Contrast | Every text passes WCAG AA in day and evening modes |
| Text wrapping | Balanced headlines, no one-word lines (address kept together) |
| Favicon and meta tags | `favicon.svg`, `apple-touch-icon.png`, Open Graph and Twitter tags |
| Progress, skeletons, semantic colors | Only in the booking flow and the map; green good, amber waiting, red problem |
| Reviews with proof | 5 reviews, each linked to Google or Yelp |
| Privacy and terms | `privacy.html` and `terms.html` (drafts for Ria to review) |

## Not applicable to a website

Video and thumbnail tips: "big text behind your head", "nothing over your face",
"no dead air", "something new every few seconds". The page does keep text off faces
in the photos and keeps empty space even between sections.

## Still placeholders

Most prices. The flyer and poster prices are real: keratin from $150, eyebrow tint or wax $20,
eyelash extensions from $40, Brazilian $35, full-body wax $65. Ria sets the rest.
