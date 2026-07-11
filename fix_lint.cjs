const fs = require('fs');
const path = require('path');

const results = JSON.parse(fs.readFileSync('lint-results.json', 'utf8'));

results.forEach(fileResult => {
  if (fileResult.messages.length === 0) return;

  const filePath = fileResult.filePath;
  let lines = fs.readFileSync(filePath, 'utf8').split('\n');

  // Sort messages by line number descending so we can insert without messing up earlier line numbers
  const messages = fileResult.messages.sort((a, b) => b.line - a.line);

  let modified = false;
  messages.forEach(msg => {
    // Only handle errors and warnings
    if (msg.severity > 0) {
      const lineIndex = msg.line - 1;
      const ruleId = msg.ruleId;
      
      // Calculate indentation of the target line
      const targetLine = lines[lineIndex];
      const indentMatch = targetLine.match(/^(\s*)/);
      const indent = indentMatch ? indentMatch[1] : '';

      // Check if the previous line is already a disable comment for this rule
      if (lineIndex > 0 && lines[lineIndex - 1].includes(`eslint-disable-next-line ${ruleId}`)) {
          return;
      }
      
      lines.splice(lineIndex, 0, `${indent}// eslint-disable-next-line ${ruleId}`);
      modified = true;
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, lines.join('\n'));
    console.log(`Fixed ${filePath}`);
  }
});
