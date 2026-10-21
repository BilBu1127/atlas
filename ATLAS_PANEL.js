/* One reading-panel interaction system. Presentation only; PACK is never written. */
(function(root){
'use strict';
const states=new WeakMap(),panels=new Set(),esc=s=>ATLAS_UX.escaped(s);
const mobile=()=>innerWidth<=900;
const views=[['CONSOLE','콘솔'],['GRAPH','관계망'],['FLOW','흐름'],['MAP','히트맵']];
function state(panel){if(!states.has(panel))states.set(panel,{open:false,modal:false,outside:new Map(),opener:null,overflow:'',y:0});return states.get(panel)}
function isolate(panel,on){
 const s=state(panel);
 if(on){
  s.overflow=document.documentElement.style.overflow;s.y=scrollY;
  for(let branch=panel;branch&&branch!==document.body;branch=branch.parentElement){
   for(const e of branch.parentElement?.children||[]){if(e===branch||s.outside.has(e))continue;
    s.outside.set(e,{inert:!!e.inert,attribute:e.hasAttribute('inert'),hidden:e.getAttribute('aria-hidden')});
    e.inert=true;e.setAttribute('inert','');if(e instanceof SVGElement)e.setAttribute('aria-hidden','true');
   }
  }
  document.documentElement.style.overflow='hidden';
 }else{
  for(const [e,old] of s.outside){e.inert=old.inert;e.toggleAttribute('inert',old.attribute);if(e instanceof SVGElement){if(old.hidden===null)e.removeAttribute('aria-hidden');else e.setAttribute('aria-hidden',old.hidden)}}
  s.outside.clear();document.documentElement.style.overflow=s.overflow;scrollTo({top:s.y,behavior:'instant'});
 }
}
function syncViewLinks(view,key,context){for(const a of document.querySelectorAll('a[href]')){if(a.closest('.atlas-panel,.atlas-reading,.cards,.theme')||a.dataset.atlasNode||a.dataset.atlasCompany)continue;const m=(a.dataset.panelViewLink||a.getAttribute('href')||'').match(/(?:ATLAS_)?(CONSOLE|GRAPH|FLOW|MAP)(?:\.html)?(?:#.*)?$/);if(!m)continue;a.dataset.panelViewLink=m[1];a.href=destination(m[1],key,context)}}
function setOpen(panel,open){
 if(!panel)return;const s=state(panel),wasOpen=s.open,modal=!!open&&mobile();
 if(open&&!s.open)s.opener=document.activeElement;
 if(s.modal&&!modal)isolate(panel,false);
 if(!s.modal&&modal)isolate(panel,true);
 s.open=!!open;s.modal=modal;panel.classList.toggle('atlas-panel-active',!!open);panel.inert=!open;
 panel.setAttribute('aria-hidden',String(!open));panel.setAttribute('role',modal?'dialog':'region');
 if(modal)panel.setAttribute('aria-modal','true');else panel.removeAttribute('aria-modal');
 document.body.classList.toggle('atlas-reading-open',!!open);document.body.classList.toggle('atlas-reading-mobile',modal);
 syncViewLinks(panel.dataset.panelView,open?s.key:null,s.context);
 for(const [v] of views)document.body.classList.toggle('atlas-reading-'+v.toLowerCase(),!!open&&panel.dataset.panelView===v);
 if(!open&&wasOpen){const fallback=panel.dataset.panelView==='FLOW'?document.querySelector('#q'):panel.dataset.panelView==='GRAPH'?document.querySelector('#graphQuery'):panel.dataset.panelView==='CONSOLE'?document.querySelector('.obj.sel,.obj'):document.getElementById(s.key?.split('::')[0]);const target=s.opener?.isConnected&&!panel.contains(s.opener)&&s.opener!==document.body&&!s.opener.closest('[inert]')?s.opener:fallback;target?.focus({preventScroll:true})}
 if(open&&!panel.contains(document.activeElement))panel.querySelector('.atlas-panel-close')?.focus({preventScroll:true});
}
function destination(view,key,context){
 let id=key||'';
 if(id.startsWith('C::'))id=context+'::'+id.slice(3);
 return './ATLAS_'+view+'.html'+(id?'#'+encodeURIComponent(id):'');
}
function attach({panel,head,body,view,key,context,pack,onPick,onClose}){
 panel.classList.add('atlas-panel');panel.dataset.panelView=view;head.classList.add('atlas-panel-head');body.classList.add('atlas-panel-body');
 const s=state(panel),changed=s.key!==key;s.onClose=onClose;s.onPick=onPick;s.key=key;s.context=context;s.pack=pack;
 if(!head.querySelector('.atlas-panel-row')){
  const title=head.querySelector('h2,#ititle,.dttl,[data-panel-title]');
  const meta=head.querySelector('.meta,#isub,.deyebrow,[data-panel-meta]');
  const eyebrow=head.querySelector('#ieyebrow');if(eyebrow)eyebrow.classList.add('atlas-panel-legacy-eyebrow');
  const back=head.querySelector('.atlas-back')||Object.assign(document.createElement('button'),{className:'atlas-back',type:'button',onclick:()=>history.back()});
  back.innerHTML='<span aria-hidden="true">←</span><small>이전</small>';back.setAttribute('aria-label','이전 항목');back.title='이전 항목';
  const close=head.querySelector('.x,#graphClose,.dclose,.atlas-panel-close')||Object.assign(document.createElement('button'),{type:'button',onclick:onClose});
  close.classList.add('atlas-panel-close');close.innerHTML='<span aria-hidden="true">×</span><small>닫기</small>';close.setAttribute('aria-label','상세 닫기');close.title='상세 닫기 (Esc)';
  const row=document.createElement('div');row.className='atlas-panel-row';const label=document.createElement('div');label.className='atlas-panel-ident';const contextLabel=document.createElement('div');contextLabel.className='atlas-panel-context';label.appendChild(contextLabel);
  if(title){title.classList.add('atlas-panel-title');label.appendChild(title)}if(meta){meta.classList.add('atlas-panel-meta');label.appendChild(meta)}
  const holder=head.querySelector('#graphPanelNav');if(holder){holder.appendChild(back);row.appendChild(holder)}else row.appendChild(back);
  row.append(label,close);head.prepend(row);
  const picker=document.createElement('select');picker.className='atlas-panel-picker';picker.setAttribute('aria-label','다른 산업으로 이동');picker.addEventListener('change',()=>s.onPick?.(picker.value));label.appendChild(picker);
  const mark=document.createElement('span');mark.className='atlas-panel-picker-mark';mark.textContent='산업 변경 ⌄';mark.setAttribute('aria-hidden','true');label.appendChild(mark);
  const tabs=document.createElement('nav');tabs.className='atlas-panel-tabs';tabs.setAttribute('aria-label','같은 항목을 다른 보기에서 열기');head.appendChild(tabs);
 }
 const company=key?.includes('::'),kind=company?'회사':pack.industries.some(i=>i.id===key)?'산업':(pack.themes||[]).some(t=>t.id===key)?'테마':'체인';head.querySelector('.atlas-panel-context').textContent=kind+' ›';
 const picker=head.querySelector('.atlas-panel-picker');picker.setAttribute('aria-label','산업 변경 — 현재 '+head.querySelector('.atlas-panel-title')?.textContent);picker.replaceChildren();
 if(!pack.industries.some(i=>i.id===key)){const o=document.createElement('option');o.value=key;o.textContent=head.querySelector('.atlas-panel-title')?.textContent||key;o.selected=true;picker.appendChild(o)}
 for(const i of pack.industries){const o=document.createElement('option');o.value=i.id;o.textContent=i.name+' · '+i.id;o.selected=i.id===key;picker.appendChild(o)}
 const tabs=head.querySelector('.atlas-panel-tabs');tabs.replaceChildren();for(const [v,label] of views){const a=document.createElement('a');a.href=destination(v,key,context);a.textContent=label;if(v===view)a.setAttribute('aria-current','page');tabs.appendChild(a)}
 if(!panel.dataset.panelKeys){panel.dataset.panelKeys='true';panel.addEventListener('keydown',e=>{
  const st=state(panel);if(!st.open)return;
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();st.onClose?.();return}
  if(st.modal&&e.key==='Tab'){
   const items=[...panel.querySelectorAll('button:not(:disabled),a[href],summary,select,[tabindex="0"]')].filter(e=>e.getClientRects().length&&!e.closest('[inert]'));
   if(e.shiftKey&&(document.activeElement===items[0]||document.activeElement===panel)){e.preventDefault();items.at(-1)?.focus()}
   else if(!e.shiftKey&&document.activeElement===items.at(-1)){e.preventDefault();items[0]?.focus()}
  }else if(st.modal)e.stopPropagation();
 })}
 if(changed){body.scrollTop=0;requestAnimationFrame(()=>{if(state(panel).key===key&&body.isConnected)body.scrollTop=0})}panels.add(panel);setOpen(panel,true);return panel;
}
function companyHTML(pack,ticker,industry){
 const n=pack.company_nodes.find(n=>n.ticker===ticker&&(n.industries||[]).includes(industry));const i=pack.industries.find(i=>i.id===industry);if(!n||!i)return null;
 const c=(i.companies||[]).find(c=>c.ticker===ticker);
 return ATLAS_READING.companyHTML(n,i,c)+ATLAS_READING.fold('회사·원 DD·가격의 원 기록','<pre class="atlas-industry-original">'+esc(JSON.stringify({company:n,industry_card:c||null},null,2))+'</pre>')+
 '<section class="atlas-memberships"><h3>연결된 산업</h3>'+n.industries.map(id=>{const x=pack.industries.find(i=>i.id===id);return '<p><a data-atlas-node="'+esc(id)+'" href="'+destination(location.pathname.match(/ATLAS_(\w+)/)?.[1]||'FLOW',id)+'">'+esc(x?.name||id)+' →</a></p>'}).join('')+'</section>';
}
addEventListener('resize',()=>{for(const panel of panels)if(state(panel).open)setOpen(panel,true)});
root.ATLAS_PANEL={attach,setOpen,destination,companyHTML};
})(window);
