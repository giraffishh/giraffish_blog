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
const SKIP_UPDATE_PREFIX = '[SKIP]'; // 新增的、用于跳过更新的前缀

// 默认配置
const DEFAULT_CONFIG = {
  postsDir: './source/_posts',  // 默认文章目录
  sourceDir: '.',        // 默认源码目录
  dryRun: false,
  dateOnly: false,
  updatedOnly: false,
  noCommit: false,
  noPush: false,
  message: '' // 新增: 用于存储提交信息
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
  --help               Show this help message

Examples:
  # 自动生成提交信息并提交
  node upload.js

  # 使用自定义提交信息
  node upload.js -m "refactor: 重构文章结构"

  # 仅预览日期更新，不实际修改文件或提交
  node upload.js --dry
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

function main() {
  const config = parseArgs();
  
  console.log('🚀 Updating article timestamps based on Git history and current changes...');
  console.log(`   Mode: ${config.dryRun ? 'DRY RUN' : 'ACTUAL UPDATE'}`);
  console.log(`   Scope: ${config.dateOnly ? 'DATE ONLY' : config.updatedOnly ? 'UPDATED ONLY' : 'BOTH FIELDS'}`);
  
  const postsDir = path.resolve(config.postsDir);
  const sourceDir = path.resolve(config.sourceDir);
  
  if (!fs.existsSync(postsDir)) {
    console.log(`❌ Posts directory not found: ${postsDir}`);
    return;
  }
  
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

  const allMarkdownFiles = getMarkdownFiles(postsDir);
  console.log(`\n📁 Found ${allMarkdownFiles.length} markdown files to process.`);
  
  let updatedCount = 0;
  
  allMarkdownFiles.forEach(file => {
    try {
      const isStagedOrModified = userChangedFilesSet.has(file);
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

  console.log(`\n🎉 Done!`);
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

function getGitUpdateDate(filePath, sourceDir) {
  try {
    const cmd = `git log -1 --format="%ct|%s" -- "${filePath}"`;
    const output = execSync(cmd, { encoding: 'utf8', cwd: sourceDir }).trim();
    if (!output) return null;

    const commits = output.split('\n')
      .map(line => {
        const [timestamp, message] = line.split('|');
        return { timestamp: parseInt(timestamp, 10), message: message || '' };
      })
      .filter(c => !shouldExcludeCommit(c.message) && !isNaN(c.timestamp));

    if (commits.length === 0) return null;
    
    return moment.unix(commits[0].timestamp).tz('Asia/Shanghai');
  } catch (error) {
    return null;
  }
}

if (require.main === module) {
  main();
}

