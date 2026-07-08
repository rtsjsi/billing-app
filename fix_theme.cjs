const fs = require('fs');
const path = require('path');

const pagesDir = path.join('d:', 'myProjects', 'billing-app', 'frontend', 'src', 'pages');

// These replacements transform any remaining dark-mode classes into proper light-mode equivalents.
// Order matters — more specific patterns must come before general ones.
const replacements = [
  // === BACKGROUNDS ===
  ['bg-slate-950/80', 'bg-black/40'],
  ['bg-slate-950/20', 'bg-slate-50'],
  ['bg-slate-950/30', 'bg-slate-50'],
  ['bg-slate-950/10', 'bg-slate-50'],
  ['bg-slate-950', 'bg-slate-100'],
  ['bg-slate-900/90', 'bg-white'],
  ['bg-slate-900/80', 'bg-slate-50'],
  ['bg-slate-900/50', 'bg-white'],
  ['bg-slate-900/30', 'bg-slate-50'],
  ['bg-slate-900', 'bg-white'],
  ['bg-slate-850', 'bg-white'],
  ['bg-slate-800/40', 'bg-slate-50'],
  ['bg-slate-800/20', 'bg-slate-50'],
  ['bg-slate-800', 'bg-slate-50'],

  // === HOVER BACKGROUNDS ===
  ['hover:bg-slate-900/80', 'hover:bg-slate-100'],
  ['hover:bg-slate-900', 'hover:bg-slate-100'],
  ['hover:bg-slate-800/40', 'hover:bg-slate-50'],
  ['hover:bg-slate-800/20', 'hover:bg-slate-50'],
  ['hover:bg-slate-800', 'hover:bg-slate-100'],

  // === BORDERS ===
  ['border-slate-800/80', 'border-slate-200'],
  ['border-slate-800/60', 'border-slate-200'],
  ['border-slate-800/50', 'border-slate-200'],
  ['border-slate-800/30', 'border-slate-100'],
  ['border-slate-800', 'border-slate-200'],
  ['border-slate-700', 'border-slate-300'],
  ['hover:border-slate-700', 'hover:border-slate-400'],
  ['hover:border-slate-600', 'hover:border-slate-400'],

  // === DIVIDERS ===
  ['divide-slate-800/60', 'divide-slate-200'],
  ['divide-slate-800/30', 'divide-slate-100'],
  ['divide-slate-800', 'divide-slate-200'],

  // === TEXT COLORS (brightest to dimmest) ===
  // White text → near-black for headings/values
  ['text-white', 'text-slate-900'],
  // Light grays → proper readable text
  ['text-slate-200', 'text-slate-800'],
  ['text-slate-300', 'text-slate-700'],
  ['text-slate-100', 'text-slate-800'],

  // === HOVER TEXT ===
  ['hover:text-white', 'hover:text-slate-900'],
  ['hover:text-slate-300', 'hover:text-slate-700'],

  // === ICON/ACCENT TWEAKS (for light bg) ===
  ['text-sky-400', 'text-blue-600'],
  ['text-sky-300', 'text-blue-500'],
  ['hover:text-sky-300', 'hover:text-blue-500'],
  ['hover:text-sky-400', 'hover:text-blue-600'],
  ['bg-sky-500/10', 'bg-blue-100'],
  ['bg-sky-500/20', 'bg-blue-100'],
  ['bg-indigo-500/10', 'bg-indigo-100'],
  ['bg-violet-500/10', 'bg-violet-100'],
  ['bg-emerald-500/10', 'bg-emerald-100'],
  ['bg-amber-500/10', 'bg-amber-100'],
  ['bg-red-500/10', 'bg-red-100'],
  ['text-indigo-400', 'text-indigo-600'],
  ['text-violet-400', 'text-violet-600'],
  ['text-emerald-400', 'text-emerald-600'],
  ['text-amber-400', 'text-amber-600'],
  ['text-red-400', 'text-red-600'],
  ['text-red-500/80', 'text-red-500'],
  ['text-red-200', 'text-red-600'],
  ['text-red-350', 'text-red-600'],
  ['text-red-300', 'text-red-600'],
  ['text-emerald-350', 'text-emerald-600'],
  ['text-emerald-300', 'text-emerald-600'],

  // === GRADIENT BUTTON (keep sky→indigo but ensure text-white is NOT replaced on these) ===
  // We handle this by restoring text-white in gradient buttons after all replacements.

  // === MISC ===
  ['bg-slate-100 text-slate-700 border border-slate-200', 'bg-slate-100 text-slate-700 border border-slate-200'],  // keep GSTIN badges as-is
];

// These are patterns we want to RESTORE after the global replacement.
// If a line has a gradient button, re-set text-slate-900 back to text-white.
function postProcess(content) {
  // Lines with gradient buttons should use text-white, not text-slate-900
  content = content.replace(
    /from-sky-500 to-indigo-500([^"]*?)text-slate-900/g,
    'from-sky-500 to-indigo-500$1text-white'
  );
  content = content.replace(
    /from-emerald-500 to-teal-500([^"]*?)text-slate-900/g,
    'from-emerald-500 to-teal-500$1text-white'
  );
  content = content.replace(
    /bg-sky-500 hover:bg-sky-600 text-slate-900/g,
    'bg-sky-500 hover:bg-sky-600 text-white'
  );
  content = content.replace(
    /bg-emerald-500 hover:bg-emerald-600([^"]*?)text-slate-900/g,
    'bg-emerald-500 hover:bg-emerald-600$1text-white'
  );
  content = content.replace(
    /bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-900/g,
    'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white'
  );
  return content;
}

function processFile(filepath) {
  let content = fs.readFileSync(filepath, 'utf-8');

  for (const [from, to] of replacements) {
    content = content.split(from).join(to);
  }

  content = postProcess(content);

  fs.writeFileSync(filepath, content, 'utf-8');
  console.log(`  ✓ ${path.basename(filepath)}`);
}

console.log('Fixing page files...');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx'));
for (const file of files) {
  processFile(path.join(pagesDir, file));
}

// Also fix App.tsx
const appFile = path.join('d:', 'myProjects', 'billing-app', 'frontend', 'src', 'App.tsx');
let appContent = fs.readFileSync(appFile, 'utf-8');
appContent = appContent.replace('bg-slate-950', 'bg-slate-100');
appContent = appContent.replace('text-slate-400', 'text-slate-500');
fs.writeFileSync(appFile, appContent, 'utf-8');
console.log('  ✓ App.tsx');

console.log('\nDone! All files converted to light theme.');
