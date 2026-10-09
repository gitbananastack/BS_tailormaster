const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');

const source = ts.transpileModule(fs.readFileSync('lib/status-transition.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS }
}).outputText;
const compiled = { exports: {} };
new Function('exports', 'module', source)(compiled.exports, compiled);
const { firstStageUpdateAllowed, handoffState } = compiled.exports;

test('a new stage must start in progress before another status is accepted', () => {
  assert.equal(firstStageUpdateAllowed(false, 'IN_PROGRESS'), true);
  assert.equal(firstStageUpdateAllowed(false, 'COMPLETED'), false);
  assert.equal(firstStageUpdateAllowed(false, 'ON_HOLD'), false);
  assert.equal(firstStageUpdateAllowed(true, 'COMPLETED'), true);
});

test('handoff starts the next stage ready and does not copy the previous ETA', () => {
  const previousEta = new Date('2026-10-09T12:30:00Z');
  assert.deepEqual(handoffState('FUSING', 'COMPLETED', previousEta), {
    status: 'CREATED',
    currentStage: 'FUSING',
    estimatedCompletion: null,
  });
});

test('an update within the current stage retains its submitted status and ETA', () => {
  const eta = new Date('2026-10-09T12:30:00Z');
  assert.deepEqual(handoffState(null, 'IN_PROGRESS', eta), {
    status: 'IN_PROGRESS',
    currentStage: null,
    estimatedCompletion: eta,
  });
});
