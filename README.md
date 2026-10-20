# X Media Batch Tool

[简体中文](README.zh-CN.md) · **English**

Save X / Twitter post media and organize local download tasks. Available as an unpacked **Chrome Manifest V3 extension** and a **Tampermonkey userscript**. The current interface is in Simplified Chinese; this documentation is bilingual.

**Latest release: v1.2.0** · [Downloads](https://github.com/AmBiTTion/x-media-batch-tool/releases/latest) · [Install userscript](https://github.com/AmBiTTion/x-media-batch-tool/raw/refs/heads/main/userscript/x-batch-tool.user.js)

![Per-post download menu on a synthetic test page](docs/images/post-menu.png)

## Features

- A download button under each post, with actions for all media, images only, videos only, post text/link, and forced re-download.
- Original-size images (`name=orig`) and the highest-bitrate downloadable MP4 found in responses already loaded by the page.
- Per-post selection, collection of loaded posts, bounded scrolling collection, search, media/selection filters, and JSON/CSV export.
- A sequential task queue with progress, one automatic retry per failed file, duplicate skipping, manual retry, and stop controls.
- TXT sidecars, filename presets, configurable file intervals, light/dark themes, and a responsive collapsible panel.
- Local persistence of posts, settings, history, and tasks. Unfinished tasks become interrupted after reload and require manual retry.

## Install in desktop Chrome

1. Download `x-media-batch-tool-chrome-v1.2.0.zip` from [Releases](https://github.com/AmBiTTion/x-media-batch-tool/releases/latest) and extract it, or clone/download this repository.
2. Open `chrome://extensions/` and enable **Developer mode**.
3. Click **Load unpacked** and select the **`extension` folder containing `manifest.json`**.
4. Refresh your X tab. A download row appears under loaded posts; the bottom-right launcher opens the batch panel.

Minimum declared Chrome version: 111. This is an unpacked developer installation, not a Chrome Web Store listing. Use the extension and userscript **one at a time** to avoid conflicting versions.

### Update

Replace files in the existing installation folder, click the extension's **Reload** button at `chrome://extensions/`, then refresh X. Keep the installation path unchanged to retain that extension's local data. If you switch installation paths or formats, export records before changing; automatic migration between extension and userscript storage is not provided.

## Install with Tampermonkey

Install [Tampermonkey](https://www.tampermonkey.net/), then open the [raw userscript](https://github.com/AmBiTTion/x-media-batch-tool/raw/refs/heads/main/userscript/x-batch-tool.user.js). If the installer does not open, create a new script, replace its contents with `userscript/x-batch-tool.user.js`, save, and refresh X.

Allow userscripts/site access in your browser and download access in Tampermonkey when prompted. Mobile compatibility depends on the **exact Android browser and userscript manager**. A narrow-screen UI has been tested in desktop Chromium; actual Android injection, media capture, `GM_download`, permissions, and background behavior **have not been verified**. This release does not claim universal Android Chrome support.

## Use

| Chinese control | Action |
| --- | --- |
| 下载 | Queue this post's media directly |
| ⌄ | Images/video/text actions, forced download, task list |
| 加入批量 | Select this post for batch operations |
| 帖子列表 | Collect, search, filter, select, download, export |
| 下载任务 | Inspect progress/errors, retry unfinished tasks, stop queue |
| 设置 | Filename, text sidecar, deduplication, theme, advanced settings |

Filtering does not deselect posts outside the current filter. “Download selected” and exports act on **all selected posts**. Scrolling collects at most 100 rounds by default (configurable 1–300) and stops after eight rounds without new posts. The list renders up to 300 matching posts; batch operations still apply to all selected records. The task panel displays the latest 100 tasks; persistence retains the latest 100 ended tasks plus waiting/running tasks.

Stopping cancels waiting tasks and waits for the current file to finish or time out. “Retry unfinished” includes failed, cancelled, and interrupted tasks. Completed media are skipped by default; use a post's forced-download action to download them again. Removing local post records does not delete X posts or files on disk. Clearing ended tasks does not clear download history.

Files go to the browser's configured download location. “Ask where to save each file” and multiple-download permission are browser settings. In the userscript, TXT/export downloads are reported as **save initiated**, not verified file completion; the Chrome extension uses the browser completion event for its queued media/TXT downloads.

![Batch panel on a synthetic test page](docs/images/panel.png)

## Media boundaries and troubleshooting

- “Original image” means the size X serves as `orig`, not a camera RAW or guaranteed unmodified upload. “Highest quality video” means the highest-bitrate available MP4 returned by X, not the creator's pre-transcode source. GIF-style media commonly save as MP4.
- Refresh X after installation/update so response capture starts with the page. If video metadata is unresolved, open the original post, refresh, wait for media loading, then collect/download again. No third-party parsing service or hard-coded authenticated API is used.
- HLS-only streams, live broadcasts, unavailable/restricted/deleted media, and X changes may prevent downloading. An unresolved video is reported as an error; its cover is not treated as a video.
- Collection covers what the page actually loads. Collapsed long text, quotes, mixed media, and DOM changes can yield incomplete data. Verify important records against the original post.
- A timeout can be reported while Chrome later continues a download. Check Chrome's Downloads page before retrying. History cannot detect files you subsequently delete on disk.
- **Full-account archiving, profile-data export, and dedicated original/reply/repost/quote filters are not implemented in v1.2.0.**

## Privacy and permissions

The extension declares `storage` and `downloads`; its content scripts run only on `https://x.com/*` and `https://twitter.com/*`. Media downloads are restricted to `pbs.twimg.com` and `video.twimg.com`. TXT files are generated locally.

The tool inspects page responses already requested by X, without storing login tokens. There is no analytics, upload service, or third-party parsing backend. Stored post text and media URLs may be private: use a trusted browser profile and clear/export records as needed. It does not automatically like, repost, follow, publish, or delete X content. Save only content you are authorized to access and use.

## Develop and test

Requires Node.js 18+ and npm.

```sh
npm ci
npm run build
npm test
npx playwright install chromium
npm run test:browser
```

Canonical userscript: `userscript/x-batch-tool.user.js`. `scripts/build.cjs` derives `extension/content.js`, `capture.js`, and `manifest.json`; the service worker source is `src/extension-background.js`. Generated installable extension files are committed for convenience. Rebuild before releasing changes.

Tests cover image URL conversion, MP4 bitrate selection, CSV escaping/formula protection, download-origin validation, strict Trusted Types UI boot, the extension capture bridge, actual JSON-file export, persistent settings, per-post controls, recycled post cards, narrow layout, duplicate/forced-download behavior, and partial-failure retry. Browser fixtures and download callbacks are synthetic; media completion is simulated. **Real media downloads on a logged-in X account and real Android devices have not been verified.** Test profiles and generated artifacts are ignored by Git.

## Related projects and license

Initial research included [Media Harvest](https://github.com/EltonChou/TwitterMediaHarvest), [X Media Downloader](https://github.com/Rove24/X-Media-Downloader), and [Twitter Media Assist](https://github.com/Flkalas/TwitterMediaAssist). This implementation was written independently; these projects are references, not bundled dependencies.

[MIT License](LICENSE).
