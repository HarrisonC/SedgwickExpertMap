# Sedgwick Marine Expert Map

A local React/TypeScript interface for exploring marine expertise using Mapbox GL JS. All 30 included profiles are fictional and marked as sample data in the interface. No authentication, database, or deployment is configured.

## Run locally

Requires Node.js 22.13+ and npm.

```sh
npm ci
cp .env.example .env.local
# Set NEXT_PUBLIC_MAPBOX_TOKEN in .env.local to your public Mapbox token.
npm run dev
```

Open the local address printed by the server. The public token is intended for browser use; `.env.local` is ignored by Git. Never use a secret Mapbox token. The current checkout already has the supplied public token configured locally.

```sh
npm test
npm run typecheck
npm run build
```

## Add or edit experts

Add one `.json` file per person inside `data/experts/`. Files are discovered automatically; no import list needs updating. For example:

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

Use a unique lowercase, hyphenated ID and preferably the same filename. `email` and `phone` are optional; omit them when unavailable. Latitude is -90 to 90; longitude is -180 to 180. `expertise` must contain at least one label. Region describes location, not coverage. Consistent labels prevent duplicate filter options.

Edit a profile to update it, or delete its file to remove it. Run `npm run validate:experts` to check profiles; errors identify the file and field. Validation also runs before development and production builds. Rebuild after changes for production; development imports update automatically (restart the server if a new file is not picked up).

The dropdown options are derived from profile data. Filters use AND logic; reset returns to the world view. The list uses geographical bounds rather than rendered map markers, so all experts inside a cluster are included. Cluster clicks zoom in. Experts sharing the exact same coordinates remain accessible individually in the list; at maximum zoom, repeated clicks on their overlapping point cycle through the profiles.

When replacing all samples with verified records, update the sample-data notice in `components/expert-directory.tsx`.

## Brand asset

The current Sedgwick wordmark with green corner symbol is downloaded unchanged from the [official Sedgwick website](https://www.sedgwick.com/wp-content/uploads/2026/01/sedgwick-logo-light.png). The white logo panel preserves the original dark wordmark. The map palette and navy header follow the supplied design direction.
