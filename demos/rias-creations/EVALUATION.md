# Ria's Creations: the full evaluation (2026-11-21, BP-15)

John asked: "go through the entire site, press all the buttons, search up using the search up bar, use the light and
dark mode, literally everything from top to bottom", then write the good and the bad, meet the council, and prove the
fixes make the site better.

## 1. How it was tested

- **Every control, pressed by a script** (`tests/tour.cjs`, new). On a laptop (1280 x 800) and an iPhone 13, each in
  Light and Dark mode, the script did the following:
  - watched the loading screen
  - scrolled every section
  - ran ten searches and pressed Enter on one
  - opened the Services menu and the five tabs
  - opened a gallery photo large
  - turned the reviews
  - booked a visit end to end (code included)
  - checked the call, map and copy controls
  - flipped the mode and opened Privacy and Terms

  Result: 4 visits, **0 faults, 0 script errors**.
- **Three fresh critics**, each with their own lens and none seeing the others' notes:
  - a 40-year-old client booking on her iPhone
  - a luxury salon brand designer
  - a motion and interaction tester
- **A council** checked every claim against the files and by running the page before voting. Two claims were false, and
  the council caught both:
  - "keyboard hints show on phones": touch screens already hide them
  - "the chosen time looks greyed out": it was a picture taken during a 160 ms colour change

## 2. What is good

- **Everything works**, on both screens and in both modes. No dead button, no error.
- **Booking is short and clear.**
  - Four fields and a time.
  - The button spells out the visit ("Request balayage, Mon at 12:00 PM").
  - A Sunday says it is closed.
  - The code confirms with no extra tap, and the confirmation gives a reference.
- **The first screen is calm.** It shows what the salon does, the 4.5 rating, a live "Open now until 7:30 PM" and one
  gold button. The open/closed line is right at every time tested.
- **Real things only:**
  - her salon, her work, Ria herself and her exact sign
  - colours taken from her salon
  - named reviews linked to Google and Yelp
- **It looks expensive.** The fashion-magazine serif, the arched mirror around Ria's portrait and the editorial reviews
  look high-end. Buttons are flat with a fine gold line. Dark mode is warm and consistent.
- **Motion is purposeful:**
  - the search opens in about 160 ms
  - gallery photos grow smoothly on hover
  - the reviews settle with no bounce
  - reduced motion turns everything off
- **Search understands everyday words:** wedding goes to Bridal hair, parking to Hours, price to Services.

## 3. What was bad (and what the council decided)

| # | Finding | Who | Verdict |
|---|---|---|---|
| 1 | On the shared link the map cannot load, so a big framed box showed only the address, the third time on screen. It was the largest dead area on the phone. A real bug also made the phone box tall (4:5) instead of wide (4:3). | all | **Fixed** |
| 2 | Phone: the five service tabs sat on two loose rows, 28 px apart, with the underline floating between them. | all | **Fixed** |
| 3 | Phone: the menu button focused the search box, so on an iPhone the keyboard covered the menu. | client, motion | **Fixed** |
| 4 | Search said "No matches" for everyday words: appointment, booking, phone, how much, sunday, walk in, cash, eyebrows. "lashes" ranked Eyelash extensions fifth. | client, motion | **Fixed** |
| 5 | On every first visit to a laptop, "Location" slid into "Dark mode" (12 px overlap), because the new link was not in the header's entrance. | motion | **Fixed** |
| 6 | The "code is coming" placeholder and the sending dot pulsed forever, breaking the "nothing loops" rule. | designer | **Fixed** (6 pulses) |
| 7 | The labels "Special" and "Holiday" meant nothing on a phone, because their tooltip never shows on touch. | orchestrator, designer | **Fixed** ("Special price", "Holiday price") |
| 8 | The phone page was 10.04 screens, over the 10-screen cap. | client, designer | **Fixed** (9.34) |
| 9 | Dark mode: her logo's white panel looks like a sticker on the dark header. | orchestrator, designer | **John: no white panel, recolor it** (BP-16): her slate lightened to #859fcf, 7.0:1 on the header |
| 10 | Prices sit 2.85 screens down on a phone because Meet Ria comes first. | client | **John: keep the order** (prices are placeholders) |
| 11 | "Come on in" on the loading screen is gone before it can be read. | motion | **John: no added wait** (BP-16): two lines, each readable (908 ms, 662 ms), walk starts when it did |
| 12 | The loading screen plays again in every new tab, about 3.5 s. | client | **John: once per tab, not on a refresh**: already so, now proved (`tests/entry.cjs`) |
| 13 | Rejected: Back to close dialogs (risky), tap a price to book (accidental taps), a taller headline line (no gain), a slower Services hover, a bigger portrait, the Bodoni W, the gallery order, the logo twice, price on the confirmation (sample prices), "Book now" vs "Book a visit", moving Dark mode up the menu (against John's "right under them"). | | |

## 4. Proof the fixes made it better

**Tests:** `tests/polish.cjs` (new) failed 9 of 11 checks on the old site and passes 11 of 11 on the new one. Every older
test passes too:
- audit 28/28
- buttons 130/130
- motion 14/14
- reveal, booking, handoff, sharp, look
- logo 10/10
- tour: 0 faults

**Measured, before and after** (phone figures are an iPhone 13 on the shared link):

| | Before | After |
|---|---|---|
| Phone page height | 6,668 px, 10.04 screens | 6,202 px, 9.34 screens |
| Location section on the phone | 1,428 px | 991 px |
| Service tabs block on the phone | 138 px | 110 px |
| Phone menu brings up the keyboard | yes | no |
| Everyday searches answered (of 7) | 0 | 7 |
| "lashes" puts Eyelash extensions | 5th | 1st |
| Laptop header overlap at the intro | 12 px | 0 px |
| Endless animations on the open page | 2 | 0 (the loading screen's scissors and word drift still loop while it shows, about 3.5 s; it is then removed) |

**Blind judge:**
- **The setup:** a fresh judge saw seven before/after picture pairs labelled only A and B, in a random order kept in a
  separate key. The judge never saw the plan.
- **The pairs:** it chose the new version in all 6 pairs where it saw a difference. The 7th looked the same.
- **The whole page:** the new version scored higher on Easier (8 vs 7), Simple (8 vs 6), Convenient (8 vs 7) and Clean
  (8 vs 6). It tied on Not boring, Interesting, Intriguing and Glamorous (7 each).
- **Its honest loss:** hiding the map box also hid "Lilburn Corner · Suite 156, free parking". So the shared link now hides
  only the empty box and keeps that line (fix round F1, checked by `tests/polish.cjs` b).
