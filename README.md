# View Playlists With Song

Hey guys, here's a Spicetify extension I put together. Basically, it adds a "View Playlists with Song" option to the right-click menu in Spotify. Click it, and it'll show you exactly which of your playlists have that specific song. 

Credits: Big thanks to the original [spotify-util/ViewPlaylistsWithSong](https://github.com/spotify-util/ViewPlaylistsWithSong) project that inspired this. I took that idea, completely rewrote how it grabs track metadata (so you actually get the album art and duration even when the song isn't currently playing), fixed up the alignment issues, and made it run a lot smoother on the latest Spicetify builds.

---

## Screenshots

<img src="preview-contextmenu.png" alt="Context Menu Option" width="350"/>
<br/>
<img src="preview-popup.png" alt="Playlists Popup Modal" width="500"/>

---

## Features

- **It actually finds your stuff:** Instantly searches across your owned playlists to find where you stashed a track.
- **Accurate Metadata:** Uses a multi-fallback approach (GraphQL, Cosmos, Internal WG endpoints) so album cover, artist, and duration show up correctly. No more annoying "Unknown artist" cards.
- **Clean UI:** Got rid of the ugly native scrollbars while keeping it scrollable. Everything aligns nicely.
- **Clickable:** You can click the cover art to go to the track's album, and clicking the playlist jumps you right to it.
- **Fast:** Caches your playlists so searching is instant the second time around.

---

## Installation

### Method 1: Spicetify Marketplace (Easiest)
*(Once it's approved on Marketplace!)*
1. Click the Shopping Cart icon in Spotify.
2. Go over to extensions.
3. Search for "View Playlists With Song".
4. Hit install.

### Method 2: Manual Install
1. Grab `ViewPlaylistsWithSong.js` from this repo.
2. Drop it into your Spicetify extensions folder:
   - **Windows:** `%appdata%\spicetify\Extensions`
   - **Mac:** `~/spicetify_data/Extensions`
   - **Linux:** `~/.config/spicetify/Extensions`
3. Open up your terminal and run:
   ```bash
   spicetify config extensions ViewPlaylistsWithSong.js
   spicetify apply
   ```

---
**Author:** Phillip ([Github](https://github.com/andador-kim-phillip))
*(Note: If your github name is different, feel free to update the link above!)*
