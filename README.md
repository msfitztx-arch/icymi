# ICYMI

*In case you missed it* — a bookmark keeper for iPhone and iPad that installs straight from GitHub Pages. No App Store and no account, and it works offline.

## Features
- **Categories** with their own icon and colour. Tap a chip to filter.
- **Tags**: add as many as you like. Tap a tag to filter, and combine several tags.
- **Icons**: all 1,992 Font Awesome Free icons are bundled and searchable. You can also use the site's own favicon or a letter tile, in any of 14 colours.
- **Rearranging**: press and hold any bookmark, then drag. Categories can be reordered in Settings.
- **List or Grid** layouts, sorted by your own order, newest first, or A–Z.
- **Search** across titles, links, notes, tags and categories.
- **Edit mode** (pencil button): tap any bookmark to edit it.
- **Backup**: export or restore a `.json` file. You can also import a browser's bookmarks `.html` export (folders become categories).
- Light, dark or automatic theme, plus an accent colour.
- **No zooming**: every input is 16 px or larger, pinch zoom and double-tap zoom are turned off, and the layout accounts for the notch and home bar.

## Put it on GitHub Pages
1. Create a new GitHub repository (for example `icymi`) and upload **everything in this folder**.
2. In the repo, go to **Settings → Pages → Build and deployment → Deploy from a branch**, choose `main` and `/ (root)`, then click **Save**.
3. After about a minute the app is live at `https://<your-username>.github.io/icymi/`.

## Install on iPhone
1. Open that URL in **Safari**.
2. Tap **Share**, then **Add to Home Screen**. Leave *Open as Web App* on and tap **Add**.
3. Launch ICYMI from the Home Screen. It opens full screen and works offline.

## Notes
- Your data stays **on your device** (localStorage) and nothing is uploaded. Export a backup now and then.
- The installed Home Screen app keeps its own storage, separate from Safari. Use Export and Import to move bookmarks between them.
- Site icons come from Google's favicon service. If one can't load, a letter tile is shown instead.
- `?url=…&title=…` opens the Add screen pre-filled, which is handy for iOS Shortcuts.

## Credits
Icons: [Font Awesome Free](https://fontawesome.com) 7.3.1 (icons CC BY 4.0, font SIL OFL 1.1). Drag & drop: [SortableJS](https://sortablejs.github.io/Sortable/) 1.15.7 (MIT). Licences are in `vendor/`.
