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
PASS  All caps only in the logo (her sign uses them)
PASS  No emojis  (©)
PASS  Consistent icon stroke  (stroke-width="1.5")
PASS  Favicon + social meta tags
PASS  Entry walk-in plays, then hands over to the hero
PASS  Entry plays once per visit (not again on reload)
PASS  Every text passes WCAG AA contrast  (195 text elements checked)
PASS  No gradient backgrounds (computed)
PASS  No glass (computed)
PASS  No italic text (computed)
PASS  Sharp rectangles only (just the arched mirrors and dots are round)  (999px)
PASS  Outer and inner corners match  (true, true)
PASS  Readable labels (smallest text ≥ 12px)  (12.48px)
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
| Real logo | Her storefront sign rebuilt in type: "Ria's Creations" stacked beside a big SALON |
| Her own colors | Espresso, white, gold and a hint of blush, taken from the salon |
| One highlighted word | "beautifully" in gold, upright (not italic) |
| Sharp rectangles, matched corners | Every button, input, search bar, menu, card and photo is square; only the arched mirror frames and status dots are round |
| Solid cards, soft shadows, hairlines | White cards with a thin neutral edge and a soft, uncolored shadow; 1px hairlines between sections |
| No gradients, glows, glass or orbs | None in the code or on screen |
| Readable labels, less all caps | Smallest text 12px; caps only in the logo |
| No pill badges, consistent icons, no emoji | Square tags; one icon stroke width (1.5) |
| Single-button hero, no headline badge, no stat banner | One "Book a visit" button under a single sentence; "Book now" in the sticky nav |
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

| Feels like a salon | Full-bleed photo of her salon floor, headline names hair, brows and lashes |
| Entry walk-in | Loads on a blush screen with her salon in the arched doorway, then walks you in; plays once per visit |
| Hero text over the photo | Worst-case contrast measured on the brightest 5% of pixels behind each line: 5.1 to 6.1 |
| Scroll story | Six moves mixed so no two sections arrive alike: a card lifted face up, a card flipped over (gallery photos dealt like a deck), drop from above, rise from below, slide from either side; once each, at 15% in view; all 32 blocks land; none hidden without the script or under reduced motion; a jumped-to section is already in place |
| Short page | 4,711 px at 1280×800 (5.9 screens, was 7.9); 6,510 px on an iPhone 13 (was 7,004); about 600 words on the whole page |
| Page weight | 1,443 KB before; now 681 KB (laptop), 964 KB (retina laptop), 1,266 KB (iPhone); the background downloads once |

## Every button

`tests/buttons.cjs` presses every link, button, tab, time slot and field on a laptop and an
iPhone, one at a time on a fresh page, then everything inside the services menu, the call
popover, the search menu (each of its items), the photo viewer and the phone's menu sheet.
A control passes when something visible happens and no script error appears.

```bash
node demos/rias-creations/tests/buttons.cjs "$PWD/demos/rias-creations"
```

Fixed on the way: links inside hidden review cards could be reached with Tab (hidden cards are now
inert), and letting go of the phone's menu sheet after pulling it upward closed it (a drag is no
longer read as a tap outside).

## Nothing freezes mid-move

`tests/motion.cjs` tries hard to stop an animation half way, on a laptop and an iPhone:
a 6x slower CPU, animation frames switched off mid walk-in, a scroll storm on a slow CPU,
the page frozen and resumed, the page hidden and shown, the screen rotated, and tabs and
reviews pressed rapidly. After each one, every block must sit at full opacity with no
leftover tilt or offset. 14 of 14 pass.

How: every move has a deadline (walk-in 3 s, hero intro 4.5 s, each scroll block its own
length plus a little), finishing twice is harmless, and coming back to the page lands anything
that was moving. On iPhones (Safari's engine) the card turns fold open flat, which can't stall
half-turned.

```bash
node demos/rias-creations/tests/motion.cjs "$PWD/demos/rias-creations"
```

## The council: cut until nothing is left

A fresh critic used the whole site each round (laptop, iPhone 13, dark mode, 320 px), wrote what was
good and what was boring, wordy, confusing or broken, and the fixes went in before the next critic looked.

| Round | What the critic found | What changed |
|---|---|---|
| 1 | Rating counted up from "3.0"; a long intro with a dead pause; on phones the logo sat on the headline; two gold buttons at once; internal notes visible; wordy Meet Ria, reviews and booking; a theme switch and "Ctrl K" badge; search put Balayage last; the missing lounge photo | 4.5 from the start; a shorter walk-in; the header turns solid on scroll; one gold button at a time; Meet Ria in one sentence and the motto; one score line; booking in one line plus a call link; no theme switch or badge; best name match first; lounge card removed |
| 2 | Two service tabs hidden off-screen on phones; "Request sent" looked finished before the code; calling took two taps; the card tucked under the header; the menu icon showed through the photo viewer | Tabs wrap on phones; "Check your texts"; one-tap call on phones; the card scrolls clear of the header; the viewer hides the header |
| 3 | A Sunday could be picked and the button agreed; the confirmation dropped the service | "Closed Sundays" shows at once; "Balayage on Monday ... See you then, Maria!" |
| 4 | At 320 px the menu button was cut off; the Notes hint was cut off; the phone number split over two lines | Everything fits at 320 px; "Example: long layers"; the number stays on one line |
| 5 | The review arrows moved as quotes changed length; at 320 px the booking card briefly ran past the screen | The reviews box is as tall as the longest review; the booking column never grows past the screen |

## Not applicable to a website

Video and thumbnail tips: "big text behind your head", "nothing over your face",
"no dead air", "something new every few seconds". The page does keep text off faces
in the photos and keeps empty space even between sections.

## Still placeholders

Most prices. The flyer and poster prices are real: keratin from $150, eyebrow tint or wax $20,
eyelash extensions from $40, Brazilian $35, full-body wax $65. Ria sets the rest.
