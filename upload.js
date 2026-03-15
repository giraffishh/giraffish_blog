#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');
const moment = require('moment-timezone');
const path = require('path');
const fs = require('fs');

moment.tz.setDefault('Asia/Shanghai');

// 特定的提交消息前缀，用于标记自动更新的提交
const AUTO_UPDATE_PREFIX = '[AUTO-UPDATE-TIME]';
const AUTO_UPDATE_CDN_PREFIX = '[AUTO-UPDATE-CDN]';
const SKIP_UPDATE_PREFIX = '[SKIP]';

// 判定为脚本自动修改的时间阈值（秒）
// 如果文件修改时间与最后一次commit时间差小于此值，则认为是脚本自动操作导致的“假”修改
const AUTO_MODIFICATION_THRESHOLD_SECONDS = 15;

// 默认配置
const DEFAULT_CONFIG = {
  postsDir: './source/_posts',
  sourceDir: '.',
  dryRun: false,
  dateOnly: false,
  updatedOnly: false,
  noCommit: false,
  noPush: false,
  fix: false,
  message: ''
};

function printUsage() {
  console.log(`
Usage: node upload.js [-m "Your commit message"] [options]

Options:
  -m, --message <msg>  Commit message (auto-generated if not provided)
  --posts-dir <dir>    Posts directory (default: ./source/_posts)
  --source-dir <dir>   Source directory (default: .)
  --dry                Show what would be updated without making changes
  --date-only          Only update date field
  --updated-only       Only update updated field
  --no-commit          Do not auto-commit after updates
  --no-push            Do not push to remote after updating dates
  --fix                Fix file mtime based on "updated" or "date" field
  --help               Show this help message
`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const config = { ...DEFAULT_CONFIG };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--help':
      case '-h':
        printUsage();
        process.exit(0);
        break;
      case '--message':
      case '-m':
        config.message = args[++i];
        break;
      case '--posts-dir':
        config.postsDir = args[++i];
        break;
      case '--source-dir':
        config.sourceDir = args[++i];
        break;
      case '--dry':
        config.dryRun = true;
        break;
      case '--date-only':
        config.dateOnly = true;
        break;
      case '--updated-only':
        config.updatedOnly = true;
        break;
      case '--no-commit':
        config.noCommit = true;
        break;
      case '--no-push':
        config.noPush = true;
        break;
      case '--fix':
        config.fix = true;
        break;
      default:
        console.error(`Unknown option: ${arg}`);
        printUsage();
        process.exit(1);
    }
  }
  
  return config;
}

function checkGitStatus(sourceDir) {
  try {
    const status = execSync('git status --porcelain -z', { 
      cwd: sourceDir, 
      encoding: 'utf8' 
    });
    return status;
  } catch (error) {
    throw new Error(`Failed to check git status: ${error.message}`);
  }
}

function parseGitStatus(statusOutput) {
  if (!statusOutput) return [];
  return statusOutput.split('\0')
    .filter(line => line.trim())
    .map(line => {
      const status = line.substring(0, 2).trim();
      const filePath = line.substring(3);
      let statusDesc = '';
      
      if (status === 'M') statusDesc = 'Modified';
      else if (status === 'A') statusDesc = 'Added';
      else if (status === 'D') statusDesc = 'Deleted';
      else if (status.startsWith('R')) statusDesc = 'Renamed';
      else if (status === '??') statusDesc = 'Untracked';
      else statusDesc = `Changed (${status})`;
      
      const normalizedPath = filePath.replace(/\\/g, '/');
      return { status: statusDesc, path: normalizedPath };
    });
}

function pushToRemote(sourceDir) {
  try {
    console.log('🚀 Pushing to remote repository...');
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { 
      cwd: sourceDir, 
      encoding: 'utf8' 
    }).trim();
    
    if (!currentBranch) {
      throw new Error('Could not determine current branch');
    }
    
    execSync(`git push origin ${currentBranch}`, { cwd: sourceDir, stdio: 'inherit' });
    console.log(`✅ Successfully pushed to remote branch: ${currentBranch}`);
    return true;
  } catch (error) {
    console.error(`❌ Error pushing to remote: ${error.message}`);
    return false;
  }
}

function generateCommitMessage(changes) {
  if (changes.length === 0) {
    return 'chore: Update article timestamps';
  }

  if (changes.length === 1) {
    const change = changes[0];
    const fileName = path.basename(change.path, '.md');
    switch (change.status) {
      case 'Added':
      case 'Untracked':
        return `feat: Add post "${fileName}"`;
      case 'Modified':
        return `docs: Update post "${fileName}"`;
      case 'Deleted':
        return `refactor: Remove post "${fileName}"`;
      default:
        return `chore: Update content in ${change.path}`;
    }
  }

  const addedCount = changes.filter(c => c.status === 'Added' || c.status === 'Untracked').length;
  const modifiedCount = changes.filter(c => c.status === 'Modified').length;
  const deletedCount = changes.filter(c => c.status === 'Deleted').length;
  
  const parts = [];
  if (addedCount > 0) parts.push(`add ${addedCount} post(s)`);
  if (modifiedCount > 0) parts.push(`update ${modifiedCount} post(s)`);
  if (deletedCount > 0) parts.push(`delete ${deletedCount} post(s)`);
  
  if (parts.length > 0) {
    return `docs: ${parts.join(', ')}`;
  }

  return `chore: Batch update ${changes.length} file(s)`;
}

// 核心修复函数：判断是否应该忽略此次修改状态
function shouldIgnoreModification(filePath, sourceDir) {
  try {
    // 1. 获取文件当前的修改时间 (mtime)
    const stats = fs.statSync(filePath);
    const fileMtime = moment(stats.mtime);

    // 2. 获取 Git Log 中最后一次提交时间 (不过滤 Auto Update 前缀)
    // 这里的逻辑是：如果文件最近一次是因为脚本自动更新而被修改并提交的，
    // 那么文件的 mtime 应该和那次 commit 的时间非常接近。
    const rawLastCommitTime = getRawGitCommitDate(filePath, sourceDir);

    if (!rawLastCommitTime) return false;

    // 3. 计算时间差 (秒)
    const diffSeconds = Math.abs(fileMtime.diff(rawLastCommitTime, 'seconds'));

    // 如果差异在阈值内，说明文件实际上并没有被用户修改，而是脚本上次提交产生的状态
    return diffSeconds <= AUTO_MODIFICATION_THRESHOLD_SECONDS;
  } catch (error) {
    // 如果出错（例如文件不存在），则不忽略，按正常流程处理
    return false;
  }
}

function main() {
  const config = parseArgs();
  
  const postsDir = path.resolve(config.postsDir);
  const sourceDir = path.resolve(config.sourceDir);
  
  if (!fs.existsSync(postsDir)) {
    console.log(`❌ Posts directory not found: ${postsDir}`);
    return;
  }

  const allMarkdownFiles = getMarkdownFiles(postsDir);

  const finalFix = () => {
    console.log('\n🔧 Synchronizing file modification times with "updated" or "date" field...');
    const fixResults = [];
    allMarkdownFiles.forEach(file => {
      try {
        const result = fixMtimeFromFrontMatter(file, config.dryRun);
        if (result) {
          fixResults.push({
            file: path.relative(sourceDir, file),
            ...result
          });
        }
      } catch (error) {
        console.error(`   ❌ Error checking ${path.relative(sourceDir, file)}: ${error.message}`);
      }
    });

    if (fixResults.length > 0) {
      // Sort by absolute difference from highest to lowest
      fixResults.sort((a, b) => Math.abs(b.diffSeconds) - Math.abs(a.diffSeconds));

      console.log(`\n📊 Detailed Synchronization Report (${config.dryRun ? 'DRY RUN' : 'ACTUAL'}):`);
      console.log('--------------------------------------------------------------------------------');
      fixResults.forEach(res => {
        const diffStr = moment.duration(res.diffSeconds, 'seconds').humanize();
        const direction = res.diffSeconds > 0 ? 'newer' : 'older';
        console.log(`📄 ${res.file}`);
        console.log(`   Gap: ${Math.abs(res.diffSeconds)}s (~${diffStr}) [File is ${direction} than field]`);
        console.log(`   Field: ${res.newMtime.format('YYYY-MM-DD HH:mm:ss')}`);
        console.log(`   Mtime: ${res.oldMtime.format('YYYY-MM-DD HH:mm:ss')}`);
        console.log('');
      });
      console.log(`   ✅ ${config.dryRun ? 'Would synchronize' : 'Synchronized'} mtime for ${fixResults.length} file(s).`);
    } else {
      console.log('   ✅ All files are already synchronized.');
    }
  };

  if (config.fix) {
    finalFix();
    console.log(`\n🎉 Done!`);
    return;
  }
  
  console.log('🚀 Updating article timestamps based on Git history and current changes...');
  console.log(`   Mode: ${config.dryRun ? 'DRY RUN' : 'ACTUAL UPDATE'}`);
  console.log(`   Scope: ${config.dateOnly ? 'DATE ONLY' : config.updatedOnly ? 'UPDATED ONLY' : 'BOTH FIELDS'}`);
  
  try {
    execSync('git rev-parse --is-inside-work-tree', { cwd: sourceDir, stdio: 'ignore' });
  } catch (error) {
    console.log(`❌ Not a Git repository: ${sourceDir}`);
    return;
  }

  // 1. 获取当前时间 和 用户在运行脚本前所做的修改
  const currentTime = moment();
  const initialStatus = checkGitStatus(sourceDir);
  const initialChanges = parseGitStatus(initialStatus);
  const userChangedFiles = initialChanges.map(f => path.resolve(sourceDir, f.path));
  const userChangedFilesSet = new Set(userChangedFiles);

  console.log(`\n📁 Found ${allMarkdownFiles.length} markdown files to process.`);
  
  let updatedCount = 0;
  
  allMarkdownFiles.forEach(file => {
    try {
      let isStagedOrModified = userChangedFilesSet.has(file);

      // --- 核心修复逻辑开始 ---
      // 如果 Git 认为文件已修改，我们进一步检查这是否是脚本造成的“假”修改
      if (isStagedOrModified) {
        if (shouldIgnoreModification(file, sourceDir)) {
           // 如果判定为自动更新导致的差异，强制将其视为未修改
           // 这样脚本就会去读取历史 Git 记录作为时间，而不是当前时间
           isStagedOrModified = false;
           if (config.dryRun) {
             console.log(`   ⚠️  Detected script-induced modification for ${path.basename(file)}, ignoring current changes.`);
           }
        }
      }
      // --- 核心修复逻辑结束 ---

      const result = forceUpdateGitDates(file, sourceDir, { 
        dryRun: config.dryRun, 
        dateOnly: config.dateOnly, 
        updatedOnly: config.updatedOnly,
        isStagedOrModified: isStagedOrModified,
        currentTime: currentTime
      });
      
      if (result.hasChanges) {
        updatedCount++;
        const displayPath = path.relative(sourceDir, file).replace(/\\/g, '/');
        console.log(`\n📄 ${displayPath}`);
        console.log(`   ✅ ${config.dryRun ? 'Would update' : 'Updated'}:`);
        
        if (result.dateChanged) {
          console.log(`      📅 date: "${result.oldDate || 'none'}" → "${result.newDate}"`);
        }
        if (result.updatedChanged) {
          const reason = isStagedOrModified ? '(current edit)' : '(history correction)';
          console.log(`      🔄 updated: "${result.oldUpdated || 'none'}" → "${result.newUpdated}" ${reason}`);
        }
      }
    } catch (error) {
      console.error(`\n📄 ${path.relative(sourceDir, file).replace(/\\/g, '/')} - ❌ Error: ${error.message}`);
    }
  });

  const finalStatus = checkGitStatus(sourceDir);
  const filesToCommit = parseGitStatus(finalStatus);

  if (config.dryRun) {
    console.log(`\n📊 Summary:`);
    console.log(`   Processed: ${allMarkdownFiles.length} files`);
    console.log(`   Would update: ${updatedCount} files`);
    console.log(`\n💡 This was a dry run. No files were changed or committed.`);
    
    // Also run fix logic in dry run
    finalFix();
    
    return;
  }

  if (filesToCommit.length > 0) {
    if (!config.noCommit) {
        try {
          console.log('\n✨ Committing all changes...');
          filesToCommit.forEach(f => console.log(`     ${f.status}: ${f.path}`));

          let commitMessage = config.message;
          if (!commitMessage) {
            commitMessage = generateCommitMessage(initialChanges);
          }
          
          // 给自动生成的 commit 加上特殊前缀，以便下次识别
          if (!commitMessage.startsWith(AUTO_UPDATE_PREFIX)) {
             commitMessage = `${AUTO_UPDATE_PREFIX} ${commitMessage}`;
          }

          execSync('git add .', { cwd: sourceDir });
          execSync(`git commit -m "${commitMessage}"`, { cwd: sourceDir });
          
          console.log(`✅ Committed ${filesToCommit.length} files with message: "${commitMessage}"`);
          
          if (!config.noPush) {
            pushToRemote(sourceDir);
          } else {
            console.log('💡 Push skipped due to --no-push flag.');
          }
        } catch (error) {
          console.error(`❌ Error during commit/push: ${error.message}`);
        }
    } else {
        console.log('\n💡 Changes were made but not committed due to --no-commit flag.');
    }
  } else {
    console.log('\n✅ No changes detected in content or timestamps. Nothing to commit.');
  }

  // Auto-run fix after normal upload process
  finalFix();

  console.log(`\n🎉 Done!`);
}

function fixMtimeFromFrontMatter(filePath, dryRun) {
  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(/^(---\s*\n)([\s\S]*?)(\n---\s*\n)/);
  if (!match) return null;

  const frontMatterContent = match[2];
  const updatedMatch = frontMatterContent.match(/^updated:\s*(.*)$/m);
  const dateMatch = frontMatterContent.match(/^date:\s*(.*)$/m);

  const targetDateStr = (updatedMatch ? updatedMatch[1] : (dateMatch ? dateMatch[1] : null))?.trim().replace(/['"]/g, '');

  if (targetDateStr) {
    const targetDate = parseDate(targetDateStr);
    if (targetDate && targetDate.isValid()) {
      const stats = fs.statSync(filePath);
      const currentMtime = moment(stats.mtime);
      
      // Compare ignoring milliseconds/fine details if necessary, but moment handles it
      if (!currentMtime.isSame(targetDate, 'second')) {
        const diffSeconds = currentMtime.diff(targetDate, 'seconds');
        if (!dryRun) {
          fs.utimesSync(filePath, stats.atime, targetDate.toDate());
        }
        return {
          oldMtime: currentMtime,
          newMtime: targetDate,
          diffSeconds: diffSeconds
        };
      }
    }
  }
  return null;
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  const formats = ['YYYY-MM-DD HH:mm:ss', moment.ISO_8601];
  return moment.tz(dateStr, formats, true, 'Asia/Shanghai');
}

function datesAreEqual(date1, date2) {
  const m1 = parseDate(date1);
  const m2 = parseDate(date2);
  if (!m1 || !m2) return false;
  return m1.isSame(m2, 'second');
}

function shouldExcludeCommit(commitMessage) {
  const EXCLUDE_PREFIXES = [
    AUTO_UPDATE_PREFIX, 
    AUTO_UPDATE_CDN_PREFIX, 
    SKIP_UPDATE_PREFIX
  ];
  return EXCLUDE_PREFIXES.some(prefix => commitMessage.startsWith(prefix));
}

function forceUpdateGitDates(filePath, sourceDir, options = {}) {
  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(/^(---\s*\n)([\s\S]*?)(\n---\s*\n)/);
  
  if (!match) {
    throw new Error('No front matter found');
  }
  
  const [, startDelimiter, frontMatterContent, endDelimiter] = match;
  const bodyContent = content.substring(match[0].length);
  
  const dateMatch = frontMatterContent.match(/^date:\s*(.*)$/m);
  const updatedMatch = frontMatterContent.match(/^updated:\s*(.*)$/m);
  
  const oldDate = dateMatch ? String(dateMatch[1]).trim().replace(/['"]/g, '') : null;
  const oldUpdated = updatedMatch ? String(updatedMatch[1]).trim().replace(/['"]/g, '') : null;
  
  const gitCreateDate = getGitCreateDate(filePath, sourceDir);
  
  const authorityUpdateDate = options.isStagedOrModified 
    ? options.currentTime 
    : getGitUpdateDate(filePath, sourceDir);

  if (!gitCreateDate && !authorityUpdateDate) {
    return { hasChanges: false, noGitHistory: true };
  }
  
  let newFrontMatter = frontMatterContent;
  let dateChanged = false;
  let updatedChanged = false;
  let newDate = oldDate;
  let newUpdated = oldUpdated;
  
  if (gitCreateDate && !options.updatedOnly) {
    const gitDateString = gitCreateDate.format('YYYY-MM-DD HH:mm:ss');
    if (!datesAreEqual(gitDateString, oldDate)) {
      newDate = gitDateString;
      newFrontMatter = dateMatch
        ? newFrontMatter.replace(/^date:\s*.*$/m, `date: ${newDate}`)
        : newFrontMatter.trim() + `\ndate: ${newDate}`;
      dateChanged = true;
    }
  }
  
  if (authorityUpdateDate && !options.dateOnly) {
    const gitUpdatedString = authorityUpdateDate.format('YYYY-MM-DD HH:mm:ss');
    if (!datesAreEqual(gitUpdatedString, oldUpdated)) {
      newUpdated = gitUpdatedString;
      newFrontMatter = updatedMatch
        ? newFrontMatter.replace(/^updated:\s*.*$/m, `updated: ${newUpdated}`)
        : newFrontMatter.trim() + `\nupdated: ${newUpdated}`;
      updatedChanged = true;
    }
  }
  
  const hasChanges = dateChanged || updatedChanged;
  if (hasChanges && !options.dryRun) {
    const newContent = startDelimiter + newFrontMatter.trim() + '\n' + endDelimiter + bodyContent;
    fs.writeFileSync(filePath, newContent, 'utf8');
  }
  
  return { hasChanges, dateChanged, updatedChanged, oldDate, oldUpdated, newDate, newUpdated };
}

function getMarkdownFiles(dir) {
  let files = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      files = files.concat(getMarkdownFiles(fullPath));
    } else if (item.isFile() && path.extname(item.name) === '.md') {
      files.push(fullPath);
    }
  }
  return files;
}

function getGitCreateDate(filePath, sourceDir) {
  try {
    const cmd = `git log --follow --format="%ct|%s" -- "${filePath}"`;
    const output = execSync(cmd, { encoding: 'utf8', cwd: sourceDir }).trim();
    if (!output) return null;
    
    const commits = output.split('\n')
      .map(line => {
        const [timestamp, message] = line.split('|');
        return { timestamp: parseInt(timestamp, 10), message: message || '' };
      })
      .filter(c => !shouldExcludeCommit(c.message) && !isNaN(c.timestamp));
    
    if (commits.length === 0) return null;
    
    const firstCommit = commits[commits.length - 1];
    return moment.unix(firstCommit.timestamp).tz('Asia/Shanghai');
  } catch (error) {
    return null;
  }
}

// 获取最近的“真实”更新时间（会过滤掉 AUTO-UPDATE 等自动提交）
function getGitUpdateDate(filePath, sourceDir) {
  try {
    const cmd = `git log --format="%ct|%s" -- "${filePath}"`; // 移除 -1，因为我们要找第一个非自动的
    const output = execSync(cmd, { encoding: 'utf8', cwd: sourceDir }).trim();
    if (!output) return null;

    const commits = output.split('\n')
      .map(line => {
        const [timestamp, message] = line.split('|');
        return { timestamp: parseInt(timestamp, 10), message: message || '' };
      });
      
    // 找到第一个 不是 自动更新的提交
    const realCommit = commits.find(c => !shouldExcludeCommit(c.message) && !isNaN(c.timestamp));

    if (!realCommit) return null;
    
    return moment.unix(realCommit.timestamp).tz('Asia/Shanghai');
  } catch (error) {
    return null;
  }
}

// 新增：获取 git 记录中绝对最后一次提交时间（包括自动更新的）
// 用于对比 mtime
function getRawGitCommitDate(filePath, sourceDir) {
  try {
    // 只取最后一条，不管 message 是什么
    const cmd = `git log -1 --format="%ct" -- "${filePath}"`;
    const output = execSync(cmd, { encoding: 'utf8', cwd: sourceDir }).trim();
    if (!output) return null;
    
    const timestamp = parseInt(output, 10);
    if (isNaN(timestamp)) return null;

    return moment.unix(timestamp).tz('Asia/Shanghai');
  } catch (error) {
    return null;
  }
}

if (require.main === module) {
  main();
}