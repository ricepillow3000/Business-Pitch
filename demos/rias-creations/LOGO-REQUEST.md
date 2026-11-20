# Asking Ria for her logo file

The site rebuilds her storefront sign in type, measured from a photo of it: the shapes, colors and
proportions match within a few percent, but the typefaces are the closest free matches, not the sign's
own. Her original logo file makes the website's logo an exact copy.

## What to ask for

- A **vector** file of the logo: **SVG, AI, EPS or PDF** (any one). These stay sharp at every size.
- If she only has a picture of it: the **largest PNG or JPG** she has, on a plain background.
- The **exact colors**, if she knows them (for example a Pantone, CMYK or hex code from the sign order).

## Where it probably is

1. The **sign company** that made her storefront sign. They cut the letters from a vector file and
   usually keep it; a quick call with the salon's name and address is enough.
2. Whoever designed the logo, or a **print shop** that made her business cards, flyers or the poster.
3. Her email or phone: a "proof" file sent before the sign or cards were made.

## Ready to send (text message)

> Hi Ria, it's John. For your website I'd like to use your real logo so it matches your sign exactly.
> Do you have the logo file (SVG, AI, EPS or PDF)? If not, the company that made your storefront sign
> usually still has it, and I'm happy to call them for you. Thank you!

## Ready to send (email)

> Subject: Your logo file for the website
>
> Hi Ria,
>
> The website is coming along, and I'd like the logo to match your storefront sign exactly. Could you
> send me your logo file? The best kinds are SVG, AI, EPS or PDF. If you don't have one, the company that
> made your sign, or whoever printed your business cards, usually keeps it. Just tell me who they are
> and I'll ask them for you.
>
> Thank you,
> John

## When it arrives

Put the file in `images/` (for example `images/logo.svg`) and replace the type-built logo in the header,
the loading screen and the footer with it. `tests/logo.cjs` checks the logo's parts and proportions and
will need its colors and fonts lines updated to the real file.
