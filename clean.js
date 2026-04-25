const fs = require('fs');
const path = require('path');

function walk(dir) {
  fs.readdirSync(dir).forEach(file => {
    const p = path.join(dir, file);
    if (fs.statSync(p).isDirectory()) {
      walk(p);
    } else if (p.endsWith('.ts') || p.endsWith('.tsx')) {
      let c = fs.readFileSync(p, 'utf8');
      const n = c.replace(/\"https:\/\/discord\.com\/api\/webhooks\/[^\"]+\"/g, '\"\"');
      if (c !== n) {
        fs.writeFileSync(p, n);
        console.log("Cleaned:", p);
      }
    }
  });
}

walk('src/app');
walk('src/lib');
