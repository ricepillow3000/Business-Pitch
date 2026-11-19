# Ria's Creations Salon: website demo

A one-page website mock-up to show Ria (Lilburn, GA). No install needed.

**To open it:** double-click `index.html`. It opens in your web browser.
Fonts and the map need internet; everything else works offline.

## Add the lounge photo

Save the waiting-lounge photo (brown chairs, olive tree, lit oval mirror) as
`images/lounge.webp`. It appears next to the booking form. Every photo on the page is
used only once, so until that file exists the lounge card stays hidden.

## Files

| File | What |
|---|---|
| `index.html` | All content, already rendered (works before the script loads) |
| `styles.css` | Colors, type, layout, motion |
| `app.js` | Interactions (plain JS) |
| `vendor/anime.hero.min.js` | Anime.js v4.5.0 (MIT), a slim build used only for the hero intro. If it fails to load, a CSS version of the intro plays instead |
| `images/` | One photo per spot, each in a small and a full size (see "Speed") |
| `privacy.html`, `terms.html` | Plain-language drafts for Ria to review |
| `_headers` | Cache rules for Cloudflare Pages or Netlify |
| `tests/audit.cjs` | The design audit; results in `AUDIT.md` |
| `tests/buttons.cjs` | Presses every button, link, tab and menu item on a laptop and a phone |

## Things to try

- Open the page fresh: it counts to 100% with her salon in the arched doorway, then walks you inside.
  It plays once per visit (close the tab to see it again); links like `index.html#book` skip it.
- Scroll down slowly. Each section tells its part once: the heading turns face up like a card
  lifted off the table, the text slides in from its side, the photos rise one after another.
  Jump with a link or the search menu and the section is simply there, already in place.
- Hover **Services** in the top bar. Move diagonally into the list; the category won't flip on the way (safe triangle).
- Press **Ctrl K** (or **⌘K**, or **/**) for the search menu. **T** switches day/evening. **B** jumps to booking.
- Click a photo. It grows into a viewer; drag it up or down to close.
- On a phone, the menu button opens a sheet you can swipe down to close.
- Book a visit: the button previews your request, "Request sent" shows instantly,
  then a 6-digit code box appears (any 6 digits work in the demo). **Cancel request** gives you 5 seconds to undo.

## Speed

- Plain files: nothing is built or fetched from a database on a visit, and the script makes no data requests.
- Each photo comes in a small and a full size, and the browser picks the one the screen needs
  (`srcset`). A phone loads the salon photo at 100 to 211 KB instead of 338 KB; the gallery photos at
  21 to 64 KB each on a laptop. The photo viewer swaps to the full size only when you open a photo.
- Photos below the first screen load only when you scroll near them; the map loads only near the
  Location section.
- Reviews show one at a time, services one category at a time, the gallery five photos: nothing long
  is drawn at once.
- `_headers` lets browsers keep photos for a year. A changed photo must get a new file name
  (as `salon-floor.webp` did), or visitors keep the old one.

## Things to confirm with Ria

- The remaining prices (real so far: keratin from $150, eyebrow tint or wax $20, lashes from $40, Brazilian $35, full-body wax $65)
- The privacy and terms drafts
- Whether booking requests should text her phone
- Her logo file, to replace the matched script wordmark
- A full-size original of the salon photo (the page uses her photo enlarged 4 times)

Booking, the text code and the rating refresh are simulated in this demo. A real site
would send them to a small server (for example, SMS through a texting service and the
rating from Google).
