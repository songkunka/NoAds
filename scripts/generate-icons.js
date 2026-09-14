// Generate minimal valid PNG icons
const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '..', 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// 1x1 transparent PNG header + blue pixel in base64
// Minimal valid 16x16 / 48x48 PNG
const samplePngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAABMSURBVHgB7dExEQAgDMCwgb+zWA4COig4bV6b3fc+n1kHEFEHEFEHEFEHEFEHEFEHEFEHEFEHEFEHEFEHEFEHEFEHEFEHEFEHEFEHEFEHgJcvKAGUcf/oUAAAAABJRU5ErkJggg==";
const buffer = Buffer.from(samplePngBase64, 'base64');

['icon16.png', 'icon48.png', 'icon128.png'].forEach(filename => {
  fs.writeFileSync(path.join(assetsDir, filename), buffer);
});

console.log('PNG icons written successfully.');
