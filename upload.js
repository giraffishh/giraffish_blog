#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');
const moment = require('moment-timezone');
const path = require('path');
const fs = require('fs');

moment.tz.setDefault('Asia/Shanghai');

// 特定的提交消息前缀，用于标记自动更新时间的提交
const AUTO_UPDATE_PREFIX = '[AUTO-UPDATE-TIME]';

// 默认配置
const DEFAULT_CONFIG = {
  postsDir: './source/_posts',  // 默认文章目录
  sourceDir: '.',        // 默认源码目录
  dryRun: false,
  dateOnly: false,
  updatedOnly: false,
  noCommit: false,
  noPush: false  // 默认推送，添加不推送选项
};

function printUsage() {
  console.log(`
Usage: node upload.js [options]

Options:
  --posts-dir <dir>    Posts directory (default: ./source/_posts)
  --source-dir <dir>   Source directory (default: .)
  --dry                Show what would be updated without making changes
  --date-only          Only update date field
  --updated-only       Only update updated field
  --no-commit          Do not auto-commit after updates
  --no-push            Do not push to remote after updating dates (default: push enabled)
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
    const status = execSync('git status --porcelain', { 
      cwd: sourceDir, 
      encoding: 'utf8' 
    }).trim();
    return status;
  } catch (error) {
    throw new Error(`Failed to check git status: ${error.message}`);
  }
}

function parseGitStatus(statusOutput) {
  if (!statusOutput) return [];
  
  return statusOutput.split('\n')
    .map(line => line.trim())
    .filter(line => line)
    .map(line => {
      const status = line.substring(0, 2);
      const filePath = line.substring(3);
      let statusDesc = '';
      
      if (status.includes('M')) statusDesc = 'Modified';
      else if (status.includes('A')) statusDesc = 'Added';
      else if (status.includes('D')) statusDesc = 'Deleted';
      else if (status.includes('R')) statusDesc = 'Renamed';
      else if (status.includes('??')) statusDesc = 'Untracked';
      else statusDesc = 'Changed';
      
      return { status: statusDesc, path: filePath };
    });
}

function commitWorkingChanges(sourceDir) {
  try {
    console.log('📝 Committing existing working directory changes...');
    
    // 获取详细的状态信息
    const statusOutput = checkGitStatus(sourceDir);
    const changedFiles = parseGitStatus(statusOutput);
    
    if (changedFiles.length > 0) {
      console.log('   Files to be committed:');
      changedFiles.forEach(file => {
        console.log(`      ${file.status}: ${file.path}`);
      });
    }
    
    // 添加所有更改到暂存区
    execSync('git add .', { cwd: sourceDir });
    
    // 提交更改，使用简单消息
    execSync('git commit -m "Save working changes before date update"', { cwd: sourceDir });
    
    console.log(`✅ Pre-update commit completed (${changedFiles.length} files)`);
    return true;
  } catch (error) {
    console.error(`❌ Error committing working changes: ${error.message}`);
    return false;
  }
}

function pushToRemote(sourceDir) {
  try {
    console.log('🚀 Pushing to remote repository...');
    
    // 获取当前分支名
    const currentBranch = execSync('git branch --show-current', { 
      cwd: sourceDir, 
      encoding: 'utf8' 
    }).trim();
    
    if (!currentBranch) {
      throw new Error('Could not determine current branch');
    }
    
    // 推送到远端
    execSync(`git push origin ${currentBranch}`, { cwd: sourceDir });
    
    console.log(`✅ Successfully pushed to remote branch: ${currentBranch}`);
    return true;
  } catch (error) {
    console.error(`❌ Error pushing to remote: ${error.message}`);
    console.log('💡 You may need to manually push the changes later');
    return false;
  }
}

function main() {
  const config = parseArgs();
  
  console.log('🚀 Force updating ALL dates from Git history...');
  console.log(`   Mode: ${config.dryRun ? 'DRY RUN' : 'ACTUAL UPDATE'}`);
  console.log(`   Scope: ${config.dateOnly ? 'DATE ONLY' : config.updatedOnly ? 'UPDATED ONLY' : 'BOTH FIELDS'}`);
  console.log(`   Posts directory: ${config.postsDir}`);
  console.log(`   Source directory: ${config.sourceDir}`);
  console.log(`   Auto-commit: ${config.noCommit ? 'DISABLED' : 'ENABLED'}`);
  console.log(`   Push to remote: ${config.noPush ? 'DISABLED' : 'ENABLED'}`);
  
  const postsDir = path.resolve(config.postsDir);
  const sourceDir = path.resolve(config.sourceDir);
  
  if (!fs.existsSync(postsDir)) {
    console.log(`❌ Posts directory not found: ${postsDir}`);
    console.log('💡 Use --posts-dir to specify the correct path');
    return;
  }
  
  // 检查是否在 Git 仓库中
  try {
    execSync('git rev-parse --git-dir', { cwd: sourceDir, stdio: 'ignore' });
  } catch (error) {
    console.log(`❌ Not in a Git repository: ${sourceDir}`);
    console.log('💡 Use --source-dir to specify the correct Git repository path');
    return;
  }
  
  // 如果不是干跑模式，检查工作区状态并提交现有更改
  if (!config.dryRun) {
    const gitStatus = checkGitStatus(sourceDir);
    
    if (gitStatus) {
      console.log('\n📋 Working directory has uncommitted changes');
      
      if (!commitWorkingChanges(sourceDir)) {
        console.log('❌ Failed to commit working changes. Aborting to avoid conflicts.');
        return;
      }
      console.log('');
    } else {
      console.log('✅ Working directory is clean, proceeding...\n');
    }
  }
  
  const files = getMarkdownFiles(postsDir);
  console.log(`📁 Found ${files.length} markdown files\n`);
  
  let processedCount = 0;
  let updatedCount = 0;
  let noChangeCount = 0;
  const updatedFiles = [];
  const dateUpdates = [];
  
  files.forEach(file => {
    const relativePath = path.relative(sourceDir, file);
    processedCount++;
    
    try {
      const result = forceUpdateGitDates(file, sourceDir, { 
        dryRun: config.dryRun, 
        dateOnly: config.dateOnly, 
        updatedOnly: config.updatedOnly 
      });
      
      if (result.hasChanges) {
        updatedCount++;
        updatedFiles.push(relativePath);
        
        console.log(`📄 ${relativePath}`);
        console.log(`   ✅ ${config.dryRun ? 'Would update' : 'Updated'}:`);
        
        if (result.dateChanged) {
          console.log(`      📅 date: "${result.oldDate || 'none'}" → "${result.newDate}"`);
          dateUpdates.push({
            file: relativePath,
            field: 'date',
            oldValue: result.oldDate || 'none',
            newValue: result.newDate
          });
        }
        if (result.updatedChanged) {
          console.log(`      🔄 updated: "${result.oldUpdated || 'none'}" → "${result.newUpdated}"`);
          dateUpdates.push({
            file: relativePath,
            field: 'updated',
            oldValue: result.oldUpdated || 'none',
            newValue: result.newUpdated
          });
        }
        console.log('');
      } else {
        noChangeCount++;
        if (result.noGitHistory) {
          console.log(`📄 ${relativePath} - ⚠️  No Git history`);
        }
        // 对于不需要更新的文件，不显示任何信息以保持简洁
      }
      
    } catch (error) {
      console.error(`📄 ${relativePath} - ❌ Error: ${error.message}`);
    }
  });
  
  // 显示更新摘要
  if (updatedFiles.length > 0) {
    console.log(`\n📋 Date Updates Summary:`);
    dateUpdates.forEach(update => {
      console.log(`   ${update.file}: ${update.field} = "${update.newValue}"`);
    });
    console.log('');
  }
  
  // 自动提交更新的文件
  if (!config.dryRun && !config.noCommit && updatedFiles.length > 0) {
    try {
      console.log('🔄 Auto-committing updated files...');
      console.log('   Files to be committed:');
      updatedFiles.forEach(file => {
        console.log(`      Modified: ${file}`);
      });
      
      // 添加所有更新的文件到暂存区
      updatedFiles.forEach(file => {
        execSync(`git add "${file}"`, { cwd: sourceDir });
      });
      
      // 提交，使用特定前缀标记
      const commitMessage = `${AUTO_UPDATE_PREFIX} Update timestamps for ${updatedFiles.length} files`;
      execSync(`git commit -m "${commitMessage}"`, { cwd: sourceDir });
      
      console.log(`✅ Auto-committed ${updatedFiles.length} files`);
    } catch (error) {
      console.error(`❌ Error auto-committing: ${error.message}`);
    }
  }
  
  // 推送到远端（默认启用，除非指定 --no-push）
  if (!config.dryRun && !config.noPush && !config.noCommit && updatedFiles.length > 0) {
    console.log('');
    pushToRemote(sourceDir);
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Processed: ${processedCount} files`);
  console.log(`   ${config.dryRun ? 'Would update' : 'Updated'}: ${updatedCount} files`);
  console.log(`   No changes needed: ${noChangeCount} files`);
  
  if (config.dryRun) {
    console.log(`\n💡 This was a dry run. Run without --dry to actually update files.`);
  } else {
    console.log(`\n🎉 Done! You may need to regenerate your site to see the changes.`);
    if (!config.noPush && !config.noCommit && updatedFiles.length > 0) {
      console.log(`📡 Changes have been pushed to remote repository.`);
    } else if (config.noPush) {
      console.log(`💡 Changes were not pushed (--no-push specified).`);
    } else if (config.noCommit) {
      console.log(`💡 Changes were not committed or pushed (--no-commit specified).`);
    } else if (updatedFiles.length === 0) {
      console.log(`💡 No files were updated, so nothing to push.`);
    }
  }
}

// 辅助函数：将日期字符串转换为moment对象进行比较
function parseDate(dateStr) {
  if (!dateStr) return null;
  
  // 尝试多种可能的日期格式
  const formats = [
    'YYYY-MM-DD HH:mm:ss',
    'YYYY-MM-DD HH:mm',
    'YYYY-MM-DD',
    moment.ISO_8601
  ];
  
  for (const format of formats) {
    const parsed = moment.tz(dateStr, format, 'Asia/Shanghai');
    if (parsed.isValid()) {
      return parsed;
    }
  }
  
  return null;
}

// 辅助函数：比较两个日期是否相同（精确到秒）
function datesAreEqual(date1, date2) {
  const parsed1 = parseDate(date1);
  const parsed2 = parseDate(date2);
  
  if (!parsed1 || !parsed2) return false;
  
  // 比较到秒级别
  return parsed1.format('YYYY-MM-DD HH:mm:ss') === parsed2.format('YYYY-MM-DD HH:mm:ss');
}

function forceUpdateGitDates(filePath, sourceDir, options = {}) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Parse Front Matter
  const frontMatterRegex = /^(---\s*\n)([\s\S]*?)(\n---\s*\n)([\s\S]*)$/;
  const match = content.match(frontMatterRegex);
  
  if (!match) {
    throw new Error('No front matter found');
  }
  
  const [, startDelimiter, frontMatterContent, endDelimiter, bodyContent] = match;
  
  // Parse existing dates
  const dateMatch = frontMatterContent.match(/^date:\s*(.*)$/m);
  const updatedMatch = frontMatterContent.match(/^updated:\s*(.*)$/m);
  
  const oldDate = dateMatch ? dateMatch[1].trim().replace(/['"]/g, '') : null;
  const oldUpdated = updatedMatch ? updatedMatch[1].trim().replace(/['"]/g, '') : null;
  
  // Get Git times (excluding auto-update commits)
  const gitCreateDate = getGitCreateDate(filePath, sourceDir);
  const gitUpdateDate = getGitUpdateDate(filePath, sourceDir);
  
  if (!gitCreateDate && !gitUpdateDate) {
    return {
      hasChanges: false,
      noGitHistory: true,
      dateChanged: false,
      updatedChanged: false,
      oldDate,
      oldUpdated,
      newDate: oldDate,
      newUpdated: oldUpdated
    };
  }
  
  let newFrontMatter = frontMatterContent;
  let dateChanged = false;
  let updatedChanged = false;
  let newDate = oldDate;
  let newUpdated = oldUpdated;
  
  // 检查并更新 date 字段
  if (gitCreateDate && !options.updatedOnly) {
    const gitDateString = gitCreateDate.format('YYYY-MM-DD HH:mm:ss');
    
    if (!datesAreEqual(gitDateString, oldDate)) {
      newDate = gitDateString;
      
      if (dateMatch) {
        newFrontMatter = newFrontMatter.replace(/^date:\s*.*$/m, `date: ${newDate}`);
      } else {
        // Add after abbrlink if exists, otherwise at the end
        const abbrRegex = /^(abbrlink:\s*.*)$/m;
        if (abbrRegex.test(newFrontMatter)) {
          newFrontMatter = newFrontMatter.replace(abbrRegex, `$1\ndate: ${newDate}`);
        } else {
          newFrontMatter += `\ndate: ${newDate}`;
        }
      }
      dateChanged = true;
    }
  }
  
  // 检查并更新 updated 字段
  if (gitUpdateDate && !options.dateOnly) {
    const gitUpdatedString = gitUpdateDate.format('YYYY-MM-DD HH:mm:ss');
    
    if (!datesAreEqual(gitUpdatedString, oldUpdated)) {
      newUpdated = gitUpdatedString;
      
      if (updatedMatch) {
        newFrontMatter = newFrontMatter.replace(/^updated:\s*.*$/m, `updated: ${newUpdated}`);
      } else {
        // Add after date if exists, otherwise at the end
        const dateRegex = /^(date:\s*.*)$/m;
        if (dateRegex.test(newFrontMatter)) {
          newFrontMatter = newFrontMatter.replace(dateRegex, `$1\nupdated: ${newUpdated}`);
        } else {
          newFrontMatter += `\nupdated: ${newUpdated}`;
        }
      }
      updatedChanged = true;
    }
  }
  
  // Write file
  const hasChanges = dateChanged || updatedChanged;
  if (hasChanges && !options.dryRun) {
    const newContent = startDelimiter + newFrontMatter + endDelimiter + bodyContent;
    fs.writeFileSync(filePath, newContent, 'utf8');
  }
  
  return {
    hasChanges,
    noGitHistory: false,
    dateChanged,
    updatedChanged,
    oldDate,
    oldUpdated,
    newDate,
    newUpdated
  };
}

function getMarkdownFiles(dir) {
  const files = [];
  
  function scanDir(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    items.forEach(item => {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDir(fullPath);
      } else if (path.extname(item) === '.md') {
        files.push(fullPath);
      }
    });
  }
  
  scanDir(dir);
  return files;
}

function getGitCreateDate(filePath, sourceDir) {
  try {
    // 只排除自动更新时间的提交
    const cmd = `git log --follow --format="%ct|%s" -- "${filePath}"`;
    const output = execSync(cmd, { 
      encoding: 'utf8', 
      timeout: 10000,
      cwd: sourceDir
    }).trim();
    
    if (!output) return null;
    
    const commits = output.split('\n')
      .map(line => line.trim())
      .filter(line => line)
      .map(line => {
        const [timestamp, message] = line.split('|');
        return { timestamp: parseInt(timestamp, 10), message: message || '' };
      })
      .filter(commit => 
        !commit.message.startsWith(AUTO_UPDATE_PREFIX) && 
        !isNaN(commit.timestamp)
      );
    
    if (commits.length === 0) return null;
    
    const firstCommit = commits[commits.length - 1];
    return moment.unix(firstCommit.timestamp).tz('Asia/Shanghai');
    
  } catch (error) {
    console.log(`   ⚠️  Git create date error: ${error.message}`);
    return null;
  }
}

function getGitUpdateDate(filePath, sourceDir) {
  try {
    // 只排除自动更新时间的提交，获取最新的非自动更新提交
    const cmd = `git log --format="%ct|%s" -- "${filePath}"`;
    const output = execSync(cmd, { 
      encoding: 'utf8', 
      timeout: 10000,
      cwd: sourceDir
    }).trim();
    
    if (!output) return null;
    
    const commits = output.split('\n')
      .map(line => line.trim())
      .filter(line => line)
      .map(line => {
        const [timestamp, message] = line.split('|');
        return { timestamp: parseInt(timestamp, 10), message: message || '' };
      })
      .filter(commit => 
        !commit.message.startsWith(AUTO_UPDATE_PREFIX) && 
        !isNaN(commit.timestamp)
      );
    
    if (commits.length === 0) return null;
    
    const latestCommit = commits[0];
    return moment.unix(latestCommit.timestamp).tz('Asia/Shanghai');
    
  } catch (error) {
    console.log(`   ⚠️  Git update date error: ${error.message}`);
    return null;
  }
}

// 如果是直接运行此脚本（而不是被 require）
if (require.main === module) {
  main();
}

module.exports = {
  main,
  forceUpdateGitDates,
  getMarkdownFiles,
  getGitCreateDate,
  getGitUpdateDate,
  checkGitStatus,
  commitWorkingChanges,
  pushToRemote
};