const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');

const source = ts.transpileModule(fs.readFileSync('lib/qc-rework.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS }
}).outputText;
const compiled = { exports: {} };
new Function('exports', 'module', source)(compiled.exports, compiled);
const { activeStitchingReworkTailorIds } = compiled.exports;

const inspection = {
  result: 'REWORK_REQUIRED',
  reworkStage: 'STITCHING',
  reworkTailorIds: ['tailor-1', 'tailor-2'],
};

test('stitching rework is restricted to the selected tailors', () => {
  assert.deepEqual(activeStitchingReworkTailorIds('STITCHING', inspection), ['tailor-1', 'tailor-2']);
});

test('completed rework no longer excludes the assigned QC inspector', () => {
  assert.deepEqual(activeStitchingReworkTailorIds('QUALITY_CHECK', inspection), []);
});
