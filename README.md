<h1 align="center">🎵 View Playlists With Song</h1>

<p align="center">
  <img alt="Spicetify" src="https://img.shields.io/badge/Spicetify-Extension-success?style=for-the-badge&logo=spotify">
  <img alt="License" src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge">
</p>

<p align="center">
  <b>A Spicetify extension that instantly finds exactly which of your playlists contain a specific song.</b><br>
  <i>Hey guys, I threw this extension together to solve a simple problem: figuring out where I saved a track. Just right-click any song in Spotify and it'll fetch all the playlists you own that have it!</i>
</p>

---

## <img src="https://img.icons8.com/color/48/camera.png" width="24" align="center"/> Screenshots

I built this so it looks just like a native part of the Spotify UI. Here's what navigating it looks like:

<table align="center">
  <tr>
    <td align="center"><b>1. The Context Menu</b></td>
  </tr>
  <tr>
    <td align="center">Just right-click any track (whether you're playing it or not) and hit the new <b>View Playlists with Song</b> option.</td>
  </tr>
  <tr>
    <td align="center"><img src="preview-contextmenu.png" alt="Context Menu Option" width="400"/></td>
  </tr>
</table>

<br>

<table align="center">
  <tr>
    <td align="center"><b>2. The Search Results Modal</b></td>
  </tr>
  <tr>
    <td align="center">A clean modal pops up showing the song's album art, artist, and exact duration. Below it, every single playlist you've saved the song to! Click the cover art to jump to the album, or click the playlist to instantly dive into it.</td>
  </tr>
  <tr>
    <td align="center"><img src="preview-popup.png" alt="Playlists Popup Modal" width="600"/></td>
  </tr>
</table>

---

## <img src="https://img.icons8.com/color/48/sparkling.png" width="24" align="center"/> Features

- <img src="https://img.icons8.com/color/48/search.png" width="18" align="center"/> **It actually finds your stuff:** Instantly searches across your owned playlists to find where you stashed a track.
- <img src="https://img.icons8.com/color/48/cd.png" width="18" align="center"/> **Accurate Metadata (5-Tier Fallback):** Rebuilt the backend entirely. It uses GraphQL, Cosmos, and Internal WG endpoints to ensure the album cover, artist, and duration load perfectly. No more annoying "Unknown artist" cards.
- <img src="https://img.icons8.com/color/48/paint-palette.png" width="18" align="center"/> **Clean UI & Perfect Alignment:** Removed the ugly native scrollbars while keeping everything smoothly scrollable. Custom CSS logic ensures it fits Spotify's dark aesthetic perfectly.
- <img src="https://img.icons8.com/color/48/mouse-left-click.png" width="18" align="center"/> **Fully Clickable:** You can click the cover art to go to the track's album, and clicking the playlist jumps you exactly to it.
- <img src="https://img.icons8.com/color/48/flash-on.png" width="18" align="center"/> **Lightning Fast:** Caches your playlists so searching is instant the second time around!

---

## <img src="https://img.icons8.com/color/48/box.png" width="24" align="center"/> Installation

### Method 1: Spicetify Marketplace (Recommended)
*(Coming soon once the automated Github scraper picks it up!)*
1. Click the Shopping Cart icon in Spotify.
2. Go over to the **Extensions** tab.
3. Search for **"View Playlists With Song"**.
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

## <img src="https://img.icons8.com/color/48/handshake.png" width="24" align="center"/> Credits

Big thanks to the original [spotify-util/ViewPlaylistsWithSong](https://github.com/spotify-util/ViewPlaylistsWithSong) project that inspired this. I took that concept, completely reverse-engineered the metadata fetching so data actually appears, fixed the UI rendering/alignment, and optimized it for the latest Spicetify builds. 

---
<p align="center">
  <b>Author:</b> <a href="https://github.com/pandadoor">Phillip</a><br>
  <i>Built for the Spicetify Community</i>
</p>
