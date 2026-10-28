// Site build: validate renderer compatibility, build the admin, then generate Hexo.
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;

function prepareRenderer() {
  // hexo-renderer-markdown-it 7.1.1 imports an internal path removed in modern
  // Markdown-it. Obtain the same Token constructor through the public parser API.
  // Apply the small, checked compatibility change on every build, including CI.
  
  
  const packagePath = require.resolve('hexo-renderer-markdown-it/package.json');
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  if (pkg.version !== '7.1.1') throw new Error('Recheck renderer compatibility before upgrading hexo-renderer-markdown-it.');
  const file = path.join(path.dirname(packagePath), 'lib/anchors.js');
  const oldLine = "const Token = require('markdown-it/lib/token');";
  const newLine = "const Token = new (require('markdown-it'))().parseInline('token', {})[0].constructor;";
  const source = fs.readFileSync(file, 'utf8');
  if (source.includes(oldLine)) fs.writeFileSync(file, source.replace(oldLine, newLine));
  else if (!source.includes(newLine)) throw new Error('Unexpected renderer source; refusing an unchecked compatibility patch.');
  console.log('Hexo Markdown-it public Token API compatibility checked.');

}

prepareRenderer();
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('Run this build through npm run build.');
const admin = spawnSync(process.execPath, [npmCli, 'run', 'build:admin'], {cwd:root,stdio:'inherit'});
if (admin.error || admin.status !== 0) throw new Error('Admin build failed.');

const cli = require.resolve('hexo/bin/hexo');
function run(command) {
  const result = spawnSync(process.execPath, [cli, command], {
    cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
  });
  const log = (result.stdout || '') + (result.stderr || '');
  process.stdout.write(log);
  // Hexo can return 0 even when a renderer/plugin fails to load.
  if (result.error || result.status !== 0 || /(?:^|\n)(?:\x1b\[[0-9;]*m)*(?:ERROR|FATAL)\b/.test(log)) {
    throw new Error(`Hexo ${command} failed; the deployment must not publish partial output.`);
  }
}
// Use Hexo's supported cleanup to avoid stale output hiding missing pages.
run('clean');
run('generate');
for (const name of ['index.html', 'archives/index.html', 'admin/index.html', 'admin/assets/boot.js', 'admin/assets/entry.js', 'post/806475f8/index.html']) {
  const file = path.join(root, 'public', name);
  if (!fs.existsSync(file) || fs.statSync(file).size === 0) throw new Error(`Required generated page/asset is missing: ${name}`);
}
console.log('Verified homepage, archives, an existing post and admin assets.');

const adminFiles = fs.readdirSync(path.join(root,'public/admin'));
const unexpected = adminFiles.filter(name => !['index.html','config.yml','assets'].includes(name));
if (unexpected.length) throw new Error('Development files leaked into the published admin: ' + unexpected.join(', '));
console.log('Verified admin output contains only index.html, config.yml and assets/.');
