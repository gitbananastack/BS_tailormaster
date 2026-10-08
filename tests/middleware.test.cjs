const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const { NextRequest } = require('next/server');
const source = ts.transpileModule(fs.readFileSync('middleware.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS }
}).outputText;
const compiled = { exports: {} };
const urlSource = ts.transpileModule(fs.readFileSync('lib/app-url.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS }
}).outputText;
const urlModule = { exports: {} };
new Function('exports', 'module', urlSource)(urlModule.exports, urlModule);
new Function('exports', 'module', 'require', source)(compiled.exports, compiled,
  name => name === './lib/app-url' ? urlModule.exports : require(name));
const { middleware } = compiled.exports;

test('login redirect is absolute and uses the public origin behind Nginx', () => {
  const saved = process.env.APP_URL;
  delete process.env.APP_URL;
  try {
    for (const origin of ['http://201.18.219.20', 'https://stitch.example.com']) {
      const publicUrl = new URL(origin);
      const response = middleware(new NextRequest('http://localhost:3000/orders/example', {
        headers: { host: publicUrl.host, 'x-forwarded-proto': publicUrl.protocol.slice(0, -1) }
      }));
      assert.equal(response.status, 307);
      // No base argument: this fails for the relative URL rejected by Next's adapter.
      const target = new URL(response.headers.get('location'));
      assert.equal(target.origin, origin);
      assert.equal(target.pathname, '/login');
      assert.equal(target.searchParams.get('next'), '/orders/example');
    }
  } finally {
    if (saved === undefined) delete process.env.APP_URL; else process.env.APP_URL = saved;
  }
});

test('session cookie continues through middleware', () => {
  const response = middleware(new NextRequest('http://localhost:3000/', {
    headers: { cookie: 'stitchflow_session=existing-session' }
  }));
  assert.equal(response.headers.get('location'), null);
  assert.equal(response.headers.get('x-middleware-next'), '1');
});
