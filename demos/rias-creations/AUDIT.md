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
| Scroll story | Every block flies in flat once, at 15% in view: text from the left, pictures and cards from the right, rows from below; no turning or book-opening (`tests/reveal.cjs`); all blocks land; none hidden without the script or under reduced motion; a jumped-to section is already in place |
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

## The walk-in never blurs the photo

John's screen recording (iPhone, 2026-11-19): right after walking through the doorway, the salon photo
went soft and blocky for a moment, then snapped sharp when the hero took over. The doorway was a small
box (about 230 px wide on a phone) zoomed about 9x, so the photo inside was drawn small and stretched;
iPhones also decode a large photo at the small size it is first laid out. Now the doorway really grows
(its size, not a zoom), and its photo is laid out at the size it lands at and only ever shrunk, ending
at exactly 1:1 where the hero takes over.

`tests/sharp.cjs` holds the walk at its last frame on an iPhone 13 screen and compares it with the
finished hero at the same zoom: before the fix 64% as sharp (FAIL), now 100% (PASS).

```bash
node demos/rias-creations/tests/sharp.cjs "$PWD/demos/rias-creations" /tmp
```

## The walk-in lands in one shot

John (2026-11-19): "it zooms in into frame, but then readjusts last second". Measured frame by frame:
the photo reached its full size early and then kept sliding (20 px on a phone, 40 px on a laptop), the
hero then eased back out 4% over 2.6 s (20 to 51 px), and the walk started with a 12% jump in one frame.
Now the photo's size and place move on one curve that settles softly onto the hero and ends on the same
frame as the doorway clearing the screen; the hero keeps that exact framing (no settle after a walk-in).
The doorway stays just inside the photo until the photo fills the screen, then sweeps past the edges
(checked from 320 px phones to 2560 px screens: the photo is never more than 0.64 px short of the
doorway, and the doorway is see-through while walking, so that sliver shows only blush).

`tests/handoff.cjs` records the photo on every frame on a laptop and an iPhone: no jump, no slide after
the zoom, no readjust after the hand-off. Before: FAIL on all three; now PASS.

```bash
node demos/rias-creations/tests/handoff.cjs "$PWD/demos/rias-creations"
```

## Flat slides, the store's colors, easy booking (2026-11-19)

John: "I don't like it when it opens up like a book ... flying in from the left side, the right side,
or from the bottom". The card lift and the card flip are gone. `tests/reveal.cjs` checks every animated
block's waiting pose and about 100 mid-flight samples per screen: only flat slides (old version: FAIL,
headings folded flat and photos squeezed to slivers; now PASS on a laptop and an iPhone, no sideways scroll).
A blind judge, shown slow-motion filmstrips of the old and new versions in shuffled order, picked the
new one in all three sections: "the fold/squeeze versions read as a gimmick for a salon".

Colors, measured from her salon photo (the listings online could not be opened from here; web search
found no other photos). Difference from the store, CIEDE2000, under 2 is hard to see:

| | Store | Old site | New site |
|---|---|---|---|
| Gold: her mirror brass | #DFB677 | #D6BC8A, 4.7 | #DFB677, 0.0 |
| Dark brown: ceiling, chairs | #1D1A1A | #221713, 5.3 | #201917, 2.8 |
| White: her walls | #F9F8FA | #FDFCFA, 2.3 | #FAFAFB, 0.9 |
| Pink: her roses #B24A63, as a whisper | | #F7EFED, peach | #F8EFF1, rose |

Contrast stays well above the minimum: dark text on the gold 9.1:1, the gold on brown 9.1:1, body text 5.75:1.

Booking, proven by `tests/booking.cjs` on an iPhone and a laptop: "Book a visit" on the first screen;
5 taps and 3 boxes (name, mobile, code) to "Visit confirmed"; every route in works (hero, header,
Services menu, search, each filling in the service); every control on the phone at least 44 x 44 px
(the header's Book now was 40 px tall, fixed); mistakes explained where they happen; a call is one tap.
From the judge's walk-through: no time is chosen for the client any more ("Choose a time." if she skips
it), the Book buttons land on the form itself on a phone, and the mobile number formats as it is typed.
A second fresh judge scored the final version: color match 8/10, glamour 7/10, ease 8/10, and confirmed
"nothing turns, folds or flips". From its notes: times that have already passed today are now hidden
(crossed-out rows read as "fully booked"), and the Services subtitle arrives from the left like its heading.
Both judges found the two-line "Ria's Creations" next to a big "SALON" the weakest part of the look:
her real logo file (still to get from Ria) should replace it.

## A bright site, like her salon (2026-11-20)

John: "do you think switching to a bright version of the website would be better? ... make the changes".
Her logo is made for a light background and her salon is bright where clients look (white walls and
vanities, lit mirrors, a pale floor); the page swung light, dark, light, dark. Now the only dark band is
the hero over her photo: the Gallery is white and Location (with the footer) is a soft blush, with
espresso and gold kept as accents (text, buttons, hairlines). The photo's tint went from 60% to 53%, the
lightest that keeps every hero line readable over the photo's brightest 5% of pixels (laptop and iPhone:
headline 4.0:1 and up, needs 3; paragraph 4.7:1 and up, needs 4.5). The map frame, its name plate and
its fallback address text moved to light-background colors, and the logo's panel blends into the blush
footer as it does on the loading screen.

## Her logo, exactly, on a white header (2026-11-20, final)

John first found the sign's white backing ugly over the dark photo; a version in the salon's gold was tried,
then John: "we want to keep the exact design of her current logo". Chosen: her logo exactly as on her sign
(slate blue #506895 stacked name, the white panel, the pink apostrophe and i-dots, the big heavy SALON),
on a header that is solid white from the very top, so the panel blends in like a letterhead instead of
looking like a sticker. SALON is espresso there (white letters cannot show on white); in evening mode the
white panel shows, exactly as on the sign. The loading screen's logo is about twice as large (343 px wide
on an iPhone 13, was 162; 465 px on a laptop, was 204), stops short of the doorway's ring on short screens,
and is left off a sideways phone, where the doorway fills the screen.
`tests/logo.cjs` (9 checks): the slate name, the panel, the solid white header at the top, 5.4:1 on white,
the pink accents, the heavy SALON, the sign's proportions, bigger, and every phone header fits.
`LOGO-REQUEST.md`: a ready-to-send note asking Ria for her original logo file, which would make it exact.

## Her logo, from her storefront sign (2026-11-20)

John: "make the logo bigger and more glamorous but still exactly her logo ... must look like her store front
logo". Rebuilt from her own photo of the sign (shared earlier, recovered from that conversation):
"Ria's / Creations" stacked tight and centered in a sturdy, wide bold serif, slate blue (#506895, measured)
on a white panel of two overlapping rounded shapes, the apostrophe and both i-dots in pink; beside it a
big, heavy, compact SALON. Fonts: Merriweather ExtraBold at 112% width (its sturdy small-size design) and
Archivo Black at 66% width, the closest free match to the sign's letters. The old wordmark (a soft serif
and a wide geometric SALON, one color, no dots, no panel) was further from the sign.

`tests/logo.cjs` checks the sign's parts from the page, its proportions from the drawn letters
(name / SALON width 0.80, sign 0.82; height 0.87, sign 0.87), that it is bigger (251 px wide on a laptop,
was 204), that the name reads at 5.6:1 on its panel, and that the logo, Book now and the menu share one
row on every phone from 320 to 430 px. The audit leaves the logo out of its contrast and corner checks
(WCAG 1.4.3 exempts logos; the panel's rounded corners are her sign's).

Found on the way: since phones began sliding blocks in from the sides, a block waiting off to the right
made the page 8 px wider than a phone's screen. The page body now clips sideways, and `tests/reveal.cjs`
compares with the screen itself (it compared with the browser's own width, which grew too).

## Buttons: flat, with a gold hairline (2026-11-19)

John: "not really liking the gradient buttons ... professional, glamorous, simple, clean and an accent mark".
The shine along the top edge, the stacked drop shadows and the brighten-on-hover (which together read as a
gradient) are gone. Every button is one flat color, square, with a 1 px hairline set 4 px inside its edge:
gold inside a dark button, espresso inside a gold one, half strength at rest and full on hover. It is the
same concentric line as her arched mirrors and the map frame. The chosen time carries it too.
Text contrast is unchanged (audit 28/28).

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
| 6 | "Book another visit" emptied name and phone; on a laptop both Book buttons showed just below the hero; gallery titles showed faintly behind the photo viewer | Name and phone are kept; the header's Book now waits until the hero's button is gone; the viewer's backdrop is solid |
| 7 | On a laptop the gallery arrows only cut the first photo in half; at 320 px the tabs took a screen; the booking button split the time over two lines | Laptops show all five photos in one row, no arrows; compact tab rows on the smallest phones; day and time stay together |
| 8 | Late in the day, times that had already passed could still be booked; keyboard hints showed in the phone menu; the photo viewer's caption was a long description | Passed times (and any within 30 minutes) are struck through and the next open one is picked; a day with none left says so; no keyboard hints on touch screens; the viewer shows the photo's short title |
| 9 | At 1024 px one gallery caption wrapped and knocked its photo out of line | Captions stay on one line, so the row of photos is even from 1024 px up |
| 10 | At 320 px the time buttons were squeezed edge to edge | Under 360 px the times sit two to a row, each with room around it |
| 11 | Nothing: "nothing left to improve" (laptop, 1024 px, iPhone 13 light and dark, 320 px) | Done |

## Not applicable to a website

Video and thumbnail tips: "big text behind your head", "nothing over your face",
"no dead air", "something new every few seconds". The page does keep text off faces
in the photos and keeps empty space even between sections.

## Still placeholders

Most prices. The flyer and poster prices are real: keratin from $150, eyebrow tint or wax $20,
eyelash extensions from $40, Brazilian $35, full-body wax $65. Ria sets the rest.
