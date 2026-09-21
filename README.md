# Sedgwick Marine Expert Map

A standard static website built with HTML, CSS and JavaScript. No React, TypeScript, framework, database, build step, or package installation is needed. Mapbox GL JS is loaded from Mapbox's CDN. The active dataset contains 34 public Sedgwick expert profiles.

## Files to upload to your web host

```text
index.html                 Main page: header, filters, expert panel and map
config.js                  Your public Mapbox token
css/
  styles.css               Colours, typography and responsive layouts
js/
  app.js                   Loads profiles, renders the list and controls Mapbox
  profile-card.js          Builds the selected expert's map card
  experts.js               Profile validation, filters and geographic helpers
images/
  sedgwick-logo.png         Current official Sedgwick wordmark
  favicon.svg              Browser tab icon
  profiles/                Locally stored expert portraits
data/
  experts/
    index.json             List of the individual profile filenames
    adam-jackson.json       One JSON file per expert
    ...
```

Upload these files and folders together, keeping their relative positions. They work at a domain root or in a subfolder. Your host must serve `.js` files as JavaScript and `.json` files as JSON. Do not upload development files such as `.git`, `node_modules`, or local configuration.

1. Edit `config.js` and set `mapboxToken` to your Mapbox **public** token (starts with `pk.`).
2. Upload the files listed above to the website's public directory.
3. Open the hosted `index.html` URL. Nothing needs to run on the server other than ordinary static file hosting.

The token is visible in the browser by design; never use a secret token. Restrict the public token to your website URLs in your Mapbox account when appropriate. Internet access to Mapbox is required. The list and filters remain usable if the map fails.

## Local preview

Serve the directory over HTTP rather than double-clicking `index.html`: browsers restrict loading JSON and JavaScript modules from `file://` URLs.

If Node.js 22+ is installed:

```sh
node scripts/serve.mjs
```

Open http://localhost:5173/. No `npm install` is required. Alternatively use your editor's static preview server. The supplied token is retained in ignored `config.local.json` for this checkout; for external hosting, set `config.js` as described above.

## Add, edit or remove an expert

Edit a file in `data/experts/` and upload it to update a profile. **No rebuild is required.** Reload the page to see changes (your hosting provider may also cache uploaded files).

To add an expert, copy an existing profile, use a unique lowercase hyphenated `id`, and add its filename to `data/experts/index.json`. To remove one, remove its filename from the index and delete the profile. Browsers cannot discover files in a server folder automatically, which is why the index is needed.

Example profile:

```json
{
  "id": "alex-morgan",
  "name": "Alex Morgan",
  "role": "Marine cargo surveyor",
  "expertise": ["Cargo", "Marine engineering"],
  "region": "Europe",
  "city": "London",
  "country": "United Kingdom",
  "latitude": 51.5074,
  "longitude": -0.1278,
  "email": "alex.morgan@example.com"
}
```

`email` and `phone` are optional. Expertise and region dropdowns are populated from profiles; use consistent labels. Region describes location, not service coverage.

For a portrait, retain the original HTTP(S) `imageUrl` in the profile and run `npm run download:photos` (or `node scripts/download-profile-images.mjs`). This downloads missing photos into `images/profiles/<id>.jpg`, `.png` or `.webp` and adds an `imagePath` to each successful profile. Upload both the updated JSON and image folder. The command reuses valid existing images, checks downloaded image types, and reports failures with a nonzero exit code. To replace a photo, remove its existing local image first and run the command again. Cards use local images only and show initials when an image is missing or broken.

Optional helper commands (Node.js only; no dependencies):

```sh
node scripts/update-experts.mjs     # Validate profiles and regenerate index.json
node scripts/validate-experts.mjs   # Validate profile fields
node --test tests/*.test.mjs        # Run automated checks
```

`scripts/`, `tests/`, `package.json`, `.gitignore`, and this README are development/maintenance files. **They do not need to be uploaded.** `package.json` only offers convenient `npm run dev`, `npm test`, and `npm run update:experts` aliases; the website does not use npm.

## Behaviour

Filters combine with AND logic and fit the map to the matching experts. Reset restores the world view. The list shows individual experts within the viewport, including those inside numbered clusters. Click a cluster to zoom in, or select a list entry to highlight its location. Clicking overlapping individual markers cycles through co-located experts.

Selecting an expert from the list or an individual marker opens a card beside their map location, with a portrait, name, title, expertise, location and available contact links. Only one card opens at a time. Close it with its close button or Escape; changing or resetting filters also closes it. On mobile, list selection scrolls to the map. Email, phone and Sedgwick profile links appear only in the profile card. The sidebar shows names, roles, locations and expertise, and remains available if the map cannot load.

## Logo

The current Sedgwick logo is used unchanged from the [official Sedgwick website](https://www.sedgwick.com/wp-content/uploads/2026/01/sedgwick-logo-light.png).

## Profile schema and export

Profiles keep `id`, `name`, `role`, `expertise`, `region`, `city`, `country`, `latitude`, `longitude`, and the available `phone`, `email`, `imageUrl`, `imagePath` and `sourceUrl` fields. Missing optional details are omitted. URLs are plain strings. `imagePath` is an optional relative path restricted to `images/profiles/<id>.jpg`, `.png` or `.webp`.

The published coordinates are country-level locations, even where a city has been supplied separately. Existing curated profile values are preserved. The fictional example is stored in `examples/fictional-experts/`, outside the active dataset.

`exports/sedgwick-marine-experts.zip` is the original data-only export. For profiles with local portraits, upload the current `data/experts/` and `images/profiles/` folders together.
