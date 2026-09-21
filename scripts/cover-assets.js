// Version the illustration assets so an existing PWA cache cannot mix revisions.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

hexo.extend.helper.register('cover_asset', function (name) {
  const allowed = ['css/moon-cover.css', 'js/moon-cover.js'];
  if (!allowed.includes(name)) throw new Error('Unknown cover asset');
  const content = fs.readFileSync(path.join(hexo.source_dir, name));
  const version = crypto.createHash('sha256').update(content).digest('hex').slice(0, 12);
  return this.url_for('/' + name) + '?v=' + version;
});
