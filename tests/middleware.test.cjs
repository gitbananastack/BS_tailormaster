const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const { NextRequest } = require('next/server');
const source = ts.transpileModule(fs.readFileSync('middleware.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS }
}).outputText;
const compiled = { exports: {} };
new Function('exports', 'module', 'require', source)(compiled.exports, compiled, require);
const { middleware } = compiled.exports;

test('login redirect keeps the public origin when Next sees localhost behind Nginx', () => {
  const response = middleware(new NextRequest('http://localhost:3000/orders/example', {
    headers: { host: '201.18.219.20' }
  }));
  assert.equal(response.status, 307);
  const location = response.headers.get('location');
  for (const origin of ['http://201.18.219.20', 'https://stitch.example.com']) {
    const target = new URL(location, origin);
    assert.equal(target.origin, origin);
    assert.equal(target.pathname, '/login');
    assert.equal(target.searchParams.get('next'), '/orders/example');
  }
});

test('session cookie continues through middleware', () => {
  const response = middleware(new NextRequest('http://localhost:3000/', {
    headers: { cookie: 'stitchflow_session=existing-session' }
  }));
  assert.equal(response.headers.get('location'), null);
  assert.equal(response.headers.get('x-middleware-next'), '1');
});
