# Giraffish 写作工作台

后台入口仍是 `/admin/`。文章仍保存在 `source/_posts`，使用现有 Netlify Identity、Git Gateway 和审核发布流程。文章短链接 `abbrlink`、原有 front matter 和文件名保持兼容。

## 使用

- **渲染**：整篇连续滚动，按视窗创建渲染内容；点击正文段落即可编辑该处 Markdown。大纲跳转保持当前模式，不存在章节分页。
- **源码**：CodeMirror 6，语法高亮、撤销重做、自动换行、查找替换。源码是内容的依据，查看和切换模式不会自动重写原文。
- **分屏**：源码与实时预览；拖动中间分隔条调宽度，拖至左端松开进入渲染、右端进入源码；单栏边缘的分隔条可向内拖回分屏。聚焦分隔条后可使用左右键，Home / End 直接收起一侧。分屏比例保存在此浏览器，两侧滚动按内容块双向同步，大纲跟随当前位置并只展开当前路径。
- **工作区**：打开文章后默认铺满编辑工作区。左下角按钮开关侧栏，右下角显示字符与行数。保存、审核和发布使用 CMS 顶部按钮。
- **信息**：侧栏顺序为“大纲 / 信息 / 图片 / 模板”。标题、日期、标签、分类、摘要、封面等元数据位于“信息”，直接使用 CMS 原生控件；校验失败会自动打开信息面板。侧栏宽度可拖动调整并记住。
- **外链图片**：粘贴图床地址与说明，直接插入 Markdown；“侧栏 → 图片”列出当前文章的 Markdown、引用式和 HTML 图片，以缩略图展示，可定位、复制、打开原图。封面与头图等 URL 图片字段也提供缩略图。本地附件仍可使用 CMS 媒体库。
- **侧栏模板**：以效果预览卡片提供 Fluid 插件模块：折叠块、便签、行内标签、按钮、勾选框、组图。插入位置是当前光标，不覆盖已有内容。语法依据 https://fluid.ist/docs/guide/#tag-插件，与本站安装的主题标签实现核对。
- **恢复副本**：编辑正文后保存一份按文章区分的浏览器本地副本。恢复需手动确认，保存文章成功后清除相应副本。Decap 自身也可能提示恢复其包含元数据的本地备份。浏览器存储不是云端保存；重要内容请正常保存或导出正文。
- **更新日期**：显式保存文章时自动更新 `updated`（UTC+8），发布日期保持原值。

三种模式共用 CodeMirror 中的同一份 Markdown。渲染与切换模式不会将 HTML 反向序列化，因此不会重排整篇文章；输入后立刻切换或保存也不会漏字。查找替换保持当前模式。导出按钮导出正文，不包含 front matter。

## 本地开发与测试

需要 Node 24（仓库 `.nvmrc`）。

```sh
npm ci
npm run build
npm run test:admin
npm --prefix admin-app run dev
```

打开 `http://127.0.0.1:4173/admin/?demo=1`。体验模式使用 Decap 测试 backend，不连接博客仓库，刷新后测试仓库内容会重置。普通 `/admin/` 保持线上认证流程；Netlify Identity 无法由本地静态服务模拟。

后续只改工作台代码时运行 `npm --prefix admin-app run build` 后刷新浏览器。

## 构建与维护

- 代码位于 `admin-app/src/`，构建输出 `source/admin/assets/`（不提交 Git），Hexo 对 `admin/**` 不作模板渲染。
- CMS、Identity widget、编辑器、公式库与字体均随站点部署。核心版本由 `package-lock.json` 锁定；浏览器不再依赖浮动 `netlify-cms@2` CDN。
- `build:admin` 使用锁文件安装、运行测试，再生成资源。Netlify 执行 `npm run build`，不再使用 `npm install --force`。
- Decap 的官方发行包使用 React 19，部分传递依赖仍声明旧 React peer；`admin-app/.npmrc` 仅用于安装这个官方 bundle。没有单独编译第二套 React。
- 根目录 overrides 将 Hexo renderer 的 Markdown-it 更新到 15.0.3、KaTeX 更新到 0.19.1。后台预览使用同版组件。旧 Vditor 依赖已移除。
- `build-tools/prepare-renderer.cjs` 为旧 Hexo renderer 的 Token 导入加上严格版本检查的兼容补丁，改用 Markdown-it 公开 API；升级 renderer 时必须重新核验。`build-tools/build-site.cjs` 清理后生成站点，检查 Hexo 错误日志与首页、归档、现有文章、后台资源，防止 Hexo 返回 0 却生成不完整站点。
- Dependabot 每周检查 `/admin-app`，补丁更新分组；主版本升级应重新跑语料和浏览器测试。

解析器仅缓存当前文档，同一份源码切换模式时复用结果；编辑后重新解析。分屏预览复用未变化的内容块，保留图片和折叠状态；侧栏数据未变化时保留已有控件。离开编辑器时清理观察器、事件监听、定时任务与图片对话框。

## 验证与已知限制

已验证现有文章解析、公式、Fluid 插件与 HTML 清理，以及渲染/源码模式之间的原文一致性。浏览器以真实 21 万余字符论文验证连续滚动、文末到达和大纲跳转；页面只挂载可见区域附近的渲染内容。测试内容不会修改正式文章。

截至本次升级，根目录 npm audit 的高危/中危项已经清零，仍有 deepmerge 4.3.1 的低危公告及其上游影响项。最新版 Decap 的 npm 依赖仍有 trim、Plate、uuid 等上游公告；官方预打包文件不会因 npm overrides 自动变更。因此没有用强制降级或宣称“全部漏洞已修复”。本项目不使用 Decap 自带的旧 Markdown / richtext 编辑控件，而使用独立工作台；仍需持续关注 Decap 上游修复。

Git Gateway / Identity 的仓库访问凭据仍由 Netlify 管理。本次升级不更换认证架构；凭据失效时仍需在 Netlify 的 Identity → Services 中更新。预览与正式站的登录会话分属不同域。
