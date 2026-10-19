/* Read-only reader: consumes typed PACK fields and source-bound editorial data. */
(function(root){
'use strict';
let boundPack=null;
const A=ATLAS_READER, esc=ATLAS_UX.escaped, list=v=>v==null?[]:Array.isArray(v)?v:[v];
const ko=s=>A.translate(String(s??''));
const para=v=>list(v).filter(Boolean).map(x=>'<p>'+esc(ko(A.plain(x)))+'</p>').join('');
const fold=(title,body)=>body?'<details class="atlas-preserved"><summary>'+esc(title)+'</summary><div class="atlas-preserved-body">'+body+'</div></details>':'';
const translated=s=>/[가-힣]/.test(ko(s));
function sourceHTML(urls){return A.unique(urls).map(url=>{try{const u=new URL(url);if(!['https:','http:'].includes(u.protocol))return '';return '<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(u.hostname.replace(/^www\./,''))+'</a>'}catch(e){return ''}}).join('');}
function section(title,values,cls=''){return values?.length?'<section class="atlas-reader-section '+cls+'"><h4>'+esc(title)+'</h4>'+para(values)+'</section>':'';}
function pacedSection(title,values,cls='',seen=new Set()){
 const pending=values.filter(v=>v.length<=600||!seen.has(v));
 // Review bookkeeping stays available in the disclosure, outside the first
 // two business paragraphs on a small screen. No source text is discarded.
 const narrative=pending.filter(v=>!/^(?:검토\s*기록\s*\d{4}-|출처의\s*실제\s*읽기\s*범위\s*\()/.test(v));
 const primary=narrative.filter(v=>v.length<=600).slice(0,1);
 if(!primary.length&&narrative.length)primary.push(narrative[0]);
 const more=pending.filter(v=>!primary.includes(v));
 more.filter(v=>v.length>600).forEach(v=>seen.add(v));
 return section(title,primary,cls)+(more.length?fold(title+' · 추가 '+more.length+'개',para(more)):'');
}
function readable(values){return A.unique(values.map(ko)).filter(translated);}
function primaryValues(e,key,field,original){return e?.primary_sections?.includes(key)?list(e[field]):[...(e?list(e[field]):[]),...original];}
function preservedSection(e,key,title,original){return e?.primary_sections?.includes(key)?fold(title,para(original)):'';}
function sourceSection(m){
 const records=m.supplement||[];
 let out=records.map(r=>'<div class="atlas-research-provenance"><b>보존 조사 · '+esc(r.as_of||'원문일 미기재')+'</b>'+para(r.read_scope)+'<div class="atlas-reading-sources">'+sourceHTML(r.public_sources||[])+'</div></div>').join('');
 out+=fold('개별 공개 근거의 날짜·읽은 범위',m.sources?.map(s=>'<article>'+para([s.date&&'근거 기준일 '+s.date,s.measurement_period&&'경제기간 '+A.plain(s.measurement_period),s.read_scope,s.claim_ko].filter(Boolean))+'<div class="atlas-reading-sources">'+sourceHTML([s.url].filter(Boolean))+'</div></article>').join(''));
 const urls=sourceHTML(m.public_urls||[]);
 return fold('근거 출처·검토 범위',out+(urls?fold('저장된 공개 근거 전체', '<div class="atlas-reading-sources">'+urls+'</div>'):''));
}
function identityHTML(n,card){
 const records=[n.identity_review,card?.identity_review,card?.perimeter_review,...list(n.security_history),...list(card?.security_history)].filter(Boolean);
 if(!records.length)return '';
 return '<aside class="atlas-reading-boundary"><b>법적 실체·증권 범위 HOLD</b><p>이전 저장 키와 현재 사업·후계 증권의 범위를 먼저 확인합니다. 합병·분리·명칭 변경만으로 가격·통화·DD 밴드를 새 증권에 승계하지 않습니다.</p>'+fold('저장된 실체·증권 검토',records.map(r=>para(Object.entries(r).filter(([k,v])=>typeof v==='string'&&!/source|path/.test(k)).map(([k,v])=>v))).join(''))+'</aside>';
}
function companyHTML(n,i,card){
 if(!n)return '';
 const m=A.normalizeCompany(n,i,card),e=m.editorial;
 const facts=readable(primaryValues(e,'facts','change',m.facts));
 const gapKey=A.selectUpdateRefs(boundPack).gap_completion.record_key;
 const gapReading=!!gapKey&&list(n.supplemental_research).at(-1)?.record_ref==='monthly_diff.'+gapKey;
 const sourceLimits=gapReading&&e?.primary_sections?.includes('limits')?list(e.limit).slice(1):[];
 const limits=readable(sourceLimits.length?list(e.limit).slice(0,1):primaryValues(e,'limits','limit',m.limits));
 const next=readable(primaryValues(e,'next','next',m.next));
 const shownProse=new Set();
 const role=ko(m.role);
 let boundary=identityHTML(n,card);
 if(!A.compatible())boundary+='<aside class="atlas-reading-boundary"><b>읽기 보완자료 판본 확인 필요</b><p>현재 PACK과 별도 읽기 자료가 맞지 않아 보완 요약을 사용하지 않습니다. 현재 저장 필드와 날짜를 확인하고 주간 갱신 과정에서 읽기 자료를 다시 검토해야 합니다.</p></aside>';
 if(n.stance_state){const d=ATLAS_PRICE.describe(n);if(d.zone==='UNKNOWN'||d.mismatch||d.suppressed){const reason=d.sourceLabelUnknown?'원 DD의 혼합·미정 라벨은 UNKNOWN입니다. 하나의 매매 구간으로 바꾸지 않습니다.':d.suppressionReason||'관측 호가와 DD 계약의 비교 근거를 먼저 확인합니다.';boundary+='<aside class="atlas-reading-boundary atlas-compact-boundary"><b>'+esc(d.zone==='UNKNOWN'?'가격 비교 HOLD · UNKNOWN':d.mismatch?'통화·상장 단위 비교 HOLD':'과거 RED 위험 해소 미확인 · 표시 억제 유지')+'</b><span>'+esc(d.sourceLabelUnknown?'원 DD 라벨 미확정 · 임의 가격 판정 없음':d.suppressed?'가격 갱신은 사업·KPI 재검증이 아닙니다. 현재 KPI '+d.tripwire:'비교 근거 확인 전 강조 보류')+'</span>'+fold('보류 사유와 원 기록',para(reason))+'</aside>';}}
 if(n.business_completion_observation_20261019?.status==='unavailable')boundary+='<aside class="atlas-reading-boundary atlas-compact-boundary"><b>현재 운영·원문 재독 공백 유지</b><span>날짜 있는 보존 기록이며 새 원문 확인 완료가 아닙니다.</span></aside>';
 const dates=[m.dd_as_of?'원 DD '+m.dd_as_of:null,m.dates.signal?'제한 신호 확인 '+m.dates.signal:null,m.dates.recorded?'연구 통합 기록 '+m.dates.recorded:null].filter(Boolean);
 const stage=n.verification==='DEEP_DIVED'?'DD 기록 있음 · 원 기준 '+m.dd_as_of:'사전 조사 · 회사 DD 미완';
 let html='<div class="atlas-reading-stage">'+esc(stage)+'</div>'+boundary;
 if(n.stance_state){const d=ATLAS_PRICE.describe(n);html+='<div class="atlas-quote-clock"><b>'+esc(d.price)+'</b><span>관측 '+esc(d.asof)+' · 실시간 아님</span><small>가격 관측과 사업 확인은 별개입니다.</small></div>'; }
 html+='<section class="atlas-reading" data-reading-kind="company" data-reader-ticker="'+esc(n.ticker)+'"><h3 class="atlas-reading-lead">'+esc(m.headline)+'</h3><p class="atlas-reading-role">'+esc(role)+'</p>';
 if(m.role_kind==='dated_dd_thesis')html+='<p class="atlas-reading-date">위 논제는 '+esc(m.dd_as_of)+' 원 DD의 사업·평가 기록입니다.</p>';
 html+=pacedSection('확인된 변화 · 왜 중요한가',facts,'',shownProse);
 if(!facts.length)html+=section('확인 범위',['회사별 새 운영 사실을 확인한 근거는 이 읽기 모델에 연결되지 않았습니다. 아래 원 DD·산업·개별 근거의 날짜와 범위를 확인합니다.']);
 html+=pacedSection('판단을 늦추는 반대 근거',limits,'atlas-reading-limit',shownProse);
 if(sourceLimits.length)html+=fold('출처별 반대 근거와 당시 읽기 범위',para(sourceLimits.map(v=>'해당 출처를 읽던 당시의 기록: '+v)));
 html+=pacedSection('다음에 확인할 것',next,'',shownProse);
 const primaryURLs=(e?.links||[]).map(x=>Array.isArray(x)?x[0]:null).filter(Boolean);
 html+='<div class="atlas-reading-sources atlas-primary-sources" aria-label="선택 근거 출처">'+sourceHTML((primaryURLs.length?primaryURLs:m.public_urls||[]).slice(0,2))+'</div>';
 if(m.candidates.length)html+='<p class="atlas-reading-date">조사 후보 기록 · '+esc(m.candidates.map(c=>[c.type,c.status].filter(Boolean).join(' / ')).join(' · '))+' · 매매 확정 아님</p>';
 html+='<details class="atlas-full-record"><summary>전체 근거·원 DD·조사 기록</summary><div class="atlas-preserved-body">';
 html+=preservedSection(e,'facts','대조용 보존 근거의 기존 기록',m.facts)+
  preservedSection(e,'limits','반대 근거·한계의 기존 기록',m.limits)+
  preservedSection(e,'next','다음 확인의 기존 기록',m.next);
 // Every original threshold remains intact. Observation aliases are independent of the DD contract.
 const tw=m.tripwires.map(t=>'<article class="atlas-reader-tripwire"><h5>'+esc(ko(t.title))+'</h5>'+para(t.observation)+'<div class="atlas-reading-date">'+esc(statusLabel(t.status))+' · 원 DD 임계값·판정 변경 없음</div></article>').join('');
 html+=fold('원 KPI와 이번 관찰의 대조 · '+m.tripwires.length+'개',tw);
 if(m.addenda.length)html+=fold('날짜별 별도 보완 근거 · 과학·자본·거래 범위',m.addenda.map(s=>
  '<article class="atlas-reader-tripwire"><h5>'+esc(s.as_of||'')+' · '+esc(s.paper_as_of?'논문 '+s.paper_as_of:'별도 보완')+'</h5>'+para(s.thesis)+
  section('보완 연구의 확인 조건',s.kpis)+s.signals.map(x=>'<b>'+esc(x.as_of||'')+'</b>'+para([x.finding,x.limit,x.next].filter(Boolean))+'<div class="atlas-reading-sources">'+sourceHTML([x.url].filter(Boolean))+'</div>').join('')+
  '<p>원 DD 날짜·가격 밴드·현금모델 재설정 없음. 뒤 날짜의 완료 기록과 이전 미확인 이력을 구분합니다.</p><div class="atlas-reading-sources">'+sourceHTML(s.urls)+'</div></article>').join(''));
 if(m.relationships.length)html+=section('실제 사업 연결과 전달 단계',m.relationships.flatMap(r=>Object.entries(r).filter(([k,v])=>typeof v==='string'&&!/id|url|source|path|ticker|industry/.test(k)).map(([k,v])=>v)));
 if(m.candidates.length)html+='<section class="atlas-reader-section"><h4>조사 후보의 이유와 반증</h4>'+m.candidates.map(c=>
  '<article><h5>'+esc([c.type,c.status].filter(Boolean).join(' · '))+'</h5>'+para([
   c.rationale&&'이유: '+c.rationale,c.falsifier&&'반증: '+c.falsifier,c.horizon&&'확인 기한: '+c.horizon,
   c.verdict_log&&'검토 기록: '+c.verdict_log,...(c.trigger?A.recordFields(c.trigger,'trigger'):[])
  ].filter(Boolean))+'</article>').join('')+'</section>';
 const original=A.unique([...m.facts,...m.limits,...m.next].filter(x=>!translated(x)));
 html+=fold('보존된 원문 표현과 추가 세부 근거',para(original));
 if(e?.dated_editorial_history?.length)html+=fold('이전 읽기 요약 원본 · 날짜 있는 기록',e.dated_editorial_history.map(old=>'<article>'+para([old.headline,old.role,...list(old.change),...list(old.limit),...list(old.next),old.dates,old.scope].filter(Boolean))+'</article>').join(''));
 html+='<p class="atlas-reading-date">'+esc(dates.join(' · ')||'보존된 회사별 근거의 발행일을 따릅니다.')+'</p><p class="atlas-reading-scope">'+esc(e?.scope||'회사별 제한 근거를 읽는 화면입니다. 전체 현재 운영 검증·새 DD 완료 판정이 아닙니다. 가격 관측일은 사업 확인일을 갱신하지 않습니다.')+'</p>'+sourceSection(m)+'</div></details>';
 html+='<p class="atlas-reading-scope atlas-brief-scope">부분 근거 · 회사 전체 최신 운영 검증 아님'+(e?.review_recorded_on?' · 본문 검토 '+esc(e.review_recorded_on):'')+'</p></section>';
 return html;
}
function statusLabel(s){return ({NEW_COMPARABLE_ACTUAL:'새 비교 가능 실제치',NO_NEW_MEASUREMENT:'새 비교 측정 없음',QUALITATIVE_COUNTEREVIDENCE:'정성적 반대 근거',QUALITATIVE_UPDATE:'정성적 보완',NO_COMPARABLE_NEW_MEASUREMENT:'비교 가능한 새 측정 없음',NO_NEW_COMPARABLE_MEASUREMENT:'비교 가능한 새 측정 없음'})[s]||s||'관찰 범위는 개별 본문을 따릅니다.';}
function industryHTML(i){
 const m=A.normalizeIndustry(i);if(!m)return '';const e=m.editorial;
 const tierDefinition={HEAT:'트리거 작동을 확인한 우선 조사 단계',WARM:'트리거 조짐을 더 관찰하는 단계',NEUTRAL:'수급 균형을 관찰하는 단계',COLD:'공급과잉·수요침체와 바닥 반전을 감시하는 단계',FROZEN:'구조적 쇠퇴와 생존을 확인하는 단계'};
 if(e?.navigation_companies?.length){
  const companies=e.navigation_companies.map(t=>boundPack?.company_nodes?.find(n=>n.ticker===t&&(n.industries||[]).includes(m.id))).filter(Boolean);
  const cause=readable(primaryValues(e,'facts','change',m.facts));const counter=readable(primaryValues(e,'limits','limit',m.limits));const next=readable(primaryValues(e,'next','next',m.next));
  const chips=companies.map(n=>'<a class="atlas-company-step" href="ATLAS_FLOW.html#'+encodeURIComponent(m.id+'::'+n.ticker)+'" data-atlas-company="'+esc(n.ticker)+'" data-atlas-industry="'+esc(m.id)+'"><b>'+esc(n.ticker)+'</b><span>'+esc(n.name)+'</span><span aria-hidden="true">→</span></a>').join('');
  return '<section class="atlas-reading atlas-industry-path" data-reading-kind="industry" data-reader-industry="'+esc(m.id)+'"><p class="atlas-reading-stage">'+esc(tierDefinition[m.tier]||m.tier)+' · 매매 신호 아님</p><h3 class="atlas-reading-lead">'+esc(e.headline)+'</h3><ol class="atlas-causal-steps"><li><h4><span>1</span> 변화의 원인</h4>'+para(cause.slice(0,1))+'</li><li><h4><span>2</span> 영향을 확인할 연결 회사</h4><div class="atlas-company-steps">'+chips+'</div><p class="atlas-step-note">등록된 산업 소속의 비교 대상 · 수혜 확정·순위 아님</p></li><li class="atlas-step-counter"><h4><span>3</span> 판단을 늦추는 반대 근거</h4>'+para(counter.slice(0,1))+'</li><li><h4><span>4</span> 다음 확인</h4>'+para(next.slice(0,1))+'</li></ol><div class="atlas-reading-sources">'+sourceHTML((e.links||[]).map(x=>x[0]).filter(Boolean).slice(0,2))+'</div>'+fold('전체 산업 근거·단계·보류 원 기록',para([...cause,...counter,...next,e.dates,e.scope].filter(Boolean))+preservedSection(e,'facts','이전 판단·세부 근거의 기존 기록',m.facts)+'<div class="atlas-reading-sources">'+sourceHTML(m.public_urls)+'</div>')+'<p class="atlas-reading-scope">부분 근거 · 등록 관계는 자동 수혜·전파 확증이 아닙니다.</p></section>';
 }
 return '<section class="atlas-reading" data-reading-kind="industry" data-reader-industry="'+esc(m.id)+'"><h3 class="atlas-reading-lead">'+esc(e?.headline||m.name+'의 수급과 확인 조건')+'</h3><p class="atlas-reading-role">'+esc(m.role||'')+'</p><p class="atlas-reading-context">'+esc(tierDefinition[m.tier]||m.tier)+' · 조사 우선순위이며 매매 신호가 아닙니다.</p>'+section('수요·공급 판단의 근거',A.unique(primaryValues(e,'facts','change',m.facts)))+section('공급의 대응·제약과 보류 범위',A.unique(primaryValues(e,'limits','limit',m.limits)),'atlas-reading-limit')+section('다음에 확인할 감시 조건',A.unique(primaryValues(e,'next','next',m.next)))+preservedSection(e,'facts','이전 판단·세부 근거의 기존 기록',m.facts)+'<p class="atlas-reading-date">보존 판단 '+esc(m.as_of||'일자 미기재')+(m.recorded?' · 제한 정산 '+esc(m.recorded.slice(0,10)):'')+'</p><p class="atlas-reading-scope">'+esc(e?.scope||'산업의 보존 상태와 연결 회사의 운영 검증은 별개입니다. 등록된 관계는 자동 전파·회사 수혜 확증이 아닙니다.')+'</p><div class="atlas-reading-sources">'+sourceHTML(m.public_urls)+'</div></section>';
}
function bindPack(p){const ok=A.bindPack(p);boundPack=ok?p:null;return ok}
// Graph is a permanent desktop region and a full-height reading sheet on small screens.
let sheetOpen=false,flowSheetOpen=false;
function graphSheet(open){sheetOpen=open;const panel=document.querySelector('.inspector');if(!panel)return;const mobile=innerWidth<=900;
 document.body.classList.toggle('atlas-graph-reading',open&&mobile);
 for(const el of document.querySelector('.shell').children)if(el!==panel)el.inert=open&&mobile;
 panel.setAttribute('role',open&&mobile?'dialog':'region');panel.setAttribute('aria-label','선택 대상 설명');
 if(open&&mobile)panel.setAttribute('aria-modal','true');else panel.removeAttribute('aria-modal');
}
function flowSheet(open){flowSheetOpen=open;const panel=document.querySelector('#insp'),app=document.querySelector('#app'),stage=document.querySelector('#stage');if(!panel||!app||!stage)return;const modal=open&&innerWidth<=900;
 for(const e of app.children)if(e!==stage)e.inert=modal;
 for(const e of stage.children)if(e!==panel)e.inert=modal;
 panel.setAttribute('role',modal?'dialog':'region');if(modal)panel.setAttribute('aria-modal','true');else panel.removeAttribute('aria-modal');
 if(open&&!panel.contains(document.activeElement))(panel.querySelector('.x')||panel).focus({preventScroll:true});
}
document.addEventListener('keydown',e=>{const panel=document.body.classList.contains('atlas-graph-reading')?document.querySelector('.inspector'):(flowSheetOpen&&innerWidth<=900?document.querySelector('#insp'):null);if(!panel||e.key!=='Tab')return;const items=[...panel.querySelectorAll('button,a[href],summary,[tabindex="0"]')].filter(x=>!x.disabled&&x.getClientRects().length&&x.tabIndex>=0);if(e.shiftKey&&(document.activeElement===items[0]||document.activeElement===panel)){e.preventDefault();items.at(-1)?.focus()}else if(!e.shiftKey&&document.activeElement===items.at(-1)){e.preventDefault();items[0]?.focus()}});
addEventListener('resize',()=>{if(document.querySelector('.inspector'))graphSheet(sheetOpen);if(document.querySelector('#insp'))flowSheet(flowSheetOpen)});
const css=document.createElement('style');css.textContent=`
:root{--atlas-read-ink:var(--ink,var(--bone,#ebeae4));--atlas-read-muted:#b1bac2;--atlas-read-line:var(--line,#39434b);--atlas-read-accent:#d1bb84}
.atlas-reading{word-break:keep-all;font-size:15px;line-height:1.8;color:var(--atlas-read-ink);overflow-wrap:anywhere;padding:18px 0 8px;letter-spacing:0}
.atlas-reading .atlas-reading-lead{font:600 21px/1.48 inherit;font-size:21px;line-height:1.48;font-weight:600;margin:0 0 15px;letter-spacing:-.025em;color:inherit}
.atlas-reading p{font-size:15px!important;line-height:1.8!important;color:inherit!important;margin:7px 0 17px!important}
.atlas-reading .atlas-reading-role{color:var(--atlas-read-muted)!important;margin-bottom:22px!important}
.atlas-reading-label{font-size:12px;font-weight:650;letter-spacing:.035em;color:var(--atlas-read-accent);margin:22px 0 6px}
.atlas-reading-limit,.atlas-reading-boundary{border-left:2px solid #d9a35b;padding:2px 0 2px 14px;margin:22px 0;color:#f1dfc3}
.atlas-reading-limit b{font-size:12px;display:block;margin-bottom:7px}.atlas-reading-limit p{margin:0!important}
.atlas-reading .atlas-reading-dates,.atlas-reading .atlas-reading-scope{font-size:12px!important;line-height:1.7!important;color:var(--atlas-read-muted)!important;margin:12px 0 6px!important}
.atlas-reading-stage{font-size:12px;color:var(--atlas-read-accent);padding-top:15px}.atlas-reading-context{font-size:12px;color:var(--atlas-read-muted);line-height:1.7;margin:8px 0 0;overflow-wrap:anywhere}
.atlas-reading-boundary{font-size:12px;line-height:1.7;margin:14px 0 2px}
.atlas-reading-sources{display:flex;gap:9px 16px;flex-wrap:wrap;margin:15px 0;font-size:12px}.atlas-reading-sources a{color:#b7d4e1;text-underline-offset:3px}
.atlas-preserved{border-top:1px solid var(--atlas-read-line);padding:12px 0!important;margin:10px 0}
.atlas-preserved>summary{font-size:13px!important;line-height:1.7;color:var(--atlas-read-muted)!important;cursor:pointer;min-height:36px;padding:7px 0!important}
.atlas-preserved-body{font-size:13px;line-height:1.8;padding:8px 0 12px;overflow-wrap:anywhere}.atlas-preserved-body p{line-height:1.8!important}.atlas-preserved pre{white-space:pre-wrap;overflow-wrap:anywhere}
.shell{grid-template-columns:1fr clamp(440px,38vw,560px)}
.inspector{--ink-faint:#a0aab3}.insp-head{padding:18px 26px 14px}.insp-title{font-size:24px}.insp-sub{font-size:12px;line-height:1.7}.insp-body{padding:0 26px 40px;scrollbar-gutter:stable;min-height:0}.sec-h{font-size:11px}.disc{color:#a0aab3}
.atlas-flow-reading .node.sel circle.halo{animation:none}
#insp{width:clamp(430px,38vw,560px);padding:0 26px 36px;background:#1b1f23;--mute:#aeb7c0;--dim:#a0aab3;scrollbar-gutter:stable}
#insp>.top{top:0!important;margin:0 -26px!important;padding:18px 26px 13px!important;background:#1b1f23!important;align-items:flex-start;border-bottom:1px solid var(--line)}
#insp>.top h2{font-size:23px;line-height:1.35;max-width:390px}#insp>.top .meta{font-size:12px;line-height:1.7;margin:8px 0 0}#insp>.top .x{min-width:44px;min-height:44px}#insp>.top .atlas-back{order:0;flex:none}#insp>.top>div{min-width:0;flex:1}
#insp .row{padding:12px 0;line-height:1.7;flex-direction:column;gap:5px}#insp .row span{text-align:left}#insp .co{padding:10px 0;flex-wrap:wrap;line-height:1.6}#insp .co .cp{flex-basis:100%;padding-left:16px}#insp details summary{font-size:13px;min-height:36px}#insp .btns{flex-wrap:wrap}#insp .btns button{padding:7px 10px;min-height:36px}
.atlas-memberships{padding:16px 0;line-height:1.7}.atlas-memberships h3{font-size:12px;margin-bottom:7px}.atlas-memberships .li{padding:10px 0}.atlas-memberships small{font-size:11px;color:var(--atlas-read-muted)}
#drawerBody .atlas-reading{max-width:560px}.card{--atlas-read-muted:#535d64;--atlas-read-accent:#735f35;--atlas-read-ink:#263238}
.card .atlas-reading{--atlas-read-muted:#535d64;--atlas-read-accent:#735f35;--atlas-read-ink:#263238;font-size:14px}.card .atlas-reading p{font-size:14px!important}.card .atlas-reading-limit{color:#634819}.card .atlas-reading-lead{font-size:19px}.card .atlas-reading-sources a{color:#245b75}
@media(max-width:900px){
 .shell{grid-template-columns:minmax(0,1fr)}
 body.atlas-graph-reading{overflow:hidden;height:100dvh}body.atlas-graph-reading .inspector{position:fixed;inset:0;z-index:30;height:100dvh;max-height:none;border:0;display:flex;overflow:hidden}body.atlas-graph-reading .insp-body{flex:1;overflow:auto;min-height:0}body.atlas-graph-reading .insp-head{flex:none;padding:14px 20px 11px}body.atlas-graph-reading .insp-title{font-size:23px;margin-top:4px}body.atlas-graph-reading .insp-sub{font-size:11.5px}body.atlas-graph-reading .insp-body{padding:0 20px 40px}
 #insp{position:fixed;inset:0;width:100%;max-width:100%;height:100dvh;padding:0 20px 36px;z-index:20;border:0}#insp>.top{margin:0 -20px!important;padding:14px 20px 11px!important}#insp>.top h2{font-size:22px}#insp>.top .atlas-back{font-size:11px;margin-right:3px}
 .atlas-reading{padding-top:16px}.atlas-reading .atlas-reading-lead{font-size:20px}.atlas-reading-label{margin-top:20px}.atlas-reading .atlas-reading-role{margin-bottom:19px!important}
 .card-h{display:grid!important;grid-template-columns:1fr auto!important;gap:8px!important}.card-h .card-id{grid-column:1/3}.card-h h3{grid-column:1;min-width:0}.card-h .atlas-current-status{grid-column:1/3}.card-h .tier-badge{grid-column:2;grid-row:2}
 #hy div{left:4px;max-width:70px;white-space:normal;font-size:10px;line-height:1.35;padding:5px 6px}#hy div small{display:none}
}
@media(prefers-reduced-motion:reduce){.atlas-reading,*{scroll-behavior:auto!important}}

.atlas-reader-section{margin:24px 0}.atlas-reader-section h4{font-size:13px;letter-spacing:.02em;line-height:1.7;color:var(--atlas-read-muted);margin:0 0 10px;font-weight:650}
.atlas-reader-section p,.atlas-research-provenance p{font-size:15px!important;line-height:1.85!important;overflow-wrap:anywhere;margin:0 0 12px}
.atlas-reader-tripwire{padding:16px 0;border-bottom:1px solid var(--line,#4a5158)}.atlas-reader-tripwire h5{font-size:15px;line-height:1.8;margin:0 0 9px}.atlas-reader-tripwire p{font-size:15px!important;line-height:1.85!important}
.atlas-preserved-body,.atlas-preserved-body .txt,.atlas-preserved-body .kv,.atlas-preserved-body p,.atlas-preserved-body li,.atlas-preserved-body td,.atlas-preserved-body .row,.atlas-preserved-body span{font-size:14px!important;line-height:1.8!important;overflow-wrap:anywhere}
.atlas-preserved summary,#insp summary{font-size:14px!important;line-height:1.7!important;padding:12px 0!important;min-height:44px}
.atlas-reading-boundary{font-size:14px;line-height:1.8;padding:14px 16px}.atlas-reading-boundary p{margin-top:9px;font-size:14px!important;line-height:1.8!important}
.atlas-reading-date,.atlas-reading-scope,.atlas-reading-context,.atlas-research-provenance{font-size:13px!important;line-height:1.8!important}
.atlas-research-provenance{margin:22px 0;padding-top:14px;border-top:1px solid var(--line,#4a5158)}
.atlas-memberships .li{font-size:14px;line-height:1.8}.comp-rz{font-size:14px;line-height:1.8}
.atlas-preserved-body *{font-size:14px!important;line-height:1.8!important}

.atlas-reading{padding-top:12px}.atlas-reading .atlas-reading-lead{font-size:21px;line-height:1.4;margin-bottom:10px}.atlas-reading p{margin:5px 0 12px!important}
.atlas-reader-section{margin:16px 0}.atlas-reader-section h4{margin-bottom:6px}.atlas-reading .atlas-reading-role{margin-bottom:14px!important}
.atlas-reading-stage{padding-top:10px;line-height:1.5}.atlas-quote-clock{display:flex;gap:3px 12px;flex-wrap:wrap;padding:8px 0 2px;color:var(--atlas-read-muted);font-size:12px;line-height:1.5}.atlas-quote-clock b{color:var(--atlas-read-ink)}.atlas-quote-clock small{flex-basis:100%;font-size:11.5px}
.atlas-compact-boundary{padding:10px 12px;margin:10px 0;font-size:12.5px;line-height:1.55}.atlas-compact-boundary b{display:block;font-size:13px;margin-bottom:3px}.atlas-compact-boundary>.atlas-preserved{margin:5px 0 0;padding:0!important}.atlas-compact-boundary>.atlas-preserved>summary{font-size:12px!important;padding:7px 0!important;min-height:32px}
.atlas-full-record{border:1px solid var(--atlas-read-line);border-radius:8px;padding:0 12px;margin:12px 0}.atlas-full-record>summary{font-size:14px;min-height:44px;padding:10px 0;cursor:pointer}.atlas-full-record[open]>summary{border-bottom:1px solid var(--atlas-read-line)}
.atlas-primary-sources{margin:10px 0;font-size:12px}.atlas-primary-sources a{min-height:32px;display:inline-flex;align-items:center}.atlas-brief-scope{font-size:11.5px!important;line-height:1.6!important;margin:8px 0!important}
.atlas-causal-steps{list-style:none;padding:0;margin:18px 0}.atlas-causal-steps>li{position:relative;padding:0 0 18px 26px;border-left:1px solid var(--atlas-read-line);margin-left:11px}.atlas-causal-steps>li:last-child{border:0;padding-bottom:0}.atlas-causal-steps h4{font-size:13px;line-height:1.6;margin:0 0 8px;color:var(--atlas-read-muted)}.atlas-causal-steps h4>span{position:absolute;left:-12px;width:23px;height:23px;border-radius:50%;background:var(--panel,#1b1f23);border:1px solid var(--atlas-read-line);text-align:center;color:var(--atlas-read-accent);font-size:12px;line-height:21px}.card .atlas-causal-steps h4>span{background:#f4f2ed}.atlas-step-counter{color:var(--atlas-read-ink)}.atlas-step-counter h4{color:var(--atlas-read-accent)}
.atlas-company-steps{display:grid;gap:7px}.atlas-company-step{display:flex;align-items:center;gap:10px;padding:10px 12px;min-height:44px;border:1px solid var(--atlas-read-line);border-radius:7px;text-decoration:none;color:inherit}.atlas-company-step:hover{border-color:var(--atlas-read-accent);background:rgba(190,170,120,.06)}.atlas-company-step b{font-size:14px;min-width:48px}.atlas-company-step span{font-size:12px;line-height:1.5}.atlas-company-step span:last-child{margin-left:auto}.atlas-step-note{font-size:11.5px!important;color:var(--atlas-read-muted)!important;margin:8px 0 0!important}
@media(max-width:900px){#insp>.top{padding:12px 18px 10px!important}#insp>.top h2{font-size:20px;line-height:1.3}#insp>.top .meta{font-size:11px;margin-top:5px}.atlas-reading .atlas-reading-lead{font-size:20px;line-height:1.4}.atlas-reading-stage{font-size:11.5px}.atlas-memberships{padding:10px 0}.atlas-memberships .row{padding:8px 0!important}.atlas-memberships .li{padding:8px 0}.atlas-causal-steps>li{padding-left:22px}}
`;document.head.appendChild(css);
root.ATLAS_READING={bindPack,companyHTML,industryHTML,fold,graphSheet,flowSheet};
})(window);
