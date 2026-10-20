# X Media Batch Tool｜推特/X 图片视频批量下载工具

**简体中文** · [English](README.md)

**X Media Batch Tool** 是开源的推特/X 图片视频下载工具，支持每帖下载按钮和批量下载队列。可保存 X 提供的原图尺寸图片、最高可用 MP4 视频，重试失败文件、跳过重复，并导出帖子正文与链接。提供 **Chrome Manifest V3 扩展**与 **Tampermonkey 油猴脚本**，内置**简体中文和 English 界面**。

**当前版本：v1.3.0** · [下载发布版](https://github.com/AmBiTTion/x-media-batch-tool/releases/latest) · [安装油猴脚本](https://github.com/AmBiTTion/x-media-batch-tool/raw/refs/heads/main/userscript/x-batch-tool.user.js) · [安装教程](docs/INSTALL.zh-CN.md) · [常见问题](docs/FAQ.zh-CN.md)

![模拟帖子上的中文单帖下载菜单](docs/images/post-menu-zh-CN.png)

## 项目速览

| 问题 | v1.3.0 的实际情况 |
| --- | --- |
| 能做什么？ | 单帖下载，或批量保存 X/Twitter 网页已加载帖子的媒体。 |
| 适合谁？ | 希望在本机保存媒体、导出正文和链接的桌面网页用户。 |
| 如何安装？ | 加载 Chrome 扩展文件夹，或安装油猴脚本；不需要服务器或 API Key。 |
| 支持什么语言？ | 简体中文和 English，首次跟随浏览器，可手动切换并保存。 |
| 下载什么画质？ | X 提供的 `orig` 尺寸图片，以及已加载响应中的最高码率可用 MP4。 |
| 数据存在哪里？ | 本机浏览器；无统计上报或第三方解析服务。 |
| 有哪些限制？ | 不含整账号归档；安卓实机兼容和登录账号真实媒体下载仍未验证。 |

[观看中文安装与使用演示](https://github.com/AmBiTTion/x-media-batch-tool/releases/download/v1.3.0/x-media-batch-tool-zh-CN-v1.3.0.webm)：先展示安装步骤说明，再在模拟网页中操作真实控件，并验证生成 PNG 的浏览器下载；不是实测真实 X 账号视频。

## 功能

- 每帖下方显示下载按钮，支持全部媒体、仅图片、仅视频、保存正文及链接、强制重新下载。
- 图片请求 X 提供的 `name=orig` 尺寸，视频选择网页已加载响应中的最高码率可下载 MP4。
- 勾选单帖加入批量；收集当前页面、有限轮次滚动收集、搜索筛选、JSON / CSV 导出。
- 顺序下载队列、逐帖进度、每个失败文件自动重试一次、去重跳过、手动重试和停止。
- 可选 TXT 正文、文件名预设、下载间隔、深浅主题，以及默认收起的响应式面板。
- 帖子、设置、去重历史和任务保存在本机；刷新后未完成的任务标为中断，由用户手动重试。
- 中英文即时切换并保存选择，不中断正在执行的队列；提供可关闭的首次使用引导。

## Chrome 电脑版安装

1. 从 [Releases](https://github.com/AmBiTTion/x-media-batch-tool/releases/latest) 下载 `x-media-batch-tool-chrome-v1.3.0.zip` 并解压，或克隆/下载本仓库。
2. Chrome 地址栏打开 `chrome://extensions/`，开启“开发者模式”。
3. 点击“加载已解压的扩展程序”，选择**包含 `manifest.json` 的 `extension` 文件夹**。
4. 刷新 X 网页。每个已加载帖子底部出现下载入口；右下角入口打开批量面板。

扩展声明最低 Chrome 111。这是开发者模式加载的扩展，尚未上架 Chrome 应用商店。**Chrome 扩展和油猴脚本二选一运行**，避免版本冲突。

### 更新

覆盖原安装目录中的文件，在 `chrome://extensions/` 点击扩展卡片的“重新加载”，再刷新 X。保留原安装路径可保留该扩展的本地记录。如果更换路径或切换扩展/油猴版，请先导出记录；本版不提供二者之间的自动数据迁移。

## 油猴脚本安装

安装 [Tampermonkey](https://www.tampermonkey.net/)，打开[脚本原始文件](https://github.com/AmBiTTion/x-media-batch-tool/raw/refs/heads/main/userscript/x-batch-tool.user.js)。若没有自动打开安装界面，在油猴中添加新脚本，用 `userscript/x-batch-tool.user.js` 的完整内容替换默认代码，保存并刷新 X。

按浏览器要求启用用户脚本、网站访问权限，以及油猴下载权限。安卓兼容性取决于**具体浏览器及油猴版本**：本版仅在桌面 Chromium 模拟窄屏检查过布局，尚未实测安卓脚本注入、媒体捕获、`GM_download`、下载权限和后台行为，**不承诺所有手机 Chrome 都能运行**。

## 使用

语言设置位于 **设置 → 界面语言**，提供跟随浏览器、简体中文、English。英文界面中对应 **Settings → Interface language**。非中文浏览器默认使用英语，手动选择会在刷新后保留，不改变 X 网页自身的语言。

| 入口 | 操作 |
| --- | --- |
| 下载 | 直接把这一帖的媒体加入队列 |
| ⌄ | 下载类型、正文、强制重新下载、查看任务 |
| 加入批量 | 勾选这条帖子 |
| 帖子列表 | 收集、搜索、筛选、选择、下载、导出 |
| 下载任务 | 进度与错误、重试未完成任务、停止队列 |
| 设置 | 命名、正文、去重、主题及高级选项 |

筛选只改变显示内容，不会取消此前已选中的其他帖子；下载及导出针对**全部选中记录**。滚动默认最多 100 轮，可设为 1–300 轮，连续 8 轮无新增则停止。列表显示前 300 条筛选结果，批量操作仍针对全部选中记录。任务面板显示最近 100 条任务；本地保存最近 100 条已结束任务及全部等待/运行任务。

停止队列会取消等待任务，当前文件完成或超时后停止。“重试未完成”包括失败、已取消和上次中断任务，默认跳过之前成功的媒体；需要重下可使用单帖菜单中的强制下载。删除本地帖子记录不会删除 X 帖子或电脑文件，清理已结束任务也不会清空去重历史。

文件保存在浏览器下载目录，“每次询问保存位置”和多文件下载权限由浏览器设置决定。油猴版正文及导出操作会说明“已发起保存”，不冒充已核实文件完成；Chrome 扩展的队列媒体/TXT 下载依据浏览器完成事件记账。

![模拟帖子上的中文批量面板](docs/images/panel-zh-CN.png)

## 边界与排错

- 原图指 X 提供的 `orig` 尺寸，并非相机 RAW 或保证未经修改的上传文件。最高画质视频指 X 返回的最高码率可用 MP4，并非作者上传前的原始视频。GIF 通常保存为 MP4。
- 安装或更新后刷新 X，使工具能从页面启动时捕获响应。视频待解析时，打开原帖、刷新、等待媒体加载，再收集或下载。不依赖第三方解析服务，也不硬编码带认证的接口。
- 仅 HLS、直播、不可用/受限/已删除内容和 X 页面变化可能导致下载失败。未解析的视频会报错，不会把封面当作视频。
- 收集范围是网页实际加载的内容，未展开长正文、引用帖、混合媒体或 DOM 变化可能导致信息不完整，请核对重要记录。
- 工具报告超时后，Chrome 可能仍继续下载，重试前请检查下载列表。去重历史无法感知你之后删除了本地文件。
- **v1.3.0 尚未实现整账号归档、账号资料导出，以及原创/回复/转发/引用帖的专用分类筛选。**

## 常见问题摘要

**能批量下载推特视频和图片吗？** 可以收集已加载帖子、勾选并加入媒体队列；范围是当前可访问、实际加载的内容，不等于该账号全部历史。

**这是 Chrome 插件还是油猴脚本？** 两种形式都提供，只需启用一种，详见[中文安装教程](docs/INSTALL.zh-CN.md)。

**安卓 Chrome 能用吗？** 需要按具体浏览器及油猴版本验证；窄屏界面截图不能证明手机上能注入和下载。

**需要第三方解析网站或服务器吗？** 不需要。工具读取 X 已加载响应，从其媒体域名保存文件，详见隐私与权限说明。

更多解答：[画质、去重、视频失败与数据保存](docs/FAQ.zh-CN.md)。

## 隐私与权限

扩展声明 `storage` 与 `downloads` 权限，内容脚本仅在 `https://x.com/*` 和 `https://twitter.com/*` 运行；媒体下载域名限制为 `pbs.twimg.com` 和 `video.twimg.com`，TXT 正文在本机生成。

工具读取 X 网页自身已经请求的响应，不保存登录令牌；没有统计上报、上传服务或第三方解析后端。保存的正文和媒体链接可能属于私密资料，请使用可信的浏览器配置并按需清理/导出。不会自动点赞、转发、关注、发布或删除 X 内容。请仅保存有权访问和使用的内容。

## 开发与测试

需要 Node.js 18+ 和 npm。

```sh
npm ci
npm run build
npm test
npx playwright install chromium
npm run test:browser
```

主要源码位于 `userscript/x-batch-tool.user.js`；`scripts/build.cjs` 从中生成扩展的 `content.js`、`capture.js` 和 `manifest.json`，后台下载源文件为 `src/extension-background.js`。仓库保留生成后的 `extension` 便于直接安装，修改后发布前请重新构建。

测试覆盖原图 URL、视频码率、CSV 转义与公式防护、下载来源校验、严格 Trusted Types 下的启动、扩展响应桥接、真实 JSON 文件导出、设置保存、每帖控件、卡片复用、窄屏布局、去重和强制下载，以及部分失败后的补下载。新增语言检测、手动选择保存、下载中即时切换、首次引导及任务/选择保留测试。帖子数据和队列回报为模拟数据，演示另外验证了浏览器保存本机生成 PNG。**尚未在真实登录的 X 账号完成媒体下载端到端验证，也未完成安卓实机验证**。测试浏览器数据和自动测试产物不会提交到 Git。

翻译字典位于 `src/i18n/en.json`，构建时嵌入独立油猴脚本，也会生成 Chrome 扩展名称和简介的语言包。安装 Playwright Chromium 后执行 `node scripts/create-demo.cjs` 可重新生成双语安装步骤图、界面截图和演示；视频生成在忽略提交的 `dist/demo/`，供上传 Release 使用。

## 参考与许可

前期调研了 [Media Harvest](https://github.com/EltonChou/TwitterMediaHarvest)、[X Media Downloader](https://github.com/Rove24/X-Media-Downloader) 和 [Twitter Media Assist](https://github.com/Flkalas/TwitterMediaAssist)。本工具独立编写，这些项目仅为参考，并非捆绑依赖。

[MIT License](LICENSE)。
