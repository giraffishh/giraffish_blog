# Giraffish 写作工作台

后台入口仍是 `/admin/`。文章仍保存在 `source/_posts`，使用现有 Netlify Identity、Git Gateway 和审核发布流程。文章短链接 `abbrlink`、原有 front matter 和文件名保持兼容。

## 使用

- **即时渲染**：类似 Typora，在当前段落显示 Markdown 标记。超过 80,000 字符的文章按章节编辑；下拉框切换章节，其他章节不参与序列化。无标题且超过阈值的单个章节自动回到分屏。
- **源码**：CodeMirror 6，语法高亮、撤销重做、自动换行、查找替换。源码是内容的依据，查看和切换模式不会自动重写原文。
- **分屏**：源码与实时预览；拖动中间分隔条调宽度，或聚焦分隔条后使用左右键。比例保存在此浏览器，源码滚动会带动预览。
- **阅读**：只显示正文预览。使用与博客相同的 Markdown-it / KaTeX 插件，支持公式、表格、代码和 HTML。预览移除可执行 HTML，不改变保存的源码。
- **专注写作**：放大正文编辑区；右上角“返回文章设置”或 Esc 返回。保存、审核和发布使用 CMS 顶部按钮。
- **外链图片**：粘贴图床地址与说明，直接插入 Markdown；“大纲 / 图片 → 图片”列出当前文章的 Markdown、引用式和 HTML 图片，可定位、复制、打开。封面与头图也直接填写 URL。本地附件仍可使用 CMS 媒体库。
- **写作模板**：论文批读、课程笔记、公式、代码、表格、折叠笔记，插入到光标处，不覆盖正文。
- **恢复副本**：编辑正文后保存一份按文章区分的浏览器本地副本。恢复需手动确认，保存文章成功后清除相应副本。Decap 自身也可能提示恢复其包含元数据的本地备份。浏览器存储不是云端保存；重要内容请正常保存或导出正文。
- **更新日期**：显式保存文章时自动更新 `updated`（UTC+8），发布日期保持原值。

即时渲染在实际编辑时会规范化**当前章节**的 Markdown 格式，例如空行和列表标记；需要严格保留排版字节时使用源码。仅查看或切换模式不回写这种格式化。导出按钮导出正文，不包含 front matter。

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
- 根目录 overrides 将 Hexo renderer 的 Markdown-it 更新到 15.0.3、KaTeX 更新到 0.19.1。后台预览使用同版组件。Vditor 自带的 KaTeX 也在构建时用 0.19.1 覆盖。
- Dependabot 每周检查 `/admin-app`，补丁更新分组；主版本升级应重新跑语料和浏览器测试。

## 验证与已知限制

已验证现有 28 篇文章的解析、公式与 HTML 清理、外链识别、章节无损分区，以及输入后立即切换模式时的同步。浏览器使用真实 21 万余字符论文测试分节编辑和切换前后全文一致性，并在测试 backend 验证保存。没有用测试内容修改正式文章。

截至本次升级，根目录 npm audit 的高危/中危项已经清零，仍有 deepmerge 4.3.1 的低危公告及其上游影响项。最新版 Decap 的 npm 依赖仍有 trim、Plate、uuid 等上游公告；官方预打包文件不会因 npm overrides 自动变更。因此没有用强制降级或宣称“全部漏洞已修复”。本项目不使用 Decap 自带的旧 Markdown / richtext 编辑控件，而使用独立工作台；仍需持续关注 Decap 上游修复。

Git Gateway / Identity 的仓库访问凭据仍由 Netlify 管理。本次升级不更换认证架构；凭据失效时仍需在 Netlify 的 Identity → Services 中更新。预览与正式站的登录会话分属不同域。
