# Single-file version

Open `Sedgwick-Experts-Map-v2.html` directly in a browser. This approximately
594 KB file embeds the website, all 34 profiles, and compressed portraits.
It retains the public Mapbox token and uses classic workers for local-file
compatibility in Chrome.

Internet access is still required for the Mapbox library, styles, and map tiles.
The `offline-version` branch provides a portable local HTML file, not an offline
map cache.

To regenerate this export from its original main-branch snapshot on macOS
(Node.js and the built-in `sips` image tool required):

```sh
node scripts/export-single-html.mjs 15686df6def8995e3fdb11a8c65b7afd8e0c3d79 exports/Sedgwick-Experts-Map-v2.html --optimize-images
```

Replace the commit with `origin/main` to export a newer fetched main branch.
