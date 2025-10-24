#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * 🔍 MAIN.JS DUPLICATE ANALYSIS SCRIPT
 * Analyzes main.js for duplicates and optimization opportunities
 */

const mainJsPath = path.join(__dirname, '../assets/js/main.js');

function analyzeMainJs() {
  const content = fs.readFileSync(mainJsPath, 'utf8');
  const lines = content.split('\n');
  
  console.log('🔍 MAIN.JS DUPLICATE ANALYSIS\n');
  
  // 1. Variable declarations analysis
  console.log('📊 VARIABLE DECLARATIONS:');
  const variablePatterns = [
    { pattern: /let\s+(\w+)/g, type: 'let' },
    { pattern: /const\s+(\w+)/g, type: 'const' },
    { pattern: /var\s+(\w+)/g, type: 'var' }
  ];
  
  const variables = new Map();
  variablePatterns.forEach(({ pattern, type }) => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const varName = match[1];
      if (!variables.has(varName)) {
        variables.set(varName, []);
      }
      variables.get(varName).push({ type, line: content.substring(0, match.index).split('\n').length });
    }
  });
  
  // Find duplicate variable declarations
  const duplicates = [];
  variables.forEach((declarations, varName) => {
    if (declarations.length > 1) {
      duplicates.push({
        name: varName,
        declarations: declarations,
        count: declarations.length
      });
    }
  });
  
  if (duplicates.length > 0) {
    console.log('❌ DUPLICATE VARIABLES:');
    duplicates.forEach(dup => {
      console.log(`  - ${dup.name}: declared ${dup.count} times`);
      dup.declarations.forEach(decl => {
        console.log(`    Line ${decl.line}: ${decl.type} ${dup.name}`);
      });
    });
  } else {
    console.log('✅ No duplicate variable declarations found');
  }
  
  // 2. Function analysis
  console.log('\n📊 FUNCTION ANALYSIS:');
  const functionPattern = /function\s+(\w+)/g;
  const functions = new Map();
  let match;
  
  while ((match = functionPattern.exec(content)) !== null) {
    const funcName = match[1];
    const line = content.substring(0, match.index).split('\n').length;
    if (!functions.has(funcName)) {
      functions.set(funcName, []);
    }
    functions.get(funcName).push(line);
  }
  
  const duplicateFunctions = [];
  functions.forEach((lines, funcName) => {
    if (lines.length > 1) {
      duplicateFunctions.push({
        name: funcName,
        lines: lines,
        count: lines.length
      });
    }
  });
  
  if (duplicateFunctions.length > 0) {
    console.log('❌ DUPLICATE FUNCTIONS:');
    duplicateFunctions.forEach(func => {
      console.log(`  - ${func.name}: defined ${func.count} times`);
      func.lines.forEach(line => {
        console.log(`    Line ${line}: function ${func.name}`);
      });
    });
  } else {
    console.log('✅ No duplicate function definitions found');
  }
  
  // 3. DOM selector analysis
  console.log('\n📊 DOM SELECTOR ANALYSIS:');
  const domSelectors = [
    { pattern: /document\.getElementById\(['"]([^'"]+)['"]\)/g, type: 'getElementById' },
    { pattern: /document\.querySelector\(['"]([^'"]+)['"]\)/g, type: 'querySelector' },
    { pattern: /domCache\.(\w+)/g, type: 'domCache' }
  ];
  
  const selectors = new Map();
  domSelectors.forEach(({ pattern, type }) => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const selector = match[1];
      if (!selectors.has(selector)) {
        selectors.set(selector, []);
      }
      selectors.get(selector).push({ type, line: content.substring(0, match.index).split('\n').length });
    }
  });
  
  // Find frequently used selectors
  const frequentSelectors = [];
  selectors.forEach((uses, selector) => {
    if (uses.length > 3) {
      frequentSelectors.push({
        selector,
        uses: uses,
        count: uses.length
      });
    }
  });
  
  if (frequentSelectors.length > 0) {
    console.log('⚠️  FREQUENTLY USED SELECTORS (could be cached):');
    frequentSelectors.forEach(sel => {
      console.log(`  - ${sel.selector}: used ${sel.count} times`);
    });
  } else {
    console.log('✅ No frequently used selectors found');
  }
  
  // 4. Code patterns analysis
  console.log('\n📊 CODE PATTERNS ANALYSIS:');
  
  // Check for repeated code blocks
  const repeatedPatterns = [
    { pattern: /if\s*\(\s*!.*\s*\)\s*return;/g, name: 'Early return pattern' },
    { pattern: /try\s*\{[\s\S]*?\}\s*catch/g, name: 'Try-catch blocks' },
    { pattern: /setTimeout\s*\(/g, name: 'setTimeout calls' },
    { pattern: /addEventListener\s*\(/g, name: 'addEventListener calls' }
  ];
  
  repeatedPatterns.forEach(({ pattern, name }) => {
    const matches = content.match(pattern);
    if (matches && matches.length > 5) {
      console.log(`⚠️  ${name}: ${matches.length} occurrences (consider refactoring)`);
    }
  });
  
  // 5. File size analysis
  console.log('\n📊 FILE SIZE ANALYSIS:');
  const fileSize = fs.statSync(mainJsPath).size;
  const lineCount = lines.length;
  console.log(`  - File size: ${(fileSize / 1024).toFixed(2)} KB`);
  console.log(`  - Line count: ${lineCount}`);
  console.log(`  - Average line length: ${(fileSize / lineCount).toFixed(2)} characters`);
  
  if (fileSize > 100 * 1024) { // 100KB
    console.log('⚠️  File is quite large, consider splitting into modules');
  }
  
  // 6. Optimization recommendations
  console.log('\n💡 OPTIMIZATION RECOMMENDATIONS:');
  
  const recommendations = [];
  
  if (duplicates.length > 0) {
    recommendations.push('🔧 Remove duplicate variable declarations');
  }
  
  if (duplicateFunctions.length > 0) {
    recommendations.push('🔧 Remove duplicate function definitions');
  }
  
  if (frequentSelectors.length > 0) {
    recommendations.push('🔧 Cache frequently used DOM selectors');
  }
  
  if (lineCount > 2000) {
    recommendations.push('🔧 Consider splitting into smaller modules');
  }
  
  if (recommendations.length === 0) {
    console.log('✅ No major optimizations needed - file is well structured');
  } else {
    recommendations.forEach(rec => console.log(`  ${rec}`));
  }
  
  console.log('\n🎯 SUMMARY:');
  console.log(`  - Variables: ${variables.size} unique`);
  console.log(`  - Functions: ${functions.size} unique`);
  console.log(`  - DOM selectors: ${selectors.size} unique`);
  console.log(`  - Duplicate variables: ${duplicates.length}`);
  console.log(`  - Duplicate functions: ${duplicateFunctions.length}`);
  console.log(`  - Frequent selectors: ${frequentSelectors.length}`);
}

analyzeMainJs();
