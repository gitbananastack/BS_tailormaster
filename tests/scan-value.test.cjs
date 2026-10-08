const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const compiled = {exports:{}};
new Function('exports','module',ts.transpileModule(fs.readFileSync('lib/scan-value.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(compiled.exports,compiled);
const {scanQuery}=compiled.exports;
test('printed tracking URLs and manual order numbers resolve correctly',()=>{
 assert.equal(scanQuery(' https://example.com/track/token-123 '),'token=token-123');
 assert.equal(scanQuery(' JOS123 '),'token=JOS123');
});
test('legacy JSON and internal status URLs resolve to the styled result',()=>{
 assert.equal(scanQuery('{"id":"order-123"}'),'id=order-123');
 assert.equal(scanQuery('{"jobOrder":"JOS123"}'),'token=JOS123');
 assert.equal(scanQuery('https://example.com/orders/order-123/status'),'id=order-123');
});
test('blank input is rejected and malformed data never throws a parsing error',()=>{
 assert.throws(()=>scanQuery('  '),/Enter a job-order/);
 assert.equal(scanQuery('null'),'token=null');
 assert.equal(scanQuery('{broken'),'token=%7Bbroken');
});
