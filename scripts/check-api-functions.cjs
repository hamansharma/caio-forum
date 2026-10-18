// Checks that every Vercel function in api/ loads after being compiled the way
// Vercel compiles it: ES-module .js files become CommonJS, .mjs files don't.
// Catches import problems such as ERR_REQUIRE_ESM before they reach production.
// Usage: node scripts/check-api-functions.cjs
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

// Recent Node versions can require() ES modules, but Vercel's function runtime
// can't, so re-run with that ability turned off to match production.
if (!process.execArgv.includes('--no-experimental-require-module')) {
  const result = spawnSync(process.execPath, ['--no-experimental-require-module', __filename], { stdio: 'inherit' });
  process.exit(result.status ?? 1);
}

const babel = require('@babel/core');

const root = path.resolve(__dirname, '..');
const sourceDirs = ['api', 'scripts/lib', 'src/utils', 'src/data']; // code the functions import
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'api-check-'));

const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
  const full = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(full) : [full];
});

for (const dir of sourceDirs) {
  for (const file of walk(path.join(root, dir))) {
    if (!/\.(js|mjs)$/.test(file) || /\.test\.(js|mjs)$/.test(file)) continue;
    const dest = path.join(out, path.relative(root, file));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (file.endsWith('.mjs')) {
      fs.copyFileSync(file, dest);
      continue;
    }
    const { code } = babel.transformFileSync(file, {
      babelrc: false,
      configFile: false,
      plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')],
    });
    fs.writeFileSync(dest, code);
  }
}
fs.writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');
fs.symlinkSync(path.join(root, 'node_modules'), path.join(out, 'node_modules'), 'dir');

// Every file under api/ except shared helpers in api/_lib is a function.
const functions = walk(path.join(out, 'api')).filter(file => file.endsWith('.js') && !file.includes(`${path.sep}_lib${path.sep}`));
let failed = 0;
for (const file of functions) {
  const name = path.relative(out, file);
  try {
    const loaded = require(file);
    if (typeof loaded.default !== 'function') throw new Error('has no default export handler');
    console.log(`ok   ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}: ${error.code || ''} ${error.message.split('\n')[0]}`);
  }
}
fs.rmSync(out, { recursive: true, force: true });
console.log(`\n${functions.length - failed}/${functions.length} API functions load as CommonJS.`);
process.exit(failed ? 1 : 0);
