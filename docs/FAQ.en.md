# X/Twitter downloader FAQ — X Media Batch Tool v1.3.0

[简体中文](FAQ.zh-CN.md) · [Installation](INSTALL.en.md) · [Overview](../README.md)

## Can I download original Twitter images?

The tool requests X's `name=orig` size from `pbs.twimg.com`. This is X's provided original-size rendition, not a guarantee of the creator's untouched file or camera RAW.

## Can I download X videos at their highest quality?

The tool chooses the highest-bitrate downloadable MP4 in media metadata returned to the page. This is not necessarily the creator's pre-transcode source. HLS-only/live media or unavailable metadata may fail. GIF-style media commonly save as MP4.

## Is this a bulk Twitter downloader?

It supports per-post and batch media downloads. Collect loaded posts or scroll within a configured limit, select posts and queue downloads. It is not an exhaustive account crawler: full-account/profile archives and dedicated original/reply/repost/quote filters are not implemented.

## Do I need an API key or a third-party parsing website?

No. It observes responses already requested by your X page and uses X media hosts. It does not store authentication tokens, send analytics, or upload your stored posts to a service.

## Why is a video still pending or failing?

Install/enable the tool before refreshing X. Open the original post, refresh, wait for media to load, then collect or retry. If only HLS is available, access is restricted, the post was removed, or X changes its response layout, there may be no downloadable MP4. The tool reports the error rather than treating the cover as a video.

## Why are some files skipped?

Downloaded media are skipped by default. Use the post menu's **Download again**, or change **Settings → Skip previously downloaded media**. History cannot detect files you later delete on disk; reset it only if you want those files downloaded again. Manual retries normally supplement previously failed files without repeating completed files.

## How do I switch English and Chinese?

Use **Settings → Interface language** / **设置 → 界面语言**. Follow browser uses Chinese for a Chinese browser preference and English otherwise. Overrides persist, and live switching keeps your queue and selection. Text from X posts and raw operating-system/network errors is not automatically translated.

## Does the userscript work in Android Chrome?

This release does not make a universal Android claim. Check the exact browser build and userscript manager, then verify injection, response capture, `GM_download`, permissions and background behavior. Narrow-screen desktop tests establish layout only.

## Where do files and records go?

Files use the browser download folder. Extension records use `chrome.storage.local`; the userscript uses its manager's local script storage. There is no automatic migration between the formats. Export important records before changing profiles or installation paths. No import UI is included.

## What has actually been tested?

Unit and isolated Chromium tests use synthetic posts and simulated queue callbacks. They cover media parsing, queue recovery, deduplication, exports, language switching, retained settings/tasks, strict Trusted Types, and narrow-screen layout. The walkthrough saves a generated PNG through the browser and verifies its bytes. Real logged-in X media and actual Android devices remain unverified.
