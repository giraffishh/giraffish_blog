import test from 'node:test';
import assert from 'node:assert/strict';
import { callbackDestination, waitForIdentityLogin } from '../src/identity-callback.js';

test('OAuth landing on the homepage stays same-origin and preserves the fragment', () => {
  const hash = '#access_token=test%2Ftoken&refresh_token=test%2Brefresh&token_type=bearer';
  assert.equal(callbackDestination({pathname:'/',hash}), `/admin/${hash}`);
  assert.equal(callbackDestination({pathname:'/post/example/',hash}), `/admin/${hash}`);
  assert.equal(callbackDestination({pathname:'/admin/',hash}), null);
});
test('email callbacks are handled without hijacking normal page anchors', () => {
  for (const key of ['invite_token','confirmation_token','recovery_token','email_change_token']) {
    assert.equal(callbackDestination({pathname:'/',hash:`#${key}=test`}), `/admin/#${key}=test`);
  }
  for (const hash of ['', '#目录', '#/collections/posts', '#access_token=', '#redirect=https://example.com']) {
    assert.equal(callbackDestination({pathname:'/',hash}), null);
  }
});
test('CMS startup waits for callback login, not an old session init event', async () => {
  const handlers = new Map();
  const identity = {on:(name,fn)=>handlers.set(name,fn),off:name=>handlers.delete(name)};
  let ready = false;
  const pending = waitForIdentityLogin(identity).then(()=>{ready=true;});
  await Promise.resolve();
  assert.equal(ready,false);
  assert.equal(handlers.has('init'),false);
  handlers.get('login')({id:'test-user'});
  await pending;
  assert.equal(ready,true);
  assert.equal(handlers.size,0);
});
test('a recoverable widget error does not prevent a subsequent successful login', async () => {
  const handlers = new Map();
  const identity = {on:(name,fn)=>handlers.set(name,fn),off:name=>handlers.delete(name)};
  let ready = false;
  const pending = waitForIdentityLogin(identity).then(()=>{ready=true;});
  handlers.get('error')?.(new Error('incorrect password'));
  await Promise.resolve();
  assert.equal(ready,false);
  handlers.get('login')({id:'test-user'});
  await pending;
  assert.equal(ready,true);
  assert.equal(handlers.size,0);
});
