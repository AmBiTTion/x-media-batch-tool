# v1.3.0 — Bilingual X/Twitter downloader / 中英文推特图片视频下载工具

## English

- **English + 简体中文 UI**: follows browser language by default; choose a saved override in Settings → Interface language. Switching keeps active downloads, tasks and selected posts.
- Localized per-post buttons, task states, first-use help, tool errors, confirmations and Chrome extension metadata.
- Clear X/Twitter image/video downloader title and overview, bilingual FAQ, installation guides, updated screenshots and two walkthrough videos.
- Fixed early userscript startup when the document root is not ready.

**Install:** extract `x-media-batch-tool-chrome-v1.3.0.zip`, open `chrome://extensions/`, enable Developer mode, and load the `extension` folder. Or install `x-batch-tool.user.js` in Tampermonkey. Enable one format at a time. Update in the existing installation folder, reload the extension, then refresh X.

**Demonstrations:** opening slides explain installation; subsequent recorded controls run on a synthetic page and download a generated PNG, with byte verification. They are not recordings of Chrome extension installation or real-account X video downloads.

**Validation:** unit, translation-coverage and isolated Chromium tests passed; language switching was tested during an active task and across refresh. Real logged-in X media downloads and Android compatibility remain unverified. Full-account/profile archives and dedicated original/reply/repost/quote filters are not included.

[English guide](https://github.com/AmBiTTion/x-media-batch-tool/blob/main/docs/INSTALL.en.md) · [English walkthrough](https://github.com/AmBiTTion/x-media-batch-tool/releases/download/v1.3.0/x-media-batch-tool-en-v1.3.0.webm)

## 简体中文

- **中英文界面**：默认跟随浏览器，可在“设置 → 界面语言”手动选择并保存。切换时保留下载、任务和已选帖子。
- 每帖按钮、任务状态、首次引导、工具错误、确认框及 Chrome 扩展信息提供双语。
- 优化推特/X 图片视频下载工具的标题和介绍，补齐双语 FAQ、安装教程、截图与两份演示视频。
- 修复油猴注入较早、根节点尚未创建时的启动问题。

**安装：** 解压 `x-media-batch-tool-chrome-v1.3.0.zip`，在 `chrome://extensions/` 启用开发者模式，加载 `extension` 文件夹；或用油猴安装 `x-batch-tool.user.js`。只启用一种形式。更新时保留原目录，重新加载扩展，再刷新 X。

**演示说明：** 开头为安装步骤说明，随后录制模拟网页上的真实控件，浏览器下载本机生成 PNG 并核对字节。不冒充 Chrome 扩展安装实录或真实 X 账号视频下载。

**验证范围：** 单元、翻译覆盖和独立 Chromium 测试通过，覆盖下载中切换及刷新保存。真实登录 X 媒体下载、安卓兼容仍未验证；不包含整账号/资料归档及原创、回复、转发、引用帖专用筛选。

[中文教程](https://github.com/AmBiTTion/x-media-batch-tool/blob/main/docs/INSTALL.zh-CN.md) · [中文演示](https://github.com/AmBiTTion/x-media-batch-tool/releases/download/v1.3.0/x-media-batch-tool-zh-CN-v1.3.0.webm)

Assets / 附件：Chrome ZIP、油猴 `.user.js`、中英文 WebM 演示、SHA256SUMS.txt。Videos are downloadable WebM files; open in a compatible browser/player.
