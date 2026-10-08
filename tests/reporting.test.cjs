const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const source = ts.transpileModule(fs.readFileSync('lib/reporting.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const compiled = { exports: {} };
new Function('exports', 'module', source)(compiled.exports, compiled);
const { monthRange, reportRange, reportQuery, percentChange } = compiled.exports;

test('current and previous report months use exact calendar boundaries', () => {
  const now = new Date(2026, 9, 15, 12);
  const current = monthRange(0, now);
  const previous = monthRange(-1, now);
  assert.equal(current.from.toISOString(), new Date(2026, 9, 1).toISOString());
  assert.equal(current.to.toISOString(), new Date(2026, 10, 1).toISOString());
  assert.equal(previous.from.toISOString(), new Date(2026, 8, 1).toISOString());
  assert.equal(previous.to.toISOString(), new Date(2026, 9, 1).toISOString());
});

test('custom report includes the complete final day and survives export query', () => {
  const range = reportRange({ period: 'custom', from: '2026-08-10', to: '2026-08-22' }, new Date(2026, 9, 1));
  assert.equal(range.period, 'custom');
  assert.equal(range.from.getDate(), 10);
  assert.equal(range.to.getDate(), 23);
  assert.equal(reportQuery(range), 'period=custom&from=2026-08-10&to=2026-08-22');
});

test('invalid custom dates safely fall back to the current month', () => {
  assert.equal(reportRange({ period: 'custom', from: 'bad', to: '2026-08-22' }, new Date(2026, 9, 1)).period, 'current');
  assert.equal(percentChange(10, 0), 100);
  assert.equal(percentChange(0, 0), 0);
});
