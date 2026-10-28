// hexo-renderer-markdown-it 7.1.1 imports an internal path removed in modern
// Markdown-it. Obtain the same Token constructor through the public parser API.
// Apply the small, checked compatibility change on every build, including CI.
const fs = require('node:fs');
const path = require('node:path');
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
