
const fs = require('fs');
const path = 'c:\\Users\\Rigo\\NewHopeGGN\\newhopeggn\\src\\app\\admin\\admin-panel-client.tsx';

const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

// Remove lines 2645 to 2661 (1-indexed)
// 0-indexed: 2644 to 2660
const newLines = lines.slice(0, 2644).concat(lines.slice(2661));

fs.writeFileSync(path, newLines.join('\n'), 'utf8');
console.log('File fixed successfully.');
