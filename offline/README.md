# Single-file version

Open `Sedgwick-Experts-Map-v2.html` directly in a browser. This approximately
594 KB file embeds the website, all 34 profiles, and compressed portraits.
It retains the public Mapbox token and uses classic workers for local-file
compatibility in Chrome.

Internet access is still required for the Mapbox library, styles, and map tiles.
The `offline-version` branch provides a portable local HTML file, not an offline
map cache.

On opening, the file checks the hosted expert index configured by
`config.offlineExpertsIndexUrl` in `config.js` (currently the GitHub Pages site).
It loads that index and all referenced profiles using the same loader as the
online site. Updating the hosted JSON updates existing copies on their next
open/reload, without redistributing the HTML. Hosting caches may delay updates.

If any request fails, the JSON is invalid, or loading exceeds five seconds,
the complete embedded dataset and portraits are used instead. Successful remote
loads use hosted portraits, including those for newly added experts; broken
portraits show initials. The fallback snapshot stays as it was when exported.

The host must allow cross-origin requests from local files, normally with
`Access-Control-Allow-Origin: *`, on the index and individual JSON files.
GitHub Pages currently supplies this header. Keep the existing layout:
`data/experts/index.json`, individual profiles alongside it, and
`images/profiles/` under the site root. No server application is needed.

To regenerate this export from the current checkout on macOS
(Node.js and the built-in `sips` image tool required):

```sh
node scripts/export-single-html.mjs --working-tree offline/Sedgwick-Experts-Map-v2.html --optimize-images
```

Replace `--working-tree` with a commit or branch containing the shared loader to
export a reproducible committed snapshot.
