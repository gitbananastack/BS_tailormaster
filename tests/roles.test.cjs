const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const source = ts.transpileModule(fs.readFileSync('lib/roles.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const compiled = { exports: {} };
new Function('exports', 'module', source)(compiled.exports, compiled);
const { userRoles, hasRole, hasAnyRole, primaryRole, hasScreenAccess, userScreens, canRespondToLaborCost } = compiled.exports;
test('one login has QC, packing and delivery without management privileges', () => {
  const user = { role: 'QC_INSPECTOR', roles: ['QC_INSPECTOR', 'PACKING_STAFF', 'DELIVERY_COORDINATOR'] };
  for (const role of user.roles) assert.equal(hasRole(user, role), true);
  assert.equal(hasAnyRole(user, ['ADMIN', 'ORDER_MANAGER']), false);
  assert.equal(hasRole(user, 'TAILOR'), false);
});
test('existing single-role accounts preserve access', () => {
  assert.deepEqual(userRoles({ role: 'TAILOR', roles: null }), ['TAILOR']);
});
test('saved roles revoke stale primary access and deduplicate', () => {
  const user = { role: 'ADMIN', roles: ['PACKING_STAFF', 'PACKING_STAFF'] };
  assert.deepEqual(userRoles(user), ['PACKING_STAFF']);
  assert.equal(hasRole(user, 'ADMIN'), false);
});
test('management primary role is consistent regardless of checkbox order', () => {
  assert.equal(primaryRole(['PACKING_STAFF', 'ADMIN']), 'ADMIN');
  assert.equal(primaryRole(['QC_INSPECTOR', 'ORDER_MANAGER']), 'ORDER_MANAGER');
});
test('stage updates require both role and assignment, including secondary roles', () => {
 const { canWorkStage } = compiled.exports;
 const user = { id: 'worker', role: 'QC_INSPECTOR', roles: ['QC_INSPECTOR', 'PACKING_STAFF'] };
 assert.equal(canWorkStage(user, 'PACKING', 'worker'), true);
 assert.equal(canWorkStage(user, 'PACKING', 'other'), false);
 assert.equal(canWorkStage(user, 'DELIVERY', 'worker'), false);
 assert.equal(canWorkStage(user, 'PACKING', null), false);
 assert.equal(canWorkStage({...user, roles:['QC_INSPECTOR']}, 'PACKING', 'worker'), false);
});
test('fusing requires the dedicated fusing operator role and assignment', () => {
 const { canWorkStage } = compiled.exports;
 const fusingOperator = { id: 'fuser', role: 'FUSING_OPERATOR', roles: ['FUSING_OPERATOR'] };
 const cuttingOperator = { id: 'cutter', role: 'CUTTING_OPERATOR', roles: ['CUTTING_OPERATOR'] };
 assert.equal(canWorkStage(fusingOperator, 'FUSING', 'fuser'), true);
 assert.equal(canWorkStage(fusingOperator, 'FUSING', 'other'), false);
 assert.equal(canWorkStage(cuttingOperator, 'FUSING', 'cutter'), false);
});
test('productivity screen access can be granted separately from production roles', () => {
 const tailor = { role: 'TAILOR', roles: ['TAILOR'], screenAccess: ['PRODUCTIVITY'] };
 assert.deepEqual(userScreens(tailor), ['PRODUCTIVITY']);
 assert.equal(hasScreenAccess(tailor, 'PRODUCTIVITY'), true);
 assert.equal(hasScreenAccess({ ...tailor, screenAccess: [] }, 'PRODUCTIVITY'), false);
 assert.equal(hasScreenAccess({ role: 'ORDER_MANAGER', roles: ['ORDER_MANAGER'] }, 'PRODUCTIVITY'), true);
 assert.equal(hasScreenAccess({ role: 'ADMIN', roles: ['ADMIN'] }, 'PRODUCTIVITY'), true);
});
test('admin or manager with tailor role can accept only their own assigned amount', () => {
 const managerTailor = { id: 'manager-tailor', role: 'ORDER_MANAGER', roles: ['ORDER_MANAGER', 'TAILOR'] };
 assert.equal(canRespondToLaborCost(managerTailor, 'manager-tailor'), true);
 assert.equal(canRespondToLaborCost(managerTailor, 'another-tailor'), false);
 assert.equal(canRespondToLaborCost({ ...managerTailor, roles: ['ORDER_MANAGER'] }, 'manager-tailor'), false);
});
