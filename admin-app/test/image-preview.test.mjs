import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createImageThumbnail, imagePreviewUrl} from '../src/image-preview.js';

const dom=new JSDOM('<!doctype html><body></body>',{url:'http://127.0.0.1:4173/admin/'});
globalThis.document=dom.window.document;

test('image thumbnails preserve direct URLs and resolve site-relative images against the blog',()=>{
  const url='https://example.com/image?id=1&signature=a%2Fb';
  assert.equal(imagePreviewUrl(url),url);
  assert.equal(imagePreviewUrl('/img/default.png'),'https://blog.giraffish.top/img/default.png');
  for(const invalid of ['javascript:alert(1)','data:image/svg+xml,x','//example.com/a','https://user:pass@example.com/a']) {
    const card=createImageThumbnail(invalid);
    assert.equal(card.querySelectorAll('a,img').length,0);
  }
  const card=createImageThumbnail(url,'图一');
  assert.equal(card.querySelector('img').getAttribute('src'),url);
  assert.equal(card.querySelector('img').loading,'lazy');
  assert.equal(card.querySelector('img').referrerPolicy,'no-referrer');
  assert.equal(card.querySelector('a').getAttribute('rel'),'noopener noreferrer');
});

test('loaded thumbnails replace the placeholder, and failures can retry without changing the URL',()=>{
  const card=createImageThumbnail('/img/default.png','预览');
  const img=card.querySelector('img');
  const retry=card.querySelector('button');
  assert.equal(card.dataset.state,'loading');
  img.dispatchEvent(new dom.window.Event('error'));
  assert.equal(card.dataset.state,'error');
  assert.equal(retry.hidden,false);
  assert.equal(card.querySelector('a').href,'https://blog.giraffish.top/img/default.png');
  retry.click();
  assert.equal(card.dataset.state,'loading');
  assert.equal(img.src,'https://blog.giraffish.top/img/default.png');
  img.dispatchEvent(new dom.window.Event('load'));
  assert.equal(card.dataset.state,'loaded');
  assert.equal(card.querySelector('.studio-image-placeholder').hidden,true);
  assert.equal(retry.hidden,true);
});
