#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * 🧹 MAIN.JS DUPLICATE VARIABLE CLEANER
 * Removes duplicate variable declarations in main.js
 */

const mainJsPath = path.join(__dirname, '../assets/js/main.js');

function cleanDuplicateVariables() {
  let content = fs.readFileSync(mainJsPath, 'utf8');
  const lines = content.split('\n');
  
  console.log('🧹 CLEANING DUPLICATE VARIABLES IN MAIN.JS\n');
  
  // Track variables that have been declared globally
  const globalVariables = new Set();
  const cleanedLines = [];
  let removedCount = 0;
  
  // First pass: identify global variables (outside DOMContentLoaded)
  let insideDOMContentLoaded = false;
  let braceLevel = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Track DOMContentLoaded scope
    if (line.includes('document.addEventListener(\'DOMContentLoaded\'')) {
      insideDOMContentLoaded = true;
    }
    
    // Track brace levels
    braceLevel += (line.match(/\{/g) || []).length;
    braceLevel -= (line.match(/\}/g) || []).length;
    
    // If we're back to level 0 and inside DOMContentLoaded, we're out
    if (insideDOMContentLoaded && braceLevel === 0 && line.includes('});')) {
      insideDOMContentLoaded = false;
    }
    
    // Only process global variables (outside DOMContentLoaded)
    if (!insideDOMContentLoaded) {
      const varMatch = line.match(/^(let|const|var)\s+(\w+)/);
      if (varMatch) {
        const varName = varMatch[2];
        globalVariables.add(varName);
      }
    }
  }
  
  // Second pass: remove duplicate declarations inside DOMContentLoaded
  insideDOMContentLoaded = false;
  braceLevel = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Track DOMContentLoaded scope
    if (line.includes('document.addEventListener(\'DOMContentLoaded\'')) {
      insideDOMContentLoaded = true;
    }
    
    // Track brace levels
    braceLevel += (line.match(/\{/g) || []).length;
    braceLevel -= (line.match(/\}/g) || []).length;
    
    // If we're back to level 0 and inside DOMContentLoaded, we're out
    if (insideDOMContentLoaded && braceLevel === 0 && line.includes('});')) {
      insideDOMContentLoaded = false;
    }
    
    // Check for duplicate variable declarations inside DOMContentLoaded
    if (insideDOMContentLoaded) {
      const varMatch = line.match(/^(let|const|var)\s+(\w+)/);
      if (varMatch) {
        const varName = varMatch[2];
        
        // If this variable is already declared globally, remove this declaration
        if (globalVariables.has(varName)) {
          console.log(`❌ Removing duplicate: ${varMatch[1]} ${varName} (line ${i + 1})`);
          removedCount++;
          continue; // Skip this line
        }
      }
    }
    
    cleanedLines.push(line);
  }
  
  // Write cleaned content
  const cleanedContent = cleanedLines.join('\n');
  fs.writeFileSync(mainJsPath, cleanedContent, 'utf8');
  
  console.log(`\n✅ Cleaned ${removedCount} duplicate variable declarations`);
  console.log(`📊 File size reduced by approximately ${(removedCount * 20)} characters`);
  
  return removedCount;
}

// Run the cleaner
const removedCount = cleanDuplicateVariables();

if (removedCount > 0) {
  console.log('\n🎉 Duplicate variables cleaned successfully!');
} else {
  console.log('\n✅ No duplicate variables found to clean');
}
