// NAME: Melior
// AUTHOR: elijaholmos, huhridge, locally rewritten for current Spotify builds
// DESCRIPTION: Lists your playlists containing a specific track in a popup without hijacking Spotify pages
// VERSION: 3.1.0-local

/// <reference path="../globals.d.ts" />

(async function ViewPlaylistsWithSong() {
    const {
        ContextMenu,
        CosmosAsync,
        Menu,
        Player,
        Platform,
        PopupModal,
        React: react,
        URI,
    } = Spicetify;

    if (!(ContextMenu && CosmosAsync && Menu && Player && Platform && PopupModal && react && URI)) {
        setTimeout(ViewPlaylistsWithSong, 1000);
        return;
    }

    if (globalThis.__viewPlaylistsWithSongRegistered) {
        return;
    }
    globalThis.__viewPlaylistsWithSongRegistered = true;

    // ── Cache layer ──────────────────────────────────────────────────
    const CACHE_TTL = 120_000; // 2 minutes
    const CACHE_MAX = 200;

    const playlistCache = new Map();
    const trackCache = new Map();

    function cacheGet(cache, key) {
        const entry = cache.get(key);
        if (!entry) return undefined;
        if (Date.now() - entry.ts > CACHE_TTL) {
            cache.delete(key);
            return undefined;
        }
        // LRU: move to end
        cache.delete(key);
        cache.set(key, entry);
        return entry.value;
    }

    function cacheSet(cache, key, value) {
        if (cache.size >= CACHE_MAX) {
            const oldest = cache.keys().next().value;
            cache.delete(oldest);
        }
        cache.set(key, { value, ts: Date.now() });
    }

    // ── Styles ───────────────────────────────────────────────────────
    const STYLE_ID = "view-playlists-with-song-styles";

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;

        const style = document.createElement("style");
        style.id = STYLE_ID;
        style.textContent = `
            /* ═══════════════════════════════════════════════
               NUCLEAR SCROLLBAR KILL — Spicetify Modal Chain
               Targets every wrapper that PopupModal creates:
               GenericModal__overlay > GenericModal >
               main-embedWidgetGenerator-container >
               main-trackCreditsModal-mainSection >
               main-trackCreditsModal-originalCredits
               ═══════════════════════════════════════════════ */

            /* ── Kill scrollbars on EVERY Spicetify modal wrapper ── */
            .GenericModal,
            .GenericModal__overlay,
            .main-trackCreditsModal-container,
            .main-trackCreditsModal-mainSection,
            .main-trackCreditsModal-originalCredits,
            .main-embedWidgetGenerator-container,
            .main-embedWidgetGenerator-container > div,
            [class*="trackCreditsModal"],
            [class*="embedWidgetGenerator"],
            [class*="GenericModal"] {
                overflow: hidden !important;
                scrollbar-width: none !important;
                -ms-overflow-style: none !important;
            }
            .GenericModal::-webkit-scrollbar,
            .GenericModal__overlay::-webkit-scrollbar,
            .main-trackCreditsModal-container::-webkit-scrollbar,
            .main-trackCreditsModal-mainSection::-webkit-scrollbar,
            .main-trackCreditsModal-originalCredits::-webkit-scrollbar,
            .main-embedWidgetGenerator-container::-webkit-scrollbar,
            .main-embedWidgetGenerator-container > div::-webkit-scrollbar,
            [class*="trackCreditsModal"]::-webkit-scrollbar,
            [class*="embedWidgetGenerator"]::-webkit-scrollbar,
            [class*="GenericModal"]::-webkit-scrollbar {
                display: none !important;
                width: 0 !important;
                height: 0 !important;
            }

            /* Also catch any Spotify modal-content wrappers */
            .main-trackCreditsModal-mainSection * {
                scrollbar-width: none !important;
                -ms-overflow-style: none !important;
            }
            .main-trackCreditsModal-mainSection *::-webkit-scrollbar {
                display: none !important;
                width: 0 !important;
                height: 0 !important;
            }

            /* ── Reset & Modal Shell ─────────────────────── */
            .vpws-modal {
                --vpws-gutter: 20px;
                color: var(--spice-text);
                display: flex;
                flex-direction: column;
                gap: 0;
                max-height: 72vh;
                width: min(880px, 90vw);
                overflow: hidden;
                position: relative;
            }

            /* ── Track Hero ──────────────────────────────── */
            .vpws-track {
                align-items: center;
                background:
                    linear-gradient(
                        160deg,
                        rgba(var(--spice-rgb-button), 0.08) 0%,
                        transparent 60%
                    ),
                    var(--spice-card);
                border-radius: 10px 10px 0 0;
                display: flex;
                gap: 14px;
                padding: 18px var(--vpws-gutter);
                flex-shrink: 0;
                position: relative;
                overflow: hidden;
            }
            .vpws-track::after {
                content: "";
                position: absolute;
                bottom: 0;
                left: var(--vpws-gutter);
                right: var(--vpws-gutter);
                height: 1px;
                background: linear-gradient(
                    90deg,
                    transparent,
                    rgba(var(--spice-rgb-text), 0.08) 20%,
                    rgba(var(--spice-rgb-text), 0.08) 80%,
                    transparent
                );
            }
            .vpws-track-art,
            .vpws-playlist-art {
                background:
                    linear-gradient(
                        135deg,
                        rgba(var(--spice-rgb-selected-row), 0.5),
                        rgba(var(--spice-rgb-shadow), 0.2)
                    ),
                    var(--spice-sidebar);
                border-radius: 8px;
                display: block;
                object-fit: cover;
                flex-shrink: 0;
            }
            .vpws-track-art {
                height: 72px;
                width: 72px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
            }
            .vpws-track-info {
                flex: 1;
                min-width: 0;
            }
            .vpws-track-title {
                font-size: 20px;
                font-weight: 800;
                letter-spacing: -0.02em;
                line-height: 1.15;
                margin: 0;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            .vpws-track-meta,
            .vpws-summary,
            .vpws-playlist-meta,
            .vpws-empty {
                color: var(--spice-subtext);
                font-size: 13px;
                line-height: 1.5;
                margin: 0;
            }
            .vpws-track-meta {
                margin-top: 2px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            /* ── Progress bar ────────────────────────────── */
            .vpws-progress-wrap {
                flex-shrink: 0;
                padding: 0 var(--vpws-gutter);
                background: var(--spice-card);
            }
            .vpws-progress {
                height: 3px;
                width: 100%;
                background: rgba(var(--spice-rgb-text), 0.06);
                border-radius: 2px;
                overflow: hidden;
            }
            .vpws-progress-bar {
                height: 100%;
                background: var(--spice-button);
                border-radius: 2px;
                transition: width 0.3s cubic-bezier(0.22, 1, 0.36, 1);
                will-change: width;
            }

            /* ── Status Row (summary + actions) ──────────── */
            .vpws-status-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                padding: 10px var(--vpws-gutter) 6px;
                flex-shrink: 0;
                background: var(--spice-card);
            }
            .vpws-summary {
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.04em;
                opacity: 0.6;
            }
            .vpws-status-actions {
                display: flex;
                gap: 6px;
            }

            /* ── Results Container (NO scrollbar) ────────── */
            .vpws-results-wrap {
                flex: 1;
                min-height: 0;
                overflow-y: auto;
                overflow-x: hidden;
                padding: 6px var(--vpws-gutter) 20px;
                scrollbar-width: none;
                -ms-overflow-style: none;
                mask-image: linear-gradient(
                    to bottom,
                    transparent 0px,
                    black 12px,
                    black calc(100% - 16px),
                    transparent 100%
                );
                -webkit-mask-image: linear-gradient(
                    to bottom,
                    transparent 0px,
                    black 12px,
                    black calc(100% - 16px),
                    transparent 100%
                );
            }
            .vpws-results-wrap::-webkit-scrollbar {
                display: none;
                width: 0;
                height: 0;
            }
            .vpws-results {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            /* ── Playlist Card ───────────────────────────── */
            .vpws-card {
                align-items: center;
                background: rgba(var(--spice-rgb-main-elevated), 0.55);
                border: 1px solid rgba(var(--spice-rgb-shadow), 0.1);
                border-radius: 10px;
                cursor: pointer;
                display: grid;
                gap: 14px;
                grid-template-columns: 48px 1fr auto;
                padding: 10px 16px;
                transition:
                    transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1),
                    background 0.2s ease,
                    border-color 0.2s ease,
                    box-shadow 0.25s ease;
                will-change: transform;
                opacity: 0;
                transform: translateY(8px);
                animation: vpws-card-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) forwards;
            }
            .vpws-card:hover {
                background: rgba(var(--spice-rgb-main-elevated), 0.85);
                border-color: rgba(var(--spice-rgb-button), 0.25);
                transform: translateY(-1px);
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
            }
            .vpws-card:active {
                transform: scale(0.985);
                transition-duration: 0.08s;
            }
            .vpws-card:focus-visible {
                outline: 2px solid var(--spice-button);
                outline-offset: 2px;
                border-radius: 10px;
            }
            @keyframes vpws-card-in {
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .vpws-playlist-art {
                height: 48px;
                width: 48px;
                border-radius: 6px;
                transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            .vpws-card:hover .vpws-playlist-art {
                transform: scale(1.06);
            }

            .vpws-playlist-title {
                color: var(--spice-text);
                font-size: 14px;
                font-weight: 700;
                line-height: 1.3;
                margin: 0;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            .vpws-playlist-desc {
                color: var(--spice-subtext);
                font-size: 12px;
                line-height: 1.35;
                margin: 2px 0 0;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                max-width: 420px;
            }

            /* ── Track position badge ────────────────────── */
            .vpws-badge {
                background: rgba(var(--spice-rgb-button), 0.12);
                border-radius: 6px;
                color: var(--spice-button);
                font-size: 12px;
                font-weight: 700;
                letter-spacing: 0.02em;
                padding: 4px 10px;
                white-space: nowrap;
                flex-shrink: 0;
                transition: background 0.2s ease;
            }
            .vpws-card:hover .vpws-badge {
                background: rgba(var(--spice-rgb-button), 0.22);
            }

            /* ── Buttons ─────────────────────────────────── */
            .vpws-btn {
                appearance: none;
                background: var(--spice-button);
                border: 0;
                border-radius: 999px;
                color: var(--spice-button-text);
                cursor: pointer;
                font-size: 12px;
                font-weight: 700;
                letter-spacing: 0.02em;
                padding: 7px 14px;
                transition:
                    transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
                    filter 0.15s ease;
                will-change: transform;
            }
            .vpws-btn:hover {
                filter: brightness(1.1);
                transform: scale(1.03);
            }
            .vpws-btn:active {
                transform: scale(0.96);
                transition-duration: 0.06s;
            }
            .vpws-btn--ghost {
                background: transparent;
                border: 1px solid rgba(var(--spice-rgb-text), 0.15);
                color: var(--spice-text);
            }
            .vpws-btn--ghost:hover {
                border-color: rgba(var(--spice-rgb-text), 0.3);
                background: rgba(var(--spice-rgb-text), 0.04);
            }

            /* ── Empty / Loading ──────────────────────────── */
            .vpws-empty {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                width: 100%;
                box-sizing: border-box;
                padding: 32px 24px;
                text-align: center;
                font-size: 14px;
                opacity: 0.7;
            }
            .vpws-empty-icon {
                font-size: 32px;
                margin-bottom: 8px;
                opacity: 0.4;
            }

            /* ── Cached badge ─────────────────────────────── */
            .vpws-cached-tag {
                background: rgba(var(--spice-rgb-button), 0.08);
                border-radius: 4px;
                color: var(--spice-subtext);
                font-size: 10px;
                font-weight: 600;
                letter-spacing: 0.04em;
                padding: 2px 6px;
                text-transform: uppercase;
            }

            /* ── Responsive ──────────────────────────────── */
            @media (max-width: 640px) {
                .vpws-modal {
                    width: 96vw;
                    max-height: 80vh;
                }
                .vpws-track {
                    padding: 14px 16px;
                    gap: 12px;
                }
                .vpws-track-art {
                    height: 56px;
                    width: 56px;
                }
                .vpws-track-title {
                    font-size: 16px;
                }
                .vpws-modal {
                    --vpws-gutter: 14px;
                }
                .vpws-card {
                    grid-template-columns: 40px 1fr auto;
                    gap: 10px;
                    padding: 8px 10px;
                }
                .vpws-playlist-art {
                    height: 40px;
                    width: 40px;
                }
                .vpws-playlist-title {
                    font-size: 13px;
                }
                .vpws-playlist-desc {
                    display: none;
                }
            }

            /* ── Reduced motion ──────────────────────────── */
            @media (prefers-reduced-motion: reduce) {
                .vpws-card {
                    animation: none;
                    opacity: 1;
                    transform: none;
                }
                .vpws-card:hover {
                    transform: none;
                }
                .vpws-card:active {
                    transform: none;
                }
                .vpws-btn:hover,
                .vpws-btn:active {
                    transform: none;
                }
                .vpws-card:hover .vpws-playlist-art {
                    transform: none;
                }
                .vpws-progress-bar {
                    transition: none;
                }
            }
        `;

        document.head.appendChild(style);
    }

    // ── Utilities ─────────────────────────────────────────────────────
    function delay(ms) {
        return new Promise((r) => setTimeout(r, ms));
    }

    async function withTimeout(promise, ms, label) {
        let tid;
        try {
            return await Promise.race([
                promise,
                new Promise((_, rej) => {
                    tid = setTimeout(() => rej(new Error(`${label} timed out after ${ms}ms`)), ms);
                }),
            ]);
        } finally {
            clearTimeout(tid);
        }
    }

    function formatDate(v) {
        if (!v) return "Unknown date";
        const d = new Date(v);
        return Number.isNaN(d.getTime())
            ? "Unknown date"
            : d.toLocaleDateString("default", { year: "numeric", month: "short", day: "numeric" });
    }

    function formatDuration(ms) {
        const s = Math.max(0, Math.floor(Number(ms || 0) / 1000));
        return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
    }

    function stripHtml(input) {
        return String(input || "")
            .replace(/<br\s*\/?>/gi, " ")
            .replace(/<[^>]+>/g, "")
            .replace(/\s+/g, " ")
            .trim();
    }

    function extractUriId(uri) {
        return String(uri || "").split(":")[2] || "";
    }

    function getCurrentTrackUri() {
        return Player?.data?.item?.uri || Platform?.PlayerAPI?.getState?.()?.item?.uri || null;
    }

    function getPlaylistTrackUri(t) {
        return t?.uri || t?.item?.uri || t?.track?.uri || null;
    }

    function getPlaylistArtwork(p) {
        return p?.images?.[0]?.url || "";
    }

    function resolveImageUrl(raw) {
        if (!raw) return "";
        if (raw.startsWith("https://") || raw.startsWith("http://")) return raw;
        if (raw.startsWith("spotify:image:")) return `https://i.scdn.co/image/${raw.split(":")[2]}`;
        return raw;
    }

    function isTrackUri(uri) {
        try {
            return URI.fromString(uri).type === URI.Type.TRACK;
        } catch {
            return false;
        }
    }

    // ── Track Metadata ───────────────────────────────────────────────
    function buildTrackFromPlayerMetadata(trackUri) {
        // Tier 1: currently‑playing track — richest metadata available
        const item = Player?.data?.item;
        const meta = item?.metadata;
        if (!item || item.uri !== trackUri || !meta) return null;

        const artists = Object.keys(meta)
            .filter((k) => k.startsWith("artist_name"))
            .sort()
            .map((k) => meta[k])
            .filter(Boolean)
            .map((name) => ({ name }));

        const imageUrl = resolveImageUrl(
            meta.image_xlarge_url || meta.image_large_url || meta.image_url || meta.image_small_url || ""
        );

        return {
            album: { images: imageUrl ? [{ url: imageUrl }] : [], name: meta.album_title || "Unknown album" },
            artists,
            duration_ms: Number(meta.duration || 0),
            name: meta.title || meta.name || "Unknown track",
            uri: trackUri,
        };
    }

    async function fetchViaGraphQL(trackUri) {
        // Tier 2: GraphQL — works for any track, best reliability
        const gql = Spicetify.GraphQL;
        if (!gql?.Definitions || !gql?.Request) return null;

        // Try exact definition name first, then search
        const def =
            gql.Definitions.getTrack ||
            gql.Definitions.getTrackMetadata ||
            (() => {
                const key = Object.keys(gql.Definitions).find(
                    (k) => /^gettrack$/i.test(k) || /^gettrackmetadata$/i.test(k) || k.toLowerCase().includes("gettrack")
                );
                return key ? gql.Definitions[key] : null;
            })();

        if (!def) return null;

        const r = await withTimeout(gql.Request(def, { uri: trackUri }), 5000, "gql-track");
        const td = r?.data?.trackUnion || r?.data?.track;
        if (!td?.name) return null;

        // Extract cover art — try multiple known paths
        const coverSources =
            td.albumOfTrack?.coverArt?.sources ||
            td.album?.coverArt?.sources ||
            td.albumOfTrack?.images ||
            [];
        // Sort by width descending for largest image
        const sortedSources = [...coverSources].sort((a, b) => (b.width || 0) - (a.width || 0));
        const artUrl = resolveImageUrl(sortedSources[0]?.url || "");

        // Extract artists — try multiple known paths
        const rawArtists =
            td.firstArtist?.items ||
            td.artists?.items ||
            td.artistsWithRoles?.items ||
            [];
        const artists = rawArtists.map((a) => ({
            name: a.profile?.name || a.name || "Unknown artist",
        }));

        const albumName =
            td.albumOfTrack?.name ||
            td.album?.name ||
            "Unknown album";

        const durationMs =
            Number(td.duration?.totalMilliseconds || td.duration?.milliseconds || 0);

        return {
            album: { images: artUrl ? [{ url: artUrl }] : [], name: albumName },
            artists,
            duration_ms: durationMs,
            name: td.name,
            uri: trackUri,
        };
    }

    async function fetchViaCosmos(trackId) {
        // Tier 3: Spotify Web API via Cosmos proxy
        const t = await withTimeout(
            CosmosAsync.get(`https://api.spotify.com/v1/tracks/${trackId}`),
            5000,
            "cosmos-track"
        );

        // Strict validation: must have name AND artists array with at least 1 entry
        if (!t || !t.name || !Array.isArray(t.artists) || t.artists.length === 0) return null;
        // Reject 429/error responses that Cosmos wraps as objects
        if (t.error || t.code === 429 || t.status === 429) return null;

        // Normalize images
        if (t.album?.images) {
            t.album.images = t.album.images.map((i) => ({
                ...i,
                url: resolveImageUrl(i.url),
            }));
        }
        return t;
    }

    async function fetchTrackMetadata(trackUri) {
        const cached = cacheGet(trackCache, trackUri);
        if (cached) return cached;

        const trackId = extractUriId(trackUri);
        if (!trackId) throw new Error("Could not resolve the selected track.");

        // ── Tier 1: Player state (instant, richest data) ──
        const playerTrack = buildTrackFromPlayerMetadata(trackUri);
        if (playerTrack) {
            cacheSet(trackCache, trackUri, playerTrack);
            return playerTrack;
        }

        // ── Tier 2: GraphQL (works for any track, no auth issues) ──
        try {
            const gqlResult = await fetchViaGraphQL(trackUri);
            if (gqlResult) {
                cacheSet(trackCache, trackUri, gqlResult);
                return gqlResult;
            }
        } catch (e) {
            console.warn("ViewPlaylistsWithSong: GraphQL track fetch failed:", e?.message || e);
        }

        // ── Tier 3: Cosmos Web API (may rate-limit) ──
        try {
            const cosmosResult = await fetchViaCosmos(trackId);
            if (cosmosResult) {
                cacheSet(trackCache, trackUri, cosmosResult);
                return cosmosResult;
            }
        } catch (e) {
            console.warn("ViewPlaylistsWithSong: Cosmos track fetch failed:", e?.message || e);
        }

        // ── Tier 4: Try Spicetify internal track lookup ──
        try {
            const base62 = URI.fromString(trackUri).getBase62Id?.() || trackId;
            const sp = await withTimeout(
                CosmosAsync.get(`wg://track/v1/track/${base62}`),
                3000,
                "wg-track"
            );
            if (sp?.name) {
                const imgUrl = resolveImageUrl(
                    sp.album?.cover_group?.image?.[0]?.file_id
                        ? `https://i.scdn.co/image/${sp.album.cover_group.image[0].file_id}`
                        : sp.album?.cover?.uri || ""
                );
                const result = {
                    album: { images: imgUrl ? [{ url: imgUrl }] : [], name: sp.album?.name || "Unknown album" },
                    artists: (sp.artist || []).map((a) => ({ name: a.name || "Unknown artist" })),
                    duration_ms: Number(sp.duration || 0),
                    name: sp.name,
                    uri: trackUri,
                };
                cacheSet(trackCache, trackUri, result);
                return result;
            }
        } catch (e) {
            console.warn("ViewPlaylistsWithSong: wg track fetch failed:", e?.message || e);
        }

        // ── Tier 5: Bare-minimum fallback ──
        return {
            album: { images: [], name: "Unknown album" },
            artists: [{ name: "Unknown artist" }],
            duration_ms: 0,
            name: `Track ${trackId.slice(0, 8)}…`,
            uri: trackUri,
        };
    }

    // ── Navigation ───────────────────────────────────────────────────
    function openTrack(trackUri) {
        const id = extractUriId(trackUri);
        if (!id) return;
        PopupModal.hide();
        Platform.History.push(`/track/${id}`);
    }

    function openPlaylist(playlistUri, trackUri) {
        const id = extractUriId(playlistUri);
        if (!id) return;
        PopupModal.hide();
        Platform.History.push(`/playlist/${id}?highlight=${encodeURIComponent(trackUri)}`);
    }

    // ── Library ──────────────────────────────────────────────────────
    function normalizePlaylist(p) {
        return {
            created: formatDate(p?.addedAt),
            desc: stripHtml(p?.description),
            image: getPlaylistArtwork(p),
            isCollab: Boolean(p?.isCollaborative || p?.canAdd),
            noOfSongs: Number(p?.totalLength || 0),
            title: p?.name || "Untitled playlist",
            uri: p?.uri || "",
        };
    }

    function shouldScanPlaylist(p) {
        return p?.type === "playlist" && Boolean(p?.uri) && Number(p?.totalLength || 0) > 0 && p?.isOwnedBySelf !== false;
    }

    async function recursivePlaylistFolder(folder) {
        const out = [];
        for (const p of folder ?? []) {
            if (shouldScanPlaylist(p)) out.push(normalizePlaylist(p));
            else if (p?.type === "folder") out.push(...(await recursivePlaylistFolder(p.items)));
        }
        return out;
    }

    async function getUserLibrary() {
        const contents = await Platform.RootlistAPI.getContents();
        const out = [];
        for (const p of contents?.items ?? []) {
            if (shouldScanPlaylist(p)) out.push(normalizePlaylist(p));
            else if (p?.type === "folder") out.push(...(await recursivePlaylistFolder(p.items)));
        }
        return out;
    }

    async function checkPlaylist(playlist, songUri) {
        const cacheKey = playlist.uri;
        let items = cacheGet(playlistCache, cacheKey);

        if (!items) {
            const resp = await Platform.PlaylistAPI.getContents(playlist.uri);
            items = resp?.items ?? [];
            cacheSet(playlistCache, cacheKey, items);
        }

        for (let i = 0; i < items.length; i++) {
            if (getPlaylistTrackUri(items[i]) === songUri) {
                return { ...playlist, index: i + 1, songAddedAt: formatDate(items[i]?.addedAt) };
            }
        }
        return null;
    }

    async function scanPlaylists(trackUri, onProgress) {
        const all = await getUserLibrary();
        const found = [];
        const batchSize = 6;

        onProgress?.({ matches: [], processed: 0, total: all.length });

        for (let i = 0; i < all.length; i += batchSize) {
            const batch = all.slice(i, i + batchSize);
            const results = await Promise.all(
                batch.map(async (p) => {
                    try {
                        return await withTimeout(checkPlaylist(p, trackUri), 3000, `scan:${p.uri}`);
                    } catch (e) {
                        console.error("ViewPlaylistsWithSong: scan fail", p.uri, e);
                        return null;
                    }
                })
            );

            for (const r of results) if (r) found.push(r);

            onProgress?.({
                matches: [...found],
                processed: Math.min(i + batch.length, all.length),
                total: all.length,
            });
            await delay(8);
        }

        return { matches: found, total: all.length };
    }

    // ── Components ───────────────────────────────────────────────────
    function TrackHero({ track }) {
        if (!track) return null;
        const artists = (track.artists || []).map((a) => a.name).filter(Boolean).join(", ");
        const album = track.album?.name;
        const art = track.album?.images?.[0]?.url;

        // Build meta line dynamically — skip empty / "Unknown" values
        const metaParts = [];
        if (artists && artists !== "Unknown artist") metaParts.push(artists);
        if (album && album !== "Unknown album") metaParts.push(album);
        if (track.duration_ms > 0) metaParts.push(formatDuration(track.duration_ms));
        const metaLine = metaParts.length > 0 ? metaParts.join("  ·  ") : "";

        return react.createElement(
            "section",
            { className: "vpws-track" },
            art
                ? react.createElement("img", {
                      alt: `${track.name} artwork`,
                      className: "vpws-track-art",
                      src: art,
                      onClick: () => openTrack(track.uri),
                      style: { cursor: "pointer" },
                  })
                : react.createElement("div", { className: "vpws-track-art", "aria-hidden": "true" }),
            react.createElement(
                "div",
                { className: "vpws-track-info" },
                react.createElement("p", { className: "vpws-track-title", title: track.name }, track.name || "Unknown track"),
                metaLine
                    ? react.createElement("p", { className: "vpws-track-meta" }, metaLine)
                    : null
            ),
            react.createElement(
                "button",
                {
                    className: "vpws-btn vpws-btn--ghost",
                    onClick: () => openTrack(track.uri),
                    type: "button",
                    title: "Open track page",
                },
                "Open Track"
            )
        );
    }

    function ProgressBar({ processed, total }) {
        const pct = total > 0 ? Math.round((processed / total) * 100) : 0;
        return react.createElement(
            "div",
            { className: "vpws-progress-wrap" },
            react.createElement(
                "div",
                { className: "vpws-progress", role: "progressbar", "aria-valuenow": pct, "aria-valuemin": "0", "aria-valuemax": "100" },
                react.createElement("div", { className: "vpws-progress-bar", style: { width: `${pct}%` } })
            )
        );
    }

    function StatusRow({ processed, total, matchCount, status }) {
        const text =
            status === "loading"
                ? `Scanning ${processed} / ${total || "…"} playlists  ·  ${matchCount} found`
                : `${matchCount} playlist${matchCount === 1 ? "" : "s"} across ${total} of yours`;

        return react.createElement(
            "div",
            { className: "vpws-status-row" },
            react.createElement("p", { className: "vpws-summary" }, text)
        );
    }

    function PlaylistCard({ playlist, trackUri, index }) {
        const animDelay = `${Math.min(index * 0.04, 0.6)}s`;

        return react.createElement(
            "article",
            {
                className: "vpws-card",
                style: { animationDelay: animDelay },
                onClick: () => openPlaylist(playlist.uri, trackUri),
                onKeyDown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openPlaylist(playlist.uri, trackUri); } },
                tabIndex: 0,
                role: "button",
                "aria-label": `Open ${playlist.title}, track #${playlist.index}`,
            },
            playlist.image
                ? react.createElement("img", { alt: "", className: "vpws-playlist-art", src: playlist.image, loading: "lazy" })
                : react.createElement("div", { className: "vpws-playlist-art", "aria-hidden": "true" }),
            react.createElement(
                "div",
                { style: { minWidth: 0 } },
                react.createElement("p", { className: "vpws-playlist-title", title: playlist.title }, playlist.title),
                react.createElement(
                    "p",
                    { className: "vpws-playlist-desc" },
                    playlist.desc || `${playlist.noOfSongs} songs  ·  ${playlist.created}`
                )
            ),
            react.createElement("span", { className: "vpws-badge" }, `#${playlist.index}`)
        );
    }

    function ResultsModal({ targetUri }) {
        const modalRef = react.useRef(null);
        const [state, setState] = react.useState({
            error: "",
            matches: [],
            processed: 0,
            status: "loading",
            total: 0,
            track: null,
        });

        // Runtime scrollbar nuke: walk every parent up to the overlay
        react.useEffect(() => {
            const el = modalRef.current;
            if (!el) return;
            let parent = el.parentElement;
            const cleaned = [];
            while (parent && parent !== document.body) {
                const prev = {
                    el: parent,
                    overflow: parent.style.overflow,
                    overflowY: parent.style.overflowY,
                    overflowX: parent.style.overflowX,
                    scrollbarWidth: parent.style.scrollbarWidth,
                    msOverflowStyle: parent.style.msOverflowStyle,
                };
                cleaned.push(prev);
                parent.style.overflow = "hidden";
                parent.style.overflowY = "hidden";
                parent.style.overflowX = "hidden";
                parent.style.scrollbarWidth = "none";
                parent.style.msOverflowStyle = "none";
                parent = parent.parentElement;
            }
            return () => {
                for (const p of cleaned) {
                    p.el.style.overflow = p.overflow;
                    p.el.style.overflowY = p.overflowY;
                    p.el.style.overflowX = p.overflowX;
                    p.el.style.scrollbarWidth = p.scrollbarWidth;
                    p.el.style.msOverflowStyle = p.msOverflowStyle;
                }
            };
        }, []);

        react.useEffect(() => {
            let dead = false;

            async function run() {
                try {
                    const track = await fetchTrackMetadata(targetUri);
                    if (dead) return;
                    setState((s) => ({ ...s, track }));

                    const result = await scanPlaylists(targetUri, ({ matches, processed, total }) => {
                        if (dead) return;
                        setState((s) => ({ ...s, matches, processed, status: "loading", total }));
                    });

                    if (dead) return;
                    setState((s) => ({ ...s, matches: result.matches, processed: result.total, status: "done", total: result.total }));
                } catch (e) {
                    if (dead) return;
                    console.error("ViewPlaylistsWithSong failed", e);
                    setState((s) => ({ ...s, error: e?.message || String(e), status: "error" }));
                }
            }

            run();
            return () => { dead = true; };
        }, [targetUri]);

        const els = [];

        els.push(react.createElement(TrackHero, { key: "hero", track: state.track }));

        if (state.status === "loading") {
            els.push(react.createElement(ProgressBar, { key: "bar", processed: state.processed, total: state.total }));
        }

        els.push(
            react.createElement(StatusRow, {
                key: "status",
                processed: state.processed,
                total: state.total,
                matchCount: state.matches.length,
                status: state.status,
            })
        );

        if (state.status === "error") {
            els.push(react.createElement("p", { className: "vpws-empty", key: "err" }, state.error));
        } else if (state.status === "done" && state.matches.length === 0) {
            els.push(
                react.createElement(
                    "div",
                    { className: "vpws-empty", key: "empty" },
                    react.createElement("div", { className: "vpws-empty-icon" }, "🔍"),
                    "This track was not found in any of your own playlists."
                )
            );
        } else if (state.matches.length > 0) {
            els.push(
                react.createElement(
                    "div",
                    { className: "vpws-results-wrap", key: "wrap" },
                    react.createElement(
                        "div",
                        { className: "vpws-results" },
                        state.matches.map((p, i) =>
                            react.createElement(PlaylistCard, {
                                key: `${p.uri}-${p.index}`,
                                playlist: p,
                                trackUri: targetUri,
                                index: i,
                            })
                        )
                    )
                )
            );
        }

        return react.createElement("div", { className: "vpws-modal", ref: modalRef }, ...els);
    }

    // ── Entry Points ─────────────────────────────────────────────────
    function showTrackPopup(trackUri) {
        if (!isTrackUri(trackUri)) {
            Spicetify.showNotification("Melior: no valid track was provided.", true);
            return;
        }
        injectStyles();
        PopupModal.display({
            content: react.createElement(ResultsModal, { targetUri: trackUri }),
            isLarge: true,
            title: "Melior",
        });
    }

    function listPlaylistsForUris(uris) {
        showTrackPopup(uris?.[0]);
    }

    function listPlaylistsForCurrentTrack() {
        const uri = getCurrentTrackUri();
        if (!uri) {
            Spicetify.showNotification("Melior: nothing is currently playing.", true);
            return;
        }
        showTrackPopup(uri);
    }

    function shouldDisplayContextMenu(uris) {
        return uris.length === 1 && isTrackUri(uris[0]);
    }

    new Spicetify.ContextMenu.Item("Melior: Find in Playlists", listPlaylistsForUris, shouldDisplayContextMenu, "search").register();
    new Spicetify.Menu.Item("Melior: Find Current Track", false, listPlaylistsForCurrentTrack, "search").register();

    document.addEventListener("keydown", (event) => {
        if (event.target && ["INPUT", "TEXTAREA"].includes(event.target.tagName)) return;
        if (event.ctrlKey && event.altKey && event.key.toLowerCase() === "v") {
            event.preventDefault();
            listPlaylistsForCurrentTrack();
        }
    });
})();
