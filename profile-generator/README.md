# Expert profile generator

Internal browser form for creating expert JSON files compatible with the marine expert map. No installation or build step is required.

From the repository root, run `npm run dev`, then open http://localhost:5173/profile-generator/. Serve the page over HTTP; opening `index.html` as a local file will not load its JavaScript modules. The location picker requires internet access to Mapbox.

Set `mapboxToken` in this folder's `config.js` to a Mapbox public token, or create `profile-generator/config.local.json` containing `{"mapboxToken":"YOUR_PUBLIC_MAPBOX_TOKEN"}`. The local file is ignored by Git and is used only when `config.js` has no token. For static hosting, provide a public token in the deployed configuration. A token must be configured to select a location and download a valid profile.

## Files

```text
profile-generator/
  index.html              Profile form and preview
  config.js               Generator's public Mapbox token
  css/styles.css          Layout and styling
  js/app.js               Form interactions, preview, copy and download
  js/profile.js           Input conversion and profile validation
  js/location-map.js      Draggable Mapbox location picker
  tests/                  Profile and map interaction tests
```

The form shares `../js/experts.js` for profile validation and `../images/` for the logo and favicon. Keep those paths available when serving the tool in a subfolder. The main map has its own configuration in the repository root. The portable single-file map export does not include the generator.

## Create a profile

To update a profile, choose **Load JSON** and select its existing JSON file. The form, preview and map marker are filled from the file. Edit the details and choose **Download JSON** to save the updated profile. Loading is local to the browser; the original file is not overwritten. Invalid JSON or invalid profile data leaves the current form unchanged. Additional JSON fields and the original coordinate precision are retained when downloading; moving the marker replaces the coordinates with the new selection. Imported profile IDs are kept when the name changes.

Enter the name, profile ID, job title, expertise, region, city and country. The ID is suggested from the name and can be edited. Separate expertise labels with commas or new lines. Contact details, portrait references and the public profile URL are optional; blank optional fields are omitted.

Drag the marker or click the map to select a location. For keyboard use, pan and zoom the map with its keyboard controls, then choose **Use map centre**. The initial marker position is not saved automatically. Selected latitude and longitude are exported as numbers rounded to six decimal places. **Clear form** empties the form and resets the location.

The profile preview and JSON update as you type. **Download JSON** validates the form and saves `<id>.json`; **Copy JSON** becomes available once the profile is valid. Form contents remain in the current page, with no saved drafts or server submission. The portrait preview uses initials and does not fetch portrait URLs.

Save the download in `data/experts/` at the repository root and add its filename to that folder's `index.json`, or run `npm run update:experts` to regenerate the index. Choose a unique ID for a new expert; the generator does not check existing IDs or update the map automatically. Upload local portraits separately to match their `imagePath`.

## Checks

Run `npm test` from the repository root to include both the map and generator tests. Run `npm run validate:experts` to validate the active expert dataset.
