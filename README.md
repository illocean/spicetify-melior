# Spicetify View Playlists With Song

A robust Spicetify extension that lets you instantly find all the playlists you own that contain a specific song. Right-click any track and select **View Playlists with Song** to see exactly where you've saved it!

> **Credits:** This project is heavily inspired by and based on [spotify-util/ViewPlaylistsWithSong](https://github.com/spotify-util/ViewPlaylistsWithSong). Significant enhancements have been made to support the latest Spotify/Spicetify internal APIs, improve metadata resolution, and perfect the UI/UX.

---

## 📸 Screenshots

Popup Menu:
<br>
<img src="preview-contextmenu.png" alt="Context Menu Option" width="350"/>

<br>
Search Results:
<br>
<img src="preview-popup.png" alt="Playlists Popup Modal" width="500"/>

---

## ✨ Features

- **Fast & Responsive:** Caches playlist data so subsequent searches are instantaneous.
- **Robust Metadata Resolution:** Uses an advanced 5-tier fallback system (Player -> GraphQL -> Cosmos -> Internal WG -> Basic) to guarantee track metadata (artist, album, imagery, duration) resolves accurately even when you're not playing the track or when you hit rate limits.
- **Perfect Spicetify Alignment:** CSS logic uses customized CSS variable gutters (`--vpws-gutter`) for pixel-perfect vertical alignment and hides ugly native scrollbars while preserving scrolling functionality.
- **Clickable UI:** Includes clickable cover arts to open the track's album, clickable playlist cards to jump to the exact location of the song in bounds.
- **Reduced Motion Support:** Respects your Windows/macOS accessibility settings and disables animations gracefully.

---

## 📦 Installation

### Option 1: Spicetify Marketplace (Recommended)

1. Open Spotify and navigate to the **Marketplace** (shopping cart icon).
2. Go to the **Extensions** tab.
3. Search for "View Playlists With Song".
4. Click the install button (⬇️).

### Option 2: Manual Installation

1. Download the [`ViewPlaylistsWithSong.js`](ViewPlaylistsWithSong.js) file from this repository.
2. Place the downloaded file into your Spicetify extensions folder:
    - **Windows:** `%appdata%\spicetify\Extensions`
    - **Linux:** `~/.config/spicetify/Extensions`
    - **MacOS:** `~/spicetify_data/Extensions`
3. Run the following commands:
   ```bash
   spicetify config extensions ViewPlaylistsWithSong.js
   spicetify apply
   ```

---

## 🛠️ How it works

Behind the scenes, this extension leverages:
- `Spicetify.Platform.PlaylistAPI` for iterating over your owned playlists.
- Rootlist and local browser APIs to traverse playlist contents cleanly.
- `Spicetify.GraphQL` and internal `wg://` API hooks for failproof data extraction.
- A dynamically injected `<style>` block and React element mappings for the PopupModal.

---

## 📝 License
This extension inherits the original project's MIT License. Please refer to [spotify-util/ViewPlaylistsWithSong](https://github.com/spotify-util/ViewPlaylistsWithSong) for the original codebase.
