const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
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
