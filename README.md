# PIN VIDEO DOWNLOADER

A complete, production-oriented static website: Pinterest link validation and an
authorized media download workflow, eight fully working browser-based image tools,
and complete About / Contact / Privacy / Terms / Disclaimer / Copyright / Cookie pages.
Pure HTML5 + CSS3 + Vanilla JavaScript — no build step, no paid services required.

> **Independent service:** PIN VIDEO DOWNLOADER is not affiliated with, endorsed by,
> or sponsored by Pinterest, Inc. Pinterest is a trademark of Pinterest, Inc.

## ⚠️ Replace these placeholders before going live

1. **Domain** — search the whole project for `pinvideodownloader.example.com` and
   replace it with your real domain (affects canonical URLs, Open Graph, robots.txt, sitemap.xml).
2. **Contact email** — search for `support@example.com` (in `script.js` →
   `PVD_CONFIG.contactEmail`, and in the legal pages) and replace it with your real email.
3. **Contact form delivery** — see "Contact form" below. Until you connect it, the form
   honestly tells visitors the message was *not* sent (it never fakes success).

## File structure

```
index.html            Home: hero + downloader, How It Works, Image Tools, Features, FAQ
about.html            About Us
contact.html          Contact Us (validated form)
privacy-policy.html   Privacy Policy
terms.html            Terms & Conditions
disclaimer.html       Disclaimer
copyright.html        Copyright Policy
cookie-policy.html    Cookie Policy
style.css             Full design system (light + dark themes, responsive)
script.js             Theme, menu, FAQ, downloader workflow, all 8 image tools, contact form
favicon.svg           Brand icon (red rounded square, play + download mark)
robots.txt            Crawler rules + sitemap pointer
sitemap.xml           All public pages
_headers              Cloudflare Pages security/cache headers (CSP included)
backend/              Optional Node.js backend (no dependencies) — see backend/server.js
gen_pages.py          Build helper that generated the HTML pages (safe to delete)
```

## How the downloader works (honest by design)

- **Direct `.mp4` links** (media you host/own): real preview (duration, resolution),
  real download with progress when the host allows it, graceful fallback otherwise.
- **Pinterest links** (`pinterest.com`, regional Pinterest domains, `pin.it`): validated
  in the browser; pin ID and link type are shown. Actual Pinterest downloading requires
  an **authorized** integration:
  - Set `PVD_CONFIG.apiEndpoint` in `script.js` to your backend's `/api/resolve`, **or**
  - Run `backend/` and implement `resolveWithProvider()` with a provider you are
    licensed to use.
- The site **never** scrapes Pinterest, bypasses login/DRM/private-content restrictions,
  asks for Pinterest passwords, or generates fake download links. If a link can't be
  processed through an authorized route, the UI explains why.

## Image tools (100% browser-side, files never leave the device)

Image Compressor · Image Resizer · JPG→PNG · PNG→JPG · WEBP Converter ·
Image Cropper (draggable box, aspect presets) · Image to PDF (real PDF generated
in-browser) · Image Metadata Viewer (incl. basic JPEG EXIF: camera make/model, dates).
Limits enforced in code: images only, max 25 MB.

## Contact form

Pick ONE option, then set `PVD_CONFIG.contactEndpoint` in `script.js`:

- **Formspree (free tier):** create a form at formspree.io, use its
  `https://formspree.io/f/xxxxxxx` endpoint.
- **Own backend:** run `backend/` and implement `deliverContact()` with your mail
  provider (credentials via environment variables only), then point the endpoint at it.

## Free hosting guide (Cloudflare Pages)

1. Create a free Cloudflare account → **Workers & Pages → Create → Pages → Upload assets**.
2. Zip the project files (the HTML/CSS/JS at the root — not the containing folder) and upload.
3. Your site is live at `https://<project>.pages.dev`. The `_headers` file is applied automatically.
4. (Alternative: Netlify Drop or GitHub Pages work the same way for static files,
   but `_headers` is Cloudflare-specific — replicate the headers there if needed.)

## Domain connection guide

1. Buy a domain from any registrar (e.g. Cloudflare Registrar, Porkbun, Namecheap).
2. In Cloudflare Pages → your project → **Custom domains → Set up a domain**, enter your domain.
3. If the domain is registered elsewhere, add the DNS record Cloudflare shows you
   (usually a CNAME to `<project>.pages.dev`) and wait for the free SSL certificate to activate.
4. Replace the placeholder domain everywhere (see the checklist at the top).

## Mobile Acode setup guide (edit on Android)

1. Install **Acode** from the Play Store. Install the **Node.js / Termux** plugin only if
   you want to run the optional backend.
2. Unzip this project into a folder, then in Acode: **Open Folder** → select it.
3. Edit files directly; preview `index.html` with Acode's built-in preview or any static
   server app. No build step is needed for the frontend.
4. Optional backend: in Termux, `cd backend && node server.js` (Node ≥ 18).

## SEO setup

Already implemented: unique titles/descriptions per page, canonical URLs, Open Graph +
Twitter cards, semantic HTML, breadcrumbs on inner pages, FAQ + WebSite JSON-LD
structured data, `robots.txt`, `sitemap.xml`, alt texts, mobile-first responsive layout.
After connecting your domain: submit `sitemap.xml` in **Google Search Console** and
**Bing Webmaster Tools**, and verify the canonical domain loads over HTTPS.

## AdSense preparation checklist

- [x] Original, useful content (tools + guides + FAQ)
- [x] Complete navigation and working footer links
- [x] About Us, Contact Us, Privacy Policy, Terms, Disclaimer pages
- [x] Mobile responsive, fast (no frameworks)
- [x] Reserved ad containers: below hero, between tool sections, below features, above footer
- [ ] Replace placeholder domain + contact email
- [ ] Add real, regular content (blog/guides) before applying
- [ ] Paste your AdSense code into the `.ad-slot` containers only after approval
- [ ] Never click your own ads or encourage accidental clicks (against AdSense policy)
- Note: AdSense approval is never guaranteed; this site is *prepared*, not pre-approved.

## Security checklist

- [x] All user input validated; URLs parsed with the URL API and host allow-listed
- [x] Backend: SSRF allow-list (Pinterest hosts, HTTPS only), rate limiting (30/min/IP),
      32 KB body cap, path-traversal protection, security headers
- [x] `_headers` ships a Content-Security-Policy and related headers for Cloudflare Pages
- [x] File-type + 25 MB size validation in every image tool
- [x] No API keys or secrets anywhere in the frontend
- [ ] Serve only over HTTPS (automatic on Cloudflare Pages)
- [ ] Keep backend credentials in environment variables, never in code

## Testing instructions

1. Open `index.html` via a local server (e.g. `npx serve .` or the backend) — some
   browser features (clipboard, fetch) need http(s), not `file://`.
2. Downloader: try an invalid URL (error), a `pin.it` link (valid, explained),
   a `pinterest.com/pin/<id>/` link (pin ID shown), and a direct `.mp4` link
   (preview + download).
3. Each image tool: load a JPG/PNG/WEBP, process, download, open the result, Reset.
   Metadata tool: use a camera JPG to see EXIF fields.
4. Contact form: empty fields (validation error), bad email (error), valid form with
   no endpoint configured (honest "not sent" message).
5. Toggle dark mode, reload (preference persists), resize to a phone width
   (mobile menu + stacked layouts), and click every header/footer link.

## License / use

Built for the site owner of PIN VIDEO DOWNLOADER. All site copy is original.
