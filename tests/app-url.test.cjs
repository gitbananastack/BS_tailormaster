const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const source = ts.transpileModule(fs.readFileSync('lib/app-url.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const compiled = { exports: {} };
new Function('exports', 'module', source)(compiled.exports, compiled);
const { appBaseUrl } = compiled.exports;
const headers = values => ({ get: name => values[name] || null });

test('configured public domain is used in QR links', () => {
  const previousUrl = process.env.APP_URL;
  process.env.APP_URL = 'https://stitching.example.com/';
  assert.equal(appBaseUrl(headers({ host: '10.0.0.8:3000' })), 'https://stitching.example.com');
  if (previousUrl === undefined) delete process.env.APP_URL; else process.env.APP_URL = previousUrl;
});

test('hosted domain replaces a private configured IP in production', () => {
  const previousUrl = process.env.APP_URL;
  const previousEnvironment = process.env.NODE_ENV;
  process.env.APP_URL = 'http://10.132.222.101:3000';
  process.env.NODE_ENV = 'production';
  assert.equal(appBaseUrl(headers({ 'x-forwarded-host': 'orders.example.com', 'x-forwarded-proto': 'https' })), 'https://orders.example.com');
  if (previousUrl === undefined) delete process.env.APP_URL; else process.env.APP_URL = previousUrl;
  if (previousEnvironment === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousEnvironment;
});
