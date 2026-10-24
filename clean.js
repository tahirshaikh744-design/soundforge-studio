const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
  console.log('✓ Cleaned dist directory successfully.');
} else {
  console.log('dist directory does not exist, nothing to clean.');
}
