const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// CDN选项配置
const CDN_OPTIONS = {
  amazon: 'https://cdn.giraffish.top/blog/',
  jsdmirror: 'https://cdn.jsdmirror.com/gh/giraffishh/image-hosting@main/blog/',
  jsdelivr: 'https://fastly.jsdelivr.net/gh/giraffishh/image-hosting@main/blog/'
};

// 需要排除的文章列表（支持文件名或相对路径）
const EXCLUDED_FILES = [
  'cpp学习笔记基础篇.md',
  'cpp学习笔记中级篇.md',
  'Docker.md',
  'freeTheMouse.md',
  'hello-blog.md',
  'java学习笔记基础篇.md',
  'ojassistant-sustechjcodercli.md',
  'Taiqi.md',
  'v2ray.md'
];

// 支持的图片扩展名
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];

// 定义需要特殊处理文件名（去后缀）的 PicGo 域名列表
const PICGO_DOMAINS = ['img.picgo.net', 'origin.picgo.net'];

// --- GIT HELPER FUNCTIONS (Modeled after upload.js) ---

/**
 * 检查是否是Git仓库
 * @param {string} dir - 目录
 * @returns {boolean}
 */
function isGitRepository(dir) {
  try {
    execSync('git rev-parse --git-dir', { cwd: dir, stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * 执行Git提交
 * @param {string} cdnName - CDN名称
 * @param {string} sourceDir - 源码目录
 */
function commitChanges(cdnName, sourceDir) {
  try {
    console.log('\n🔄 Starting git commit process...');
    
    const statusOutput = execSync('git status --porcelain', { cwd: sourceDir, encoding: 'utf8' });
    if (!statusOutput.trim()) {
      console.log('ℹ️  No changes detected in git status. Skipping commit.');
      return;
    }

    console.log('📁 Adding all modified files to staging area...');
    execSync('git add .', { cwd: sourceDir, stdio: 'ignore' });
    console.log('   ✅ All files added successfully');

    const commitMessage = `[AUTO-UPDATE-CDN] Switch to ${cdnName} CDN`;
    console.log(`💾 Committing changes with message: "${commitMessage}"`);
    execSync(`git commit -m "${commitMessage}"`, { cwd: sourceDir, stdio: 'ignore' });

    console.log('✅ Git commit completed successfully!');
    
    const commitHash = execSync('git rev-parse --short HEAD', { cwd: sourceDir, encoding: 'utf8' }).trim();
    console.log(`   Commit hash: ${commitHash}`);

  } catch (error) {
    console.error(`❌ Git commit failed: ${error.message}`);
    throw error;
  }
}

/**
 * 调试Git仓库状态
 * @param {string} sourceDir - 源码目录
 */
function debugGitRepository(sourceDir) {
    console.log('🔍 Git Repository Debug Information:');
    console.log(`   Current working directory: ${process.cwd()}`);
    console.log(`   Source directory: ${path.resolve(sourceDir)}`);
    console.log(`   .git directory exists: ${fs.existsSync(path.join(sourceDir, '.git'))}`);
    try {
        execSync('git rev-parse --is-inside-work-tree', { cwd: sourceDir, stdio: 'ignore' });
        console.log('✅ Git repository detected successfully via "git rev-parse".');
        return true;
    } catch (error) {
        console.log(`❌ Git command failed: ${error.message}`);
        return false;
    }
}


// --- CORE SCRIPT LOGIC ---

/**
 * 检查文件是否在排除列表中
 * @param {string} filePath - 文件的完整路径
 * @param {string} postsDir - posts目录的路径
 * @returns {boolean} - 是否需要排除
 */
function isFileExcluded(filePath, postsDir) {
  if (EXCLUDED_FILES.length === 0) return false;
  const relativePath = path.relative(postsDir, filePath).replace(/\\/g, '/');
  const fileName = path.basename(filePath);
  return EXCLUDED_FILES.some(excluded => {
    const normalizedExcluded = excluded.replace(/\\/g, '/');
    return fileName === excluded || relativePath === normalizedExcluded;
  });
}

/**
 * 从 PicGo URL 中提取真实文件名（去除可能的后缀）
 * 仅当 extractFilename 显式调用此函数时才执行
 * @param {string} filename - 原始文件名
 * @returns {string} - 处理后的文件名
 */
function extractRealFilename(filename) {
  const ext = path.extname(filename);
  const basename = path.basename(filename, ext);
  // 如果文件名特别长（通常是因为 PicGo 添加了时间戳后缀），尝试去除后16位
  if (basename.length > 16) {
    return basename.slice(0, -16) + ext;
  }
  return filename;
}

/**
 * 检查URL是否为图片链接
 * @param {string} url - 要检查的URL
 * @returns {boolean} - 是否为图片链接
 */
function isImageUrl(url) {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    return IMAGE_EXTENSIONS.some(ext => pathname.endsWith(ext));
  } catch {
    return false;
  }
}

/**
 * 从URL中提取文件名
 * 逻辑：
 * 1. 如果域名是 img.picgo.net 或 origin.picgo.net，去除可能的16位后缀。
 * 2. 其他域名直接返回文件名，不修改。
 * @param {string} url - 图片URL
 * @returns {string} - 文件名
 */
function extractFilename(url) {
  try {
    const urlObj = new URL(url);
    // 只有指定的 PicGo 域名才执行去后缀逻辑
    if (PICGO_DOMAINS.includes(urlObj.hostname)) {
      return extractRealFilename(path.basename(urlObj.pathname));
    }
    // 其他域名直接返回文件名
    return path.basename(urlObj.pathname);
  } catch {
    return '';
  }
}

/**
 * 替换文本中的图片链接
 * @param {string} content - 文件内容
 * @param {string} targetCdn - 目标CDN前缀
 * @returns {object} - 替换结果
 */
function replaceImageLinks(content, targetCdn) {
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)|https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp|svg|bmp)(?:\?[^\s]*)?/gi;
  let replacedCount = 0;
  let skippedCount = 0;
  
  const newContent = content.replace(imageRegex, (match, alt, url) => {
    const imageUrl = (alt !== undefined && url !== undefined) ? url : match;
    if (!isImageUrl(imageUrl)) return match;
    
    // 如果已经是目标 CDN，则跳过
    if (imageUrl.startsWith(targetCdn)) {
      skippedCount++;
      return match;
    }

    const filename = extractFilename(imageUrl);
    if (!filename) return match;
    
    replacedCount++;
    const newUrl = targetCdn + filename;
    return (alt !== undefined && url !== undefined) ? `![${alt}](${newUrl})` : newUrl;
  });
  
  return { content: newContent, replacedCount, skippedCount };
}

/**
 * 处理单个文件
 * @param {string} filePath - 文件路径
 * @param {string} targetCdn - 目标CDN前缀
 * @returns {object} - 处理结果
 */
function processFile(filePath, targetCdn) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const result = replaceImageLinks(content, targetCdn);
    if (result.replacedCount > 0) {
      fs.writeFileSync(filePath, result.content, 'utf8');
      console.log(`✅ ${filePath}: Replaced ${result.replacedCount} links` + (result.skippedCount > 0 ? `, skipped ${result.skippedCount}` : ''));
      return { modified: true };
    }
    return { modified: false };
  } catch (error) {
    console.error(`❌ Error processing ${filePath}: ${error.message}`);
    return { modified: false };
  }
}

/**
 * 递归处理目录中的所有Markdown文件
 * @param {string} dirPath - 目录路径
 * @param {string} targetCdn - 目标CDN前缀
 * @param {string} postsDir - posts根目录路径
 * @returns {object} - 处理结果统计
 */
function processDirectory(dirPath, targetCdn, postsDir) {
  const stats = { modifiedFiles: 0 };
  try {
    for (const item of fs.readdirSync(dirPath, { withFileTypes: true })) {
      const fullPath = path.join(dirPath, item.name);
      if (item.isDirectory()) {
        const subStats = processDirectory(fullPath, targetCdn, postsDir);
        stats.modifiedFiles += subStats.modifiedFiles;
      } else if (item.isFile() && (fullPath.endsWith('.md') || fullPath.endsWith('.markdown'))) {
        if (isFileExcluded(fullPath, postsDir)) {
          console.log(`🚫 Excluded: ${fullPath}`);
          continue;
        }
        if (processFile(fullPath, targetCdn).modified) {
          stats.modifiedFiles++;
        }
      }
    }
  } catch (error) {
    console.error(`❌ Error reading directory ${dirPath}: ${error.message}`);
  }
  return stats;
}

/**
 * 显示帮助信息
 */
function showHelp() {
    console.log(`
Usage: node switch-cdn.js <cdn-option> [options]

Available CDN options:
  ${Object.keys(CDN_OPTIONS).join(', ')}

Options:
  --no-git          Skip automatic git commit.
  --debug-git       Show git repository detection debug info.
  -h, --help        Show this help message.

Note: This script only commits changes, it does not push to remote.
`);
}

/**
 * 主函数
 */
function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }

  const cdnOption = args.find(arg => !arg.startsWith('--'));
  const skipGit = args.includes('--no-git');
  const debugGit = args.includes('--debug-git');
  
  if (!cdnOption || !CDN_OPTIONS[cdnOption]) {
    console.error(`❌ Invalid CDN option. Valid options are: ${Object.keys(CDN_OPTIONS).join(', ')}`);
    return;
  }

  const targetCdn = CDN_OPTIONS[cdnOption];
  const postsDir = path.join(process.cwd(), 'source', '_posts');
  const sourceDir = process.cwd();

  if (!fs.existsSync(postsDir)) {
    console.error(`❌ Directory not found: ${postsDir}`);
    return;
  }

  let isGitRepo = isGitRepository(sourceDir);
  if (debugGit) {
      debugGitRepository(sourceDir);
  }

  if (!skipGit && !isGitRepo) {
    console.warn('⚠️  Warning: Not a git repository. Git commit will be skipped.');
  }

  console.log(`\n🚀 Starting CDN switch to: ${targetCdn}`);
  console.log(`📁 Processing directory: ${postsDir}`);
  if (!skipGit && isGitRepo) {
    console.log(`🔄 Git auto-commit: ON (commit only, no push)`);
  }
  
  const stats = processDirectory(postsDir, targetCdn, postsDir);
  
  console.log(`\n📊 Processing completed. Modified ${stats.modifiedFiles} files.`);

  if (!skipGit && isGitRepo && stats.modifiedFiles > 0) {
    try {
      commitChanges(cdnOption, sourceDir);
    } catch (error) {
      console.error('⚠️  Git commit failed, but file processing was successful. Please commit manually.');
    }
  } else if (!skipGit && isGitRepo) {
    console.log('\nℹ️  No files were modified, skipping git commit.');
  }
  
  if (stats.modifiedFiles > 0) {
    console.log('\n🎉 CDN switch completed successfully!');
  }
}

main();