import test from 'node:test';
import assert from 'node:assert/strict';
import {DocumentAnalysis,markdown,inspectDocument,renderBlocks} from '../src/document.js';

test('analysis parses once, reuses mode switches, and invalidates edited content',()=>{
  const text='# Heading\n\n[link][ref]\n\n![image](https://example.test/a.png)\n\n[ref]: https://example.test/\n';
  const expected={blocks:renderBlocks(text),...inspectDocument(text)};
  const analysis=new DocumentAnalysis();
  const original=markdown.parse;
  let parses=0;
  markdown.parse=function(value,...args){if(value===text)parses++;return original.call(this,value,...args);};
  try {
    assert.equal(analysis.analyze(text,false).blocks,undefined);
    const first=analysis.analyze(text,true);
    assert.deepEqual(first,expected);
    analysis.analyze(text,false);
    assert.equal(analysis.analyze(text,true).blocks,first.blocks);
    assert.equal(parses,1);
    const edited=text.replace('Heading','Changed');
    assert.deepEqual(analysis.analyze(edited),{blocks:renderBlocks(edited),...inspectDocument(edited)});
    assert.notEqual(analysis.analyze(edited).blocks,first.blocks);
  } finally {markdown.parse=original;}
});

test('cached analysis preserves nested Fluid blocks, reference links, and empty documents',()=>{
  const analysis=new DocumentAnalysis();
  for(const text of ['', '{% fold info @Details %}\n## Nested\n\n{% note warning %}\n![image](https://example.test/a.png)\n{% endnote %}\n{% endfold %}\n']) {
    assert.deepEqual(analysis.analyze(text),{blocks:renderBlocks(text),...inspectDocument(text)});
  }
});
