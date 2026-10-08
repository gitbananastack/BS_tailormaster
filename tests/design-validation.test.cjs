const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const compiled = { exports: {} };
new Function('exports','module','require',ts.transpileModule(fs.readFileSync('lib/order-validation.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(compiled.exports,compiled,require);
const { orderSchema } = compiled.exports;
const item = code => ({itemName:'Shirt',designCode:code,sizeQuantities:[{size:38,quantity:4}]});
const order = {customer:{name:'Test customer'},orderNumber:'TEST',processName:'Cut to Pack',garmentName:'Shirt',items:[item(' D-1 '),item('D-2')],rawMaterials:[{itemName:'Fabric',quantity:20,unit:'m',cost:199.83}]};
test('all design numbers and per-design quantities survive validation',()=>{
 const parsed=orderSchema.parse(order);assert.deepEqual(parsed.items.map(i=>i.designCode),['D-1','D-2']);assert.equal(parsed.items[1].sizeQuantities[0].quantity,4);
 assert.equal(parsed.rawMaterials[0].cost,199.83);
});
test('raw-material cost is non-negative and defaults safely for older requests',()=>{
 assert.equal(orderSchema.parse({...order,rawMaterials:[{itemName:'Thread',quantity:2,unit:'roll'}]}).rawMaterials[0].cost,0);
 assert.equal(orderSchema.safeParse({...order,rawMaterials:[{itemName:'Thread',quantity:2,unit:'roll',cost:-1}]}).success,false);
});
test('every design requires its own number',()=>{
 for(const designCode of ['', '   ',undefined]) assert.equal(orderSchema.safeParse({...order,items:[item('D-1'),item(designCode)]}).success,false);
 assert.equal(orderSchema.safeParse({...order,items:[]}).success,false);
});
