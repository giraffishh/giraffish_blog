import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {MetadataDock} from '../src/metadata-dock.js';

const dom=new JSDOM('<!doctype html><body></body>');
globalThis.window=dom.window;
globalThis.AbortController=dom.window.AbortController;
globalThis.MutationObserver=dom.window.MutationObserver;
globalThis.ResizeObserver=class { observe(){} disconnect(){} };
globalThis.requestAnimationFrame=()=>1;
globalThis.cancelAnimationFrame=()=>{};

function fixture() {
  const form=dom.window.document.createElement('div');
  form.className='ControlPaneContainer';
  form.innerHTML='<div class="ControlContainer"><input value="原始标题"></div><div class="ControlContainer"><div class="writing-studio studio-sidebar-open"><div class="studio-body"><aside><div class="studio-side-nav"></div></aside></div></div></div><div class="ControlContainer"><input type="number" value="3"></div>';
  const root=form.querySelector('.writing-studio');
  const sidebar=form.querySelector('aside');
  sidebar.getBoundingClientRect=()=>({left:16,width:320,bottom:900});
  sidebar.firstChild.getBoundingClientRect=()=>({bottom:160});
  const studio={root,body:root.firstChild,sidebar,activeSide:'outline',
    toggleSidebar(open){root.classList.toggle('studio-sidebar-open',open);this.metadataDock?.sync();},
    showSidebar(tab){this.activeSide=tab;this.metadataDock?.sync();},
  };
  studio.metadataDock=new MetadataDock(studio);
  return {studio,form,root,title:form.querySelector('input'),dock:studio.metadataDock};
}

test('metadata layout retains native controls, values and their React-owned parents',()=>{
  const f=fixture();
  const parent=f.title.parentNode;
  assert.equal(f.form.classList.contains('studio-metadata-visible'),false);
  f.studio.showSidebar('metadata');
  assert.equal(f.form.style.getPropertyValue('--metadata-width'),'320px');
  assert.equal(f.form.style.getPropertyValue('--metadata-height'),'740px');
  f.title.value='编辑后的标题';
  f.studio.showSidebar('images');
  f.studio.showSidebar('metadata');
  assert.equal(f.title.value,'编辑后的标题');
  assert.equal(f.title.parentNode,parent);
  assert.equal(parent.parentNode,f.form);
  f.dock.destroy();
  assert.equal(f.form.classList.contains('studio-metadata-origin'),false);
  assert.equal(f.form.querySelector('input').value,'编辑后的标题');
});

test('new CMS field errors reveal information without recursive layout updates',()=>{
  const f=fixture();
  f.studio.toggleSidebar(false);
  const errors=dom.window.document.createElement('ul');
  errors.className='ControlErrorsList';
  errors.innerHTML='<li>标题不能为空</li>';
  f.title.parentNode.append(errors);
  f.dock.sync();
  assert.equal(f.studio.activeSide,'metadata');
  assert.equal(f.root.classList.contains('studio-sidebar-open'),true);
  assert.equal(f.form.classList.contains('studio-metadata-visible'),true);
  f.dock.destroy();
});

test('layout-only updates skip validation scans while newly added fields are tracked',()=>{
  const f=fixture();
  f.studio.showSidebar('metadata');
  const original=f.title.parentNode.querySelectorAll;
  let scans=0;
  f.title.parentNode.querySelectorAll=function(...args){scans++;return original.apply(this,args);};
  f.dock.sync();
  f.dock.sync();
  assert.equal(scans,0);
  const field=dom.window.document.createElement('div');
  field.innerHTML='<input value="New field">';
  f.form.append(field);
  f.dock.sync();
  assert.equal(scans,1);
  assert.ok(f.dock.fields.includes(field));
  f.dock.destroy();
});
