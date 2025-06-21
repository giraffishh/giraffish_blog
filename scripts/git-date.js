/* global hexo */
'use strict';

const { execSync } = require('child_process');
const moment = require('moment-timezone');
const path = require('path');
const fs = require('fs');

moment.tz.setDefault('Asia/Shanghai');

// 特定的提交消息前缀，用于标记自动更新时间的提交
const AUTO_UPDATE_PREFIX = '[AUTO-UPDATE-TIME]';

hexo.extend.console.register('force-git-dates', 'Force update ALL dates from git history', {
  options: [
    { name: '--dry-run', desc: 'Show what would be updated without making changes' },
    { name: '--date-only', desc: 'Only update date field' },
    { name: '--updated-only', desc: 'Only update updated field' },
    { name: '--no-commit', desc: 'Do not auto-commit after updates' }
  ]
}, function(args) {
  
  const dryRun = args['dry-run'];
  const dateOnly = args['date-only'];
  const updatedOnly = args['updated-only'];
  const noCommit = args['no-commit'];
  
  console.log('🚀 Force updating ALL dates from Git history...');
  console.log(`   Mode: ${dryRun ? 'DRY RUN' : 'ACTUAL UPDATE'}`);
  console.log(`   Scope: ${dateOnly ? 'DATE ONLY' : updatedOnly ? 'UPDATED ONLY' : 'BOTH FIELDS'}`);
  
  const postsDir = path.join(hexo.source_dir, '_posts');
  
  if (!fs.existsSync(postsDir)) {
    console.log('❌ _posts directory not found');
    return;
  }
  
  const files = getMarkdownFiles(postsDir);
  console.log(`📁 Found ${files.length} markdown files\n`);
  
  let processedCount = 0;
  let updatedCount = 0;
  const updatedFiles = [];
  
  files.forEach(file => {
    const relativePath = path.relative(hexo.source_dir, file);
    processedCount++;
    
    console.log(`📄 Processing: ${relativePath}`);
    
    try {
      const result = forceUpdateGitDates(file, { dryRun, dateOnly, updatedOnly });
      
      if (result.hasChanges) {
        updatedCount++;
        updatedFiles.push(relativePath);
        console.log(`✅ ${dryRun ? 'Would update' : 'Updated'} ${relativePath}:`);
        
        if (result.dateChanged) {
          console.log(`   📅 date: "${result.oldDate}" → "${result.newDate}"`);
        }
        if (result.updatedChanged) {
          console.log(`   🔄 updated: "${result.oldUpdated}" → "${result.newUpdated}"`);
        }
      } else {
        console.log(`⚠️  No Git history found for ${relativePath}`);
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${relativePath}: ${error.message}`);
    }
    
    console.log(''); // Empty line for readability
  });
  
  // 自动提交更新的文件
  if (!dryRun && !noCommit && updatedFiles.length > 0) {
    try {
      console.log('🔄 Auto-committing updated files...');
      
      // 添加所有更新的文件到暂存区
      updatedFiles.forEach(file => {
        execSync(`git add "${file}"`, { cwd: hexo.source_dir });
      });
      
      // 提交，使用特定前缀标记
      const commitMessage = `${AUTO_UPDATE_PREFIX} Update timestamps for ${updatedFiles.length} files`;
      execSync(`git commit -m "${commitMessage}"`, { cwd: hexo.source_dir });
      
      console.log(`✅ Auto-committed ${updatedFiles.length} files with message: ${commitMessage}`);
    } catch (error) {
      console.error(`❌ Error auto-committing: ${error.message}`);
    }
  }
  
  console.log(`📊 Summary:`);
  console.log(`   Processed: ${processedCount} files`);
  console.log(`   ${dryRun ? 'Would update' : 'Updated'}: ${updatedCount} files`);
  
  if (dryRun) {
    console.log(`\n💡 This was a dry run. Use 'hexo force-git-dates' to actually update files.`);
  } else {
    console.log(`\n🎉 Done! Run 'hexo clean && hexo generate' to see the changes.`);
  }
});

function forceUpdateGitDates(filePath, options = {}) {
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
  const gitCreateDate = getGitCreateDate(filePath);
  const gitUpdateDate = getGitUpdateDate(filePath);
  
  console.log(`   📋 Current Front-matter:`);
  console.log(`      date: "${oldDate}"`);
  console.log(`      updated: "${oldUpdated}"`);
  console.log(`   🔍 Git history (excluding auto-updates):`);
  console.log(`      Created: ${gitCreateDate ? gitCreateDate.format('YYYY-MM-DD HH:mm:ss') : 'none'}`);
  console.log(`      Updated: ${gitUpdateDate ? gitUpdateDate.format('YYYY-MM-DD HH:mm:ss') : 'none'}`);
  
  if (!gitCreateDate && !gitUpdateDate) {
    return {
      hasChanges: false,
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
  
  // Force update date field
  if (gitCreateDate && !options.updatedOnly) {
    newDate = gitCreateDate.format('YYYY-MM-DD HH:mm:ss');
    
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
  
  // Force update updated field
  if (gitUpdateDate && !options.dateOnly) {
    newUpdated = gitUpdateDate.format('YYYY-MM-DD HH:mm:ss');
    
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
  
  // Write file
  const hasChanges = dateChanged || updatedChanged;
  if (hasChanges && !options.dryRun) {
    const newContent = startDelimiter + newFrontMatter + endDelimiter + bodyContent;
    fs.writeFileSync(filePath, newContent, 'utf8');
  }
  
  return {
    hasChanges,
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

function getGitCreateDate(filePath) {
  try {
    // 排除自动更新时间的提交
    const cmd = `git log --follow --format="%ct|%s" -- "${filePath}"`;
    const output = execSync(cmd, { 
      encoding: 'utf8', 
      timeout: 10000,
      cwd: process.cwd()
    }).trim();
    
    if (!output) return null;
    
    const commits = output.split('\n')
      .map(line => line.trim())
      .filter(line => line)
      .map(line => {
        const [timestamp, message] = line.split('|');
        return { timestamp: parseInt(timestamp, 10), message };
      })
      .filter(commit => !commit.message.startsWith(AUTO_UPDATE_PREFIX) && !isNaN(commit.timestamp));
    
    if (commits.length === 0) return null;
    
    const firstCommit = commits[commits.length - 1];
    return moment.unix(firstCommit.timestamp).tz('Asia/Shanghai');
    
  } catch (error) {
    console.log(`   ⚠️  Git create date error: ${error.message}`);
    return null;
  }
}

function getGitUpdateDate(filePath) {
  try {
    // 排除自动更新时间的提交，获取最新的非自动更新提交
    const cmd = `git log --format="%ct|%s" -- "${filePath}"`;
    const output = execSync(cmd, { 
      encoding: 'utf8', 
      timeout: 10000,
      cwd: process.cwd()
    }).trim();
    
    if (!output) return null;
    
    const commits = output.split('\n')
      .map(line => line.trim())
      .filter(line => line)
      .map(line => {
        const [timestamp, message] = line.split('|');
        return { timestamp: parseInt(timestamp, 10), message };
      })
      .filter(commit => !commit.message.startsWith(AUTO_UPDATE_PREFIX) && !isNaN(commit.timestamp));
    
    if (commits.length === 0) return null;
    
    const latestCommit = commits[0];
    return moment.unix(latestCommit.timestamp).tz('Asia/Shanghai');
    
  } catch (error) {
    console.log(`   ⚠️  Git update date error: ${error.message}`);
    return null;
  }
}