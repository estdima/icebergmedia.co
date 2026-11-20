# icebergmedia.co

The Iceberg Media one-page website. Plain HTML, CSS and JavaScript: no build step, no frameworks, no cookies or trackers.

```
index.html          the page: dive hero, sample ads, how it works, guarantee, FAQ, contact, footer
privacy.html        privacy policy
404.html            page-not-found (uses /absolute paths on purpose)
assets/css/site.css all styles (brand colours are at the top)
assets/js/site.js   the dive scroll scene, button scrolls, header underline, bubbles, reveals, FAQ, ad videos, contact form
assets/img/         logos, the two iceberg photos (WebP + JPG in several sizes) and bubble.svg
assets/fonts/       Outfit, self-hosted
assets/ads/         the sample ads (video + cover frame, still images)
og-image.jpg        the preview image shown when the link is shared
favicon.*, icon-*   the site icon for browser tabs, Google and phones (favicon.ico is for tools that only look there)
CNAME, .nojekyll    GitHub Pages settings for icebergmedia.co
```

## The sample ads

Three ads in one row (`.ads-row` in `index.html`), with no box around them and no captions. On wider screens they
are all the same height: the video is upright 9:16, the still (feed) ads are 4:5 (marked with the `ad-feed` class),
and each column is as wide as its ad's shape needs. They drop into place one after the other (the delays are in
`site.css`, under `.anim .ads-row`). On phones they stack, centred.

- `outerwear`: a silent video, `assets/ads/outerwear.mp4` (720x1280, H.264, no sound track) with its first frame as the
  cover, `outerwear.jpg`. Its `data-label` is what screen readers say for it.
- `black-friday` and `boot-fit`: still ads, `assets/ads/black-friday.jpg` and `assets/ads/boot-fit.jpg` (1080x1350).

To swap a still ad: save the new one as a 1080x1350 JPG in `assets/ads/` (strip its metadata) and point that slot's
`<img>` at it with a new `alt` text (what the ad shows). For a 9:16 still, leave out the slot's `ad-feed` class and
change the row's column sizes in `site.css` (`.ads-row`: 0.5625fr for a 9:16 ad, 0.8fr for a 4:5 one).

To swap the video for another one:
1. Convert it with ffmpeg (`-an` removes the sound, `-map_metadata -1` strips camera details such as location):
   `ffmpeg -i in.mov -an -map_metadata -1 -vf scale=720:1280 -c:v libx264 -crf 23 -preset slow -movflags +faststart out.mp4`
2. Save its first frame as the cover: `ffmpeg -i out.mp4 -frames:v 1 -q:v 3 out.jpg`
3. In `index.html`, set the ad's `data-video` and `data-poster`. A slot can also take `data-video-small`, a smaller copy
   that phones load instead.

Videos load when they come near the screen and play muted on a loop while visible. There is no sound button; to give an
ad one, add `<button class="ad-sound" type="button" aria-label="Turn sound on" hidden></button>` after its `.ad-media` div.

Under the ads, "We run ads on" shows the Instagram, Facebook, TikTok and YouTube logos, faint, in one line (two rows of
two on small phones). The logo shapes are from Simple Icons (CC0) and are used as they are; only the colour is ours.
Only add a brand's logo here (or anywhere on the site) if that brand is a client and has said yes.

## How it works

One framed panel of three columns (`.steps`). Each column has its number and title, its white line drawing, then what
happens and a link to a section of the page. On wider screens the three rows line up across the columns; on phones the
columns stack inside the frame.

## The contact form

Connected (2026-11-19). The Google Sheet and Apps Script were set up from `form-backend/SETUP.md` (kept outside the
website folder), and the web app URL is in `assets/js/site.js`:

```js
const FORM_ENDPOINT = 'https://script.google.com/macros/s/.../exec';
```

If it is ever emptied, the form opens a pre-filled email to dimitrius@icebergmedia.co instead. After changing the
script, publish it as a new version of the same deployment (see SETUP.md) so this URL stays the same.

## Put it live (GitHub Pages)

1. Push this folder to the root of the public repository `estdima/icebergmedia.co` (created 2026-11-19).
2. Repository **Settings > Pages**: Source **Deploy from a branch**, branch `main`, folder `/ (root)`.
   The custom domain `icebergmedia.co` comes from the `CNAME` file.
3. At GoDaddy, **DNS** for icebergmedia.co: add four `A` records for `@` pointing to
   `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`,
   and a `CNAME` record `www` pointing to `estdima.github.io`.
   Remove GoDaddy's parked-page `A` record for `@` if there is one. Leave the email records (MX, TXT) as they are.
4. When GitHub shows the domain as verified, tick **Enforce HTTPS**.

## The bubbles

The faint bubbles in the dark sections are one drawing, `assets/img/bubble.svg`, made in Figma
(https://www.figma.com/design/HoaaADFb4wL7uTjz4miB4Z). Where each one sits, and how big it is, is the `BUBBLES` list
near the middle of `assets/js/site.js`: each bubble is placed beside an element of the page and shows only at the screen
widths given. Bigger bubbles are brighter and rise faster. To remove them all, empty that list.

## Later

- Adding analytics or ad pixels (Meta Pixel, Google tag) means updating `privacy.html` and adding a cookie banner for EU and UK visitors.
- Once the company is registered, add its legal name and address to "Who we are" in `privacy.html`.
- To preview locally: `python3 -m http.server` in this folder, then open http://localhost:8000.
