const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else {
      if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
        results.push(filePath);
      }
    }
  });
  return results;
}

const files = walk('./client/src');
let changedFiles = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const originalContent = content;

  // Replace literal $ before template interpolation e.g. `$${amount}` -> `₹${amount}`
  content = content.replace(/\$\$\{/g, '₹${');

  // Replace $ followed by a number in JSX text or strings e.g. `>$100` -> `>₹100`, `" $100"` -> `" ₹100"`
  // Careful not to replace inside regex or unintended places.
  content = content.replace(/([>"\s])\$(\d+)/g, '$1₹$2');

  // Replace literal $ in some hardcoded strings like: `value: `$0``
  content = content.replace(/`\$(\d+)/g, '`₹$1');

  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    changedFiles++;
    console.log('Updated', file);
  }
});

console.log(`Changed ${changedFiles} files.`);
