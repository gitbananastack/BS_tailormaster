const {test}=require('node:test');const assert=require('node:assert/strict');const ts=require('typescript');const fs=require('node:fs');const compiled={exports:{}};
new Function('exports','module',ts.transpileModule(fs.readFileSync('lib/login-return.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(compiled.exports,compiled);
const {loginReturnPath}=compiled.exports;
test('login returns to the scanned order update section',()=>{assert.equal(loginReturnPath('/orders/abc-123/status#update'),'/orders/abc-123/status#update');});
test('external and malformed destinations cannot redirect after login',()=>{for(const value of ['https://evil.example','//evil.example','/\\evil.example','javascript:alert(1)','/orders/../admin','/orders/abc/status?next=https://evil.example',undefined,['/orders/abc']]) assert.equal(loginReturnPath(value),'/');});
