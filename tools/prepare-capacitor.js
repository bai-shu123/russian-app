const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const webDir = path.join(projectRoot, 'www');

const webFiles = [
  'index.html',
  'grammar.html',
  'style.css',
  'app.js',
  'auth.js',
  'course.js',
  'data.js',
  'supabase-config.js'
];

fs.rmSync(webDir, { recursive: true, force: true });
fs.mkdirSync(webDir, { recursive: true });

for (const relativeFile of webFiles) {
  const source = path.join(projectRoot, relativeFile);
  const target = path.join(webDir, relativeFile);
  fs.copyFileSync(source, target);
}

fs.cpSync(
  path.join(projectRoot, 'assets'),
  path.join(webDir, 'assets'),
  { recursive: true }
);

console.log(`Prepared ${webFiles.length} web files and assets in ${path.relative(projectRoot, webDir)}/`);
