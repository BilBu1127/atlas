/* Shared reading/navigation behavior. No research, price or valuation writes. */
(function(root){
  'use strict';
  const reduce=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hash=()=>{try{return decodeURIComponent(location.hash.slice(1))}catch(e){return ''}};
  const css=document.createElement('style');
  css.textContent=`
    :focus-visible{outline:2px solid #C9B88A!important;outline-offset:3px}
    [inert]{pointer-events:none} #net,#svg{touch-action:none}
    #drawerBody,#insp,.inspector,.ib{overscroll-behavior:contain}
    #insp>.top{position:sticky;top:0;z-index:8;background:var(--bg,#181D21);padding:8px 0}
    .inspector>.insp-head{position:sticky;top:0;z-index:8;background:var(--panel,#181D21)}
    .atlas-back,.atlas-close{font:inherit;font-size:11px;color:inherit;background:transparent;border:1px solid #3A4149;border-radius:4px;padding:5px 9px;margin:0 8px 8px 0;cursor:pointer}
    .atlas-back:disabled{opacity:.35;cursor:default}
    .atlas-reading-summary{line-height:1.7;overflow-wrap:anywhere;margin:12px 0}
    .atlas-load-state{padding:16px;color:inherit;font-size:12px;line-height:1.7;overflow-wrap:anywhere}
    .atlas-load-state button{font:inherit;color:inherit;background:transparent;border:1px solid #7E93A2;padding:8px 14px;border-radius:4px;cursor:pointer}
    .atlas-load-state[role=alert]{border:1px solid #D89A3A}
    .atlas-price-details{margin:10px 0}.atlas-price-details>summary{cursor:pointer}
    .atlas-compact-price{font-size:11.5px;line-height:1.65;overflow-wrap:anywhere;margin:10px 0}
    .atlas-audit-details>summary{cursor:pointer;font-size:12px;padding:10px 0}
    @media(max-width:900px){
      button.dclose,#insp .x,.atlas-back,.atlas-close,.zoomctl button,#zoomctl button,#helpclose{min-width:44px;min-height:44px}
      #zoomctl{flex-wrap:wrap;max-width:calc(100% - 24px)}
      #insp>.top{margin-top:-8px}.chip[data-tier],#xtoggle,#reset{min-height:36px}
      .atlas-audit-details{margin:4px 0}
    }
    @media(prefers-reduced-motion:reduce){html{scroll-behavior:auto!important}*{scroll-behavior:auto!important}}
  `;
  document.head.appendChild(css);
  const escaped=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function reading(){
    return {y:scrollY,details:[...document.querySelectorAll('details')].map(d=>d.open),
      scrolls:['drawerBody','insp','flowPanelBody','ibody','mapPanelBody','stanceBoard','stage'].map(id=>{const e=document.getElementById(id);return e?{id,y:e.scrollTop,x:e.scrollLeft}:null}).filter(Boolean)};
  }
  function mount(opts){
    const page=location.pathname;let restoring=false,applying=false,performing=false,seq=0,generation=0;
    const api={
      get restoring(){return restoring},
      save(){if(restoring)return;const previous=history.state||{};history.replaceState({...previous,atlas:{page,seq,model:opts.capture(),reading:reading()}},'');updateBack();},
      navigate(key,fn,hash){
        if(applying||performing){fn();return}
        cancelRestore();
        if(opts.key(opts.capture())===key)return;
        api.save();performing=true;try{fn()}finally{performing=false}seq++;
        history.pushState({atlas:{page,seq,model:opts.capture(),reading:reading()}},'',hash||location.pathname);
        updateBack();
      },
      backButton(el){
        if(!el||el.querySelector('.atlas-back'))return;
        const b=document.createElement('button');b.className='atlas-back';b.type='button';b.textContent='← 이전 보기';b.onclick=()=>history.back();el.prepend(b);updateBack();
      }
    };
    function cancelRestore(){if(restoring&&!applying){restoring=false;generation++;api.save()}}
    function updateBack(){document.querySelectorAll('.atlas-back').forEach(b=>b.disabled=seq===0)}
    function restore(state){
      const current=++generation;restoring=true;applying=true;seq=state?.seq||0;
      try{if(state?.model)opts.restore(state.model);else opts.fromURL?.(hash())}
      finally{applying=false;
        if(!state?.reading){restoring=false;api.save()}
        else requestAnimationFrame(()=>requestAnimationFrame(()=>{
        if(current!==generation)return;
        if(state?.reading){
          const ds=document.querySelectorAll('details');state.reading.details.forEach((open,i)=>{if(ds[i])ds[i].open=open});
          window.ATLAS_READING?.hydrateIndustryRecords(document);
          state.reading.scrolls.forEach(s=>{const e=document.getElementById(s.id);if(e){e.scrollTop=s.y;if(s.x!=null)e.scrollLeft=s.x}});
          scrollTo({top:state.reading.y,behavior:'instant'});
        }
        restoring=false;api.save();
      }))}
    }
    window.addEventListener('popstate',e=>restore(e.state?.atlas?.page===page?e.state.atlas:null));
    for(const type of ['pointerdown','keydown','wheel'])document.addEventListener(type,cancelRestore,{capture:true,passive:true});
    window.addEventListener('pagehide',()=>api.save());
    document.addEventListener('scroll',()=>api.save(),{capture:true,passive:true});
    document.addEventListener('toggle',()=>api.save(),true);
    document.addEventListener('change',()=>queueMicrotask(()=>api.save()));
    document.addEventListener('click',()=>queueMicrotask(()=>api.save()));
    window.addEventListener('pointerup',()=>setTimeout(()=>api.save(),0));
    document.addEventListener('wheel',()=>setTimeout(()=>api.save(),80),{passive:true});
    api.start=()=>restore(history.state?.atlas?.page===page?history.state.atlas:null);
    return api;
  }
  function panel(el,{modal=false,background=null,fallback=null}={}){
    let opener=null,lockedY=0,oldOverflow='';
    el.inert=true;el.setAttribute('aria-hidden','true');el.tabIndex=-1;
    el.setAttribute('role',modal?'dialog':'region');if(modal)el.setAttribute('aria-modal','true');
    el.addEventListener('keydown',e=>{
      if(!modal||e.key!=='Tab'||el.inert)return;
      const a=[...el.querySelectorAll('button,a[href],input,summary,[tabindex="0"]')].filter(x=>!x.matches(':disabled')&&x.tabIndex>=0&&!x.closest('[inert]')&&x.getClientRects().length);
      if(!a.length){e.preventDefault();el.focus({preventScroll:true});return}
      if(e.shiftKey&&(document.activeElement===a[0]||document.activeElement===el)){e.preventDefault();a.at(-1).focus()}
      else if(!e.shiftKey&&document.activeElement===a.at(-1)){e.preventDefault();a[0].focus()}
    });
    return {
      open(){
        const wasClosed=el.inert;
        if(wasClosed){opener=document.activeElement;lockedY=scrollY;oldOverflow=document.documentElement.style.overflow}
        el.inert=false;el.setAttribute('aria-hidden','false');
        if(modal){if(background)background.inert=true;document.documentElement.style.overflow='hidden'}
        if(wasClosed)(el.querySelector('button:not(:disabled)')||el).focus({preventScroll:true});
      },
      close(){
        const wasOpen=!el.inert;el.inert=true;el.setAttribute('aria-hidden','true');
        if(modal&&wasOpen){if(background)background.inert=false;document.documentElement.style.overflow=oldOverflow;scrollTo({top:lockedY,behavior:'instant'})}
        if(wasOpen){const usable=opener?.isConnected&&opener!==document.body&&opener!==document.documentElement&&!opener.closest('[inert]');const target=usable?opener:(typeof fallback==='function'?fallback():fallback);if(!usable)target?.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});target?.focus({preventScroll:true})}
      }
    };
  }
  // Dynamic inspector links keep their existing visual appearance and gain keyboard semantics.
  function enhance(scope=document){
    scope.querySelectorAll('div[onclick],span.lk,.co[data-co],#sres>div,#hy>div,.obj').forEach(e=>{
      if(e.matches('button,a,summary')||e.closest('summary'))return;
      e.setAttribute('role','button');e.tabIndex=0;
      if(!e.dataset.atlasKey&&!e.onkeydown){e.dataset.atlasKey='1';e.addEventListener('keydown',ev=>{if(ev.target!==e)return;if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();ev.stopPropagation();e.click()}})}
    });
  }
  const observer=new MutationObserver(()=>enhance());
  document.addEventListener('DOMContentLoaded',()=>{enhance();observer.observe(document.body,{childList:true,subtree:true})});
  function loadState(host,error){
    if(!host)return;
    let box=host.querySelector(':scope>.atlas-load-state');if(!box){box=document.createElement('div');box.className='atlas-load-state';host.prepend(box)}
    box.setAttribute('role',error?'alert':'status');
    box.innerHTML=error?'지도를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요. <button type="button">다시 시도</button>':'지도를 불러오는 중…';
    if(error)box.querySelector('button').onclick=()=>location.reload();
  }
  root.ATLAS_UX={mount,panel,enhance,reduce,loadState,escaped};
})(window);
