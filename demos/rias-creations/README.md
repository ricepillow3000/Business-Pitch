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
| `app.js` | Interactions (plain JS, no libraries) |
| `images/` | One photo per spot |

## Things to try

- Hover **Services** in the top bar. Move diagonally into the list; the category won't flip on the way (safe triangle).
- Press **Ctrl K** (or **⌘K**, or **/**) for the search menu. **T** switches day/evening. **B** jumps to booking.
- Click a photo. It grows into a viewer; drag it up or down to close.
- On a phone, the menu button opens a sheet you can swipe down to close.
- Book a visit: the button previews your request, "Request sent" shows instantly,
  then a 6-digit code box appears (any 6 digits work in the demo). **Cancel request** gives you 5 seconds to undo.

## Things to confirm with Ria

- Real prices (only the $35 and $65 specials are hers; the rest are placeholders)
- Full weekly hours (we only know "closes 7:30 PM")
- Whether booking requests should text her phone

Booking, the text code and the rating refresh are simulated in this demo. A real site
would send them to a small server (for example, SMS through a texting service and the
rating from Google).
