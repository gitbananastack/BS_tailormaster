const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const compiled = { exports: {} };
new Function('exports', 'module', ts.transpileModule(fs.readFileSync('lib/list-filters.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(compiled.exports, compiled);
const { orderFilters, pageNumber, filterValues } = compiled.exports;
test('search combines text, status and stage', () => {
 const filters = orderFilters({q:'  JOS  ',status:'IN_PROGRESS',stage:'PACKING'});
 assert.equal(filters.status,'IN_PROGRESS');
 assert.equal(filters.currentStage,'PACKING');
 assert.ok(filters.OR.some(item => item.items?.some?.designCode?.contains === 'JOS'));
 assert.deepEqual(filters.OR[0], {orderNumber:{contains:'JOS'}});
 assert.deepEqual(filters.OR.find(item => item.customer), {customer:{name:{contains:'JOS'}}});
});
test('invalid enum filters cannot reach the database', () => {
 assert.deepEqual(orderFilters({status:'BAD',stage:'BAD'}),{});
 assert.deepEqual(orderFilters({}),{});
 assert.equal(filterValues({q:'x'.repeat(500)}).q.length,120);
});
test('pagination clamps empty, negative, fractional and excessive pages', () => {
 for(const value of [undefined,'invalid','Infinity','-3','0']) assert.equal(pageNumber(value,15,6),1);
 assert.equal(pageNumber('2.7',15,6),2);
 assert.equal(pageNumber('999',15,6),3);
 assert.equal(pageNumber('2',0,6),1);
});
