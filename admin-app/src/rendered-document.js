import DOMPurify from 'dompurify';

export function populateRendered(element, html) {
  element.innerHTML = DOMPurify.sanitize(html, { ADD_ATTR:['target'], FORBID_TAGS:['iframe','form','input','style'] });
  for (const image of element.querySelectorAll('img')) {
    image.loading='lazy'; image.referrerPolicy='no-referrer';
    const src=image.getAttribute('src');
    if (src?.startsWith('/')) image.src=new URL(src,'https://blog.giraffish.top').href;
  }
  for (const link of element.querySelectorAll('a[href]')) {
    if (!link.getAttribute('href').startsWith('#')) { link.target='_blank'; link.rel='noopener noreferrer'; }
  }
}

export class LazyDocument {
  constructor(root) {
    this.root=root;
    this.observer=new IntersectionObserver(entries=>{
      for(const entry of entries) if(entry.isIntersecting) this.mount(entry.target);
    },{root,rootMargin:'800px 0px'});
    this.nodes=[];
  }
  mount(node) {
    if(node.dataset.mounted) return;
    populateRendered(node,node.block.html);
    node.dataset.mounted='true'; node.style.minHeight='';
    this.observer.unobserve(node);
  }
  update(blocks) {
    const top=this.root.scrollTop;
    this.observer.disconnect();
    this.nodes=blocks.map(block=>{
      const node=document.createElement('div');
      node.className='studio-rendered-block'; node.block=block;
      node.dataset.from=String(block.from); node.style.minHeight=`${block.height}px`;
      this.observer.observe(node); return node;
    });
    this.root.replaceChildren(...this.nodes);
    this.root.scrollTop=top;
  }
  jump(position) {
    const node=this.nodes.find(n=>n.block.from<=position&&n.block.to>=position);
    if(node) { this.mount(node); node.scrollIntoView({block:'start'}); }
  }
  jumpAnchor(id) {
    const node=this.nodes.find(n=>n.block.html.includes(`id="${id}"`));
    if(node) { this.mount(node); node.querySelector(`#${CSS.escape(id)}`)?.scrollIntoView({block:'start'}); }
  }
  destroy(){this.observer.disconnect();}
}
