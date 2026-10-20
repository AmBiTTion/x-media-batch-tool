# v1.2.0 — X Media Batch Tool / X 批量保存与媒体下载

## English

First public GitHub release of the completed v1.2.0 implementation.

- Per-post media download button and images/video/text menu.
- Batch collection and selection, JSON/CSV export, sequential queue, progress, retry, deduplication, and forced re-download.
- Optional TXT sidecars, filename presets, persistent settings, collapsible panel, light/dark and narrow-screen layouts.
- Chrome Manifest V3 extension and Tampermonkey userscript, with bilingual documentation and reproducible tests.

**Install:** download and extract `x-media-batch-tool-chrome-v1.2.0.zip`, open `chrome://extensions/`, enable Developer mode, and load its `extension` folder. Alternatively install `x-batch-tool.user.js` with Tampermonkey. Run one format at a time. For updates, preserve your installation folder, reload the extension, then refresh X.

**Validation:** unit and isolated Chromium tests passed on synthetic posts and simulated media-download callbacks; JSON-file export was tested through the browser. Real-media downloads on a logged-in X account and actual Android devices are not verified. Full-account/profile archiving and dedicated original/reply/repost/quote filters are not included. The UI is currently Simplified Chinese.

Video downloads use the highest-bitrate available MP4 provided by X, not a guaranteed pre-transcode original upload. Only content actually available to the current browser session can be collected.

## 简体中文

已完成的 v1.2.0 首次公开发布到 GitHub。

- 每帖下载按钮，以及图片、视频、正文保存菜单。
- 批量收集和选择、JSON/CSV 导出、顺序队列、进度、重试、去重和强制重新下载。
- 可选 TXT 正文、文件名预设、设置保存、收起式面板、深浅主题与窄屏布局。
- 提供 Chrome Manifest V3 扩展和油猴脚本、中英文文档及可复现测试。

**安装：** 下载并解压 `x-media-batch-tool-chrome-v1.2.0.zip`，打开 `chrome://extensions/`，启用开发者模式，加载其中的 `extension` 文件夹；或在油猴中安装 `x-batch-tool.user.js`。两种形式只启用一种。更新时保留原安装目录，重新加载扩展，再刷新 X。

**验证：** 单元测试和独立 Chromium 模拟帖子测试通过；媒体下载回报为模拟，JSON 文件导出经过浏览器验证。尚未完成真实登录账号媒体下载或安卓实机验证；不包含整账号/账号资料归档及原创、回复、转发、引用帖专用筛选。当前界面为简体中文。

视频为 X 提供的最高码率可用 MP4，并非保证作者转码前的原始文件；只能收集当前浏览器有权访问且实际加载的内容。

See / 详见 [English README](https://github.com/AmBiTTion/x-media-batch-tool/blob/main/README.md) · [中文说明](https://github.com/AmBiTTion/x-media-batch-tool/blob/main/README.zh-CN.md).

Assets / 发布附件：Chrome ZIP、`.user.js`、`SHA256SUMS.txt`。
