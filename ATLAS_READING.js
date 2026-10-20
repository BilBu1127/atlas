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
// All industry views consume the same reviewed reader records. Raw source
// objects stay in the PACK and are hydrated only when the reader asks for them.
const INDUSTRY_TIER={HEAT:'우선 조사',WARM:'추가 관찰',NEUTRAL:'균형 관찰',COLD:'침체·반전 관찰',FROZEN:'구조적 쇠퇴·생존 관찰'};
const INDUSTRY_BALANCE={SHORTAGE:'공급 부족',BALANCED:'수급 균형',GLUT:'공급 과잉'};
const INDUSTRY_CYCLE={RECOVERY:'회복 초입',EXPANSION:'사이클 확장',PEAK:'사이클 정점 부근',DOWNTURN:'수요·생산 하강',TROUGH:'사이클 저점 부근','PEAK(컨테이너) / EXPANSION(탱커·가스)':'컨테이너 정점 / 탱커·가스 확장'};
const RELATION_LABELS={SUPPLIES_TO:'공급 연결',SUBSTITUTES:'대체 관계',CAPACITY_COMPETES:'생산능력 경쟁',DEMAND_COMOVES:'공통 수요 노출',INVERSE:'반대 압력',THEME_DRIVES:'테마 수요 연결',CUSTOMER_OF:'고객 연결',OPERATES_IN:'산업 소속',COMPETES_WITH:'기업 경쟁'};
const RELATION_MEANINGS={SUPPLIES_TO:'출발 산업의 산출물이 도착 산업의 투입물로 등록된 경로입니다.',SUBSTITUTES:'같은 수요를 서로 다른 방식으로 충족할 수 있는 비교 경로입니다.',CAPACITY_COMPETES:'같은 생산 자원이나 설비를 두고 경쟁할 수 있는 경로입니다.',DEMAND_COMOVES:'공통 수요에 노출된 비교 경로입니다. 특정 고객 계약을 뜻하지 않습니다.',INVERSE:'한쪽의 변화가 상대의 비용·수요에 반대 압력을 줄 수 있는 경로입니다.',THEME_DRIVES:'테마에서 산업으로 등록된 수요 가설입니다. 실제 주문·가동과 구분합니다.',CUSTOMER_OF:'고객 관계로 등록된 경로입니다. 계약·인도·현금의 실제 단계를 확인해야 합니다.'};
function industryNode(id){return [...(boundPack?.industries||[]),...(boundPack?.themes||[])].find(n=>n.id===id)}
function industryNodeLink(id,label){const n=industryNode(id);const page=['ATLAS_FLOW.html','ATLAS_GRAPH.html','ATLAS_CONSOLE.html','ATLAS_MAP.html'].find(name=>location.pathname.endsWith('/'+name))||'ATLAS_FLOW.html';return n?'<a class="atlas-industry-node-link" href="'+page+'#'+encodeURIComponent(id)+'" data-atlas-node="'+esc(id)+'">'+esc(label||n.name)+' <span aria-hidden="true">→</span></a>':esc(label||id)}
function industryCompanyLink(ticker,id,label){const n=boundPack?.company_nodes?.find(n=>n.ticker===ticker&&(n.industries||[]).includes(id));return n?'<a class="atlas-industry-company-link" href="ATLAS_FLOW.html#'+encodeURIComponent(id+'::'+ticker)+'" data-atlas-company="'+esc(ticker)+'" data-atlas-industry="'+esc(id)+'">'+esc(label||ticker)+' <span aria-hidden="true">↗</span></a>':'<span>'+esc(label||ticker)+'</span>'}
function industryCompanyRegister(i){
 const members=(boundPack?.company_nodes||[]).filter(n=>(n.industries||[]).includes(i.id));const cards=(i.companies||[]).filter(c=>typeof c==='object');const keys=[...new Set([...cards.map(c=>c.ticker),...members.map(n=>n.ticker)])];
 const entries=keys.map(t=>{const n=members.find(n=>n.ticker===t),c=cards.find(c=>c.ticker===t);return '<li>'+industryCompanyLink(t,i.id,t+' · '+(n?.name||c?.name||t))+'<small>'+esc(n?(n.verification==='DEEP_DIVED'?'원 DD 기록 있음':'회사 DD 미완')+(c?'':' · 노드 원장에만 등록'):'산업 카드에만 등록 · 회사 원장 연결과 DD 여부 미확인')+'</small></li>'}).join('');
 return fold('연결 회사 '+keys.length+'개 · 등록 범위 대조','<p class="atlas-industry-note">회사 노드 '+members.length+'개와 산업 카드 '+cards.length+'개의 합집합입니다. 현재 운영 검증 완료나 수혜 순위를 뜻하지 않습니다.</p><ul class="atlas-industry-company-register">'+entries+'</ul>');
}
function industryRelationsHTML(i){
 const edges=(boundPack?.edges||[]).filter(e=>e.from===i.id||e.to===i.id);
 const rows=edges.map(e=>{const other=e.from===i.id?e.to:e.from;const a=industryNode(e.from),b=industryNode(e.to);const arrow=' → ';const impact=({'+':'같은 방향','-':'반대 방향','−':'반대 방향',both:'양면','양면':'양면'})[e.direction]||'원 기록 확인';return '<li>'+industryNodeLink(other)+'<div class="atlas-industry-relation-name">'+esc(RELATION_LABELS[e.type]||'등록 관계')+' · '+esc(a?.name||e.from)+arrow+esc(b?.name||e.to)+'</div><p class="atlas-industry-mechanism">'+esc(e.mechanism||'등록된 경로의 세부 설명 미기재')+'</p><p class="atlas-industry-note">'+esc(RELATION_MEANINGS[e.type]||'등록된 양끝의 실제 사업 단계를 확인합니다.')+'</p><small>원 등록 영향 '+esc(impact)+' · 시차 '+esc(e.lag||'미기재')+' · '+(e.propagation_status==='HOLD'?'경제적 전달의 현재 확인 보류':'등록은 회사 수혜·매출 전달의 확증이 아닙니다.')+'</small></li>'}).join('');
 const derived=(boundPack?.themes||[]).filter(t=>(t.linked_industries||[]).includes(i.id)&&!edges.some(e=>e.from===t.id&&e.to===i.id));
 const extra=derived.length?'<h5>테마 목록에서 연결된 경로 '+derived.length+'개</h5><p class="atlas-industry-note">등록 엣지 원장과 별개입니다. 새로 검증된 경제적 전파로 세지 않습니다.</p>'+derived.map(t=>'<div class="atlas-industry-derived">'+industryNodeLink(t.id)+'</div>').join(''):'';
 return fold('연결 산업·테마 · 등록 관계 '+edges.length+'개','<p class="atlas-industry-note">등록 방향·시차를 보존한 탐색 경로입니다. 단위를 달리하는 수주·설치·매출·현금은 자동으로 합산하거나 전파하지 않습니다.</p><ul class="atlas-industry-relations">'+rows+'</ul>'+extra);
}
function hydrateIndustryRecords(scope=document){
 scope.querySelectorAll('details[data-atlas-industry-record][open]').forEach(d=>{const target=d.querySelector('[data-atlas-industry-record-body]');if(!target||target.dataset.hydrated)return;const i=boundPack?.industries?.find(i=>i.id===d.dataset.atlasIndustryRecord);if(!i)return;const e=boundPack?._reader_pair?.reader?.editorial?.[i.id]||A.normalizeIndustry(i)?.editorial;const pre=document.createElement('pre');pre.className='atlas-industry-original';pre.textContent=JSON.stringify({industry:i,editorial:e,registered_edges:(boundPack.edges||[]).filter(e=>e.from===i.id||e.to===i.id)},null,2);target.appendChild(pre);target.dataset.hydrated='true'});
}
document.addEventListener('toggle',event=>{if(event.target.matches('details[data-atlas-industry-record]')&&event.target.open)hydrateIndustryRecords(event.target.parentElement)},true);
function industryCardGapHTML(card,industry){return '<section class="atlas-reading" data-reading-kind="company-card-gap" data-reader-ticker="'+esc(card.ticker)+'"><h3 class="atlas-reading-lead">산업 카드와 회사 원장은 구분합니다.</h3><p>'+esc((card.name||card.ticker)+'는 '+industry.name+' 산업 카드에 있으나 회사 원장에서 같은 키의 연결을 확인하지 못했습니다. DD 완료·미완이나 가격 밴드를 임의로 승계하지 않습니다.')+'</p>'+fold('산업 카드 원 기록','<pre class="atlas-industry-original">'+esc(JSON.stringify(card,null,2))+'</pre>')+'</section>'}
function industryPublicationDate(value){return String(value||'발행일 확인 필요').replace('; exact clock unknown',' · 시각 미상').replace(' (document masthead); exact day/time unknown',' · 문서 표지 기준, 정확한 발행일·시각 미상')}
function industryHTML(i){
 const m=A.normalizeIndustry(i);if(!m)return '';const raw=boundPack?.industries?.find(x=>x.id===m.id)||i;const e=m.editorial;
 if(!e)return '<section class="atlas-reading atlas-industry-reading" data-reading-kind="industry" data-reader-industry="'+esc(m.id)+'"><h3>'+esc(m.name)+'</h3><p>읽기 자료의 판본을 확인할 수 없습니다. 원 기록의 날짜와 범위를 먼저 확인합니다.</p><details class="atlas-preserved" data-atlas-industry-record="'+esc(m.id)+'"><summary>산업·관계의 원 기록</summary><div class="atlas-preserved-body" data-atlas-industry-record-body></div></details></section>';
 const cards=list(e.evidence_cards);const facts=list(e.change);const limits=list(e.limit);const next=list(e.next);
 const evidence=cards.map(s=>'<article class="atlas-industry-evidence"><div class="atlas-industry-evidence-top">'+(s.company?industryCompanyLink(s.company,m.id,s.label||s.company):'<b>'+esc(s.label||'공개 근거')+'</b>')+'<time>'+esc(industryPublicationDate(s.publication_date))+'</time></div>'+para(s.claim)+'<small>'+esc(s.period||'측정기간은 원 기록 참조')+'</small><div class="atlas-reading-sources">'+sourceHTML(s.url?[s.url]:[])+'</div></article>').join('');
 const details=cards.map(s=>'<article class="atlas-industry-source-detail"><h5>'+esc(s.label||s.company||'공개 근거')+'</h5>'+para([s.publication_date?'발표 '+industryPublicationDate(s.publication_date):'발행일 미확인',s.period,s.claim,s.boundary].filter(Boolean))+'<div class="atlas-reading-sources">'+sourceHTML(s.url?[s.url]:[])+'</div></article>').join('')+section('판단의 이유',facts)+para(limits.slice(1))+'<p class="atlas-industry-note">본문 편집일은 사업·가격의 새 관측일이 아닙니다. 전망·계약·허가를 실제 납품·가동·현금으로 바꾸지 않습니다.</p>';
 const selected=list(e.navigation_companies).map(t=>industryCompanyLink(t,m.id)).join('');
 return '<section class="atlas-reading atlas-industry-reading" data-reading-kind="industry" data-reader-industry="'+esc(m.id)+'"><div class="atlas-industry-clock">보존 근거 · 출처별 기간 구분</div><h3 class="atlas-reading-lead">'+esc(e.headline||m.name+'의 수급과 확인 조건')+'</h3><div class="atlas-industry-state"><span>'+esc(INDUSTRY_TIER[m.tier]||m.tier)+'</span><span>'+esc(INDUSTRY_BALANCE[raw.balance]||'수급 범위 확인')+'</span><span>'+esc(INDUSTRY_CYCLE[raw.cycle_stage]||raw.cycle_stage||'사이클 미확인')+'</span></div><p class="atlas-industry-role">'+esc(e.role||m.role||'')+'</p>'+'<h4 class="atlas-industry-heading">판단을 뒷받침하는 근거</h4>'+evidence+'<aside class="atlas-industry-counter"><h4>판단을 늦추는 반대 근거</h4>'+para(limits.slice(0,1))+'</aside><h4 class="atlas-industry-heading">다음에 확인할 질문</h4><ul class="atlas-industry-next">'+next.map(t=>'<li>'+esc(t)+'</li>').join('')+'</ul>'+(selected?'<div class="atlas-industry-comparisons" aria-label="등록 회사 비교 링크">'+selected+'</div><p class="atlas-industry-note">등록된 산업 소속의 비교 대상 · 수혜 확정·순위 아님</p>':'')+fold('판단의 이유·출처·수치 정의와 추가 반증',details)+industryCompanyRegister(raw)+industryRelationsHTML(raw)+'<details class="atlas-preserved" data-atlas-industry-record="'+esc(m.id)+'"><summary>산업·관계·이전 설명의 원 기록</summary><div class="atlas-preserved-body" data-atlas-industry-record-body><p class="atlas-industry-note">날짜·수치·출처·판정·보류와 이전 편집문을 그대로 대조하는 기록입니다. 내부 검토 표현을 포함합니다.</p></div></details><p class="atlas-industry-note">'+esc(e.scope||'선택된 과거 근거의 제한 판단입니다. 산업 전체의 현재 운영 검증 완료를 뜻하지 않습니다.')+' 매매 신호가 아닙니다.</p></section>';
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
 for(const e of stage.children)if(e!==panel){e.inert=modal;if(e instanceof SVGElement){e.toggleAttribute('inert',modal);if(modal)e.setAttribute('aria-hidden','true');else e.removeAttribute('aria-hidden')}}
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
/* Reviewed industry reading hierarchy shared by all four routes. */
.atlas-industry-reading{padding-top:10px;font-size:15px;line-height:1.65}.atlas-industry-reading .atlas-reading-lead{font-size:22px;line-height:1.4;margin:7px 0 10px}.atlas-industry-reading p,.card .atlas-industry-reading p{font-size:15px!important;line-height:1.65!important;margin:5px 0 9px!important}.atlas-industry-clock{font-size:11px;color:var(--atlas-read-muted)}.atlas-industry-state{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 12px}.atlas-industry-state span{font-size:11.5px;border:1px solid var(--atlas-read-line);border-radius:4px;padding:3px 8px;color:var(--atlas-read-muted)}.atlas-industry-reading .atlas-industry-role{font-size:12px!important;line-height:1.65!important;color:var(--atlas-read-muted)!important;margin-bottom:12px!important}.atlas-industry-heading{font-size:12px;font-weight:650;line-height:1.6;color:var(--atlas-read-muted);margin:18px 0 7px}.atlas-industry-evidence{border-top:1px solid var(--atlas-read-line);padding:10px 0 7px}.atlas-industry-evidence-top{display:flex;align-items:baseline;justify-content:space-between;gap:8px}.atlas-industry-evidence-top time{font-size:11px;color:var(--atlas-read-muted);max-width:52%;overflow-wrap:anywhere;text-align:right}.atlas-industry-evidence-top>a,.atlas-industry-evidence-top>b{font-size:14px;font-weight:650;min-height:30px;display:inline-flex;align-items:center}.atlas-industry-reading a{color:inherit;text-underline-offset:4px;text-decoration-color:#7b8a93}.atlas-industry-evidence small,.atlas-industry-reading small{font-size:11.5px;line-height:1.65;color:var(--atlas-read-muted)}.atlas-industry-evidence .atlas-reading-sources{font-size:11px;margin:6px 0 0}.atlas-industry-evidence .atlas-reading-sources a{min-height:28px;max-width:100%;overflow-wrap:anywhere;display:inline-flex;align-items:center}.atlas-industry-counter{border-left:2px solid var(--atlas-read-accent);padding:2px 0 2px 13px;margin:18px 0}.atlas-industry-counter h4{font-size:12px;color:var(--atlas-read-accent);margin:0 0 7px}.atlas-industry-next{padding-left:21px;font-size:14px;line-height:1.8;margin:8px 0 16px}.atlas-industry-next li{padding:3px 0}.atlas-industry-reading .atlas-preserved{border-top:1px solid var(--atlas-read-line);margin:0!important;padding:0!important}.atlas-industry-reading .atlas-preserved>summary{font-size:13px!important;line-height:1.6!important;min-height:48px;padding:12px 0!important;cursor:pointer}.atlas-industry-reading .atlas-preserved-body{padding:6px 0 18px}.atlas-industry-reading .atlas-preserved-body p{font-size:14px!important;line-height:1.75!important}.atlas-industry-reading .atlas-industry-note,.card .atlas-industry-reading .atlas-industry-note{font-size:11.5px!important;line-height:1.65!important;color:var(--atlas-read-muted)!important}.atlas-industry-comparisons{display:flex;flex-wrap:wrap;gap:8px 14px}.atlas-industry-comparisons>a{font-size:13px;min-height:36px;display:inline-flex;align-items:center;gap:4px}.atlas-industry-company-register,.atlas-industry-relations{list-style:none;padding:0!important}.atlas-industry-company-register li,.atlas-industry-relations li{margin:0;padding:10px 0;border-bottom:1px solid var(--atlas-read-line)}.atlas-industry-company-register a,.atlas-industry-node-link{min-height:36px;display:inline-flex;align-items:center;gap:6px}.atlas-industry-company-register small{display:block}.atlas-industry-relations .atlas-industry-relation-name{font-size:12px;color:var(--atlas-read-muted);margin:5px 0}.atlas-industry-source-detail{padding:12px 0;border-bottom:1px solid var(--atlas-read-line)}.atlas-industry-source-detail h5{font-size:14px;margin:0 0 6px}.atlas-industry-original{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px!important;line-height:1.7!important}.atlas-context-key{position:absolute;left:16px;top:44px;z-index:2;max-width:calc(100% - 590px);background:rgba(20,23,26,.94);padding:7px 10px;border:1px solid var(--line);border-radius:5px;color:#bdc6cc;font-size:11px;line-height:1.6;pointer-events:none}.edge.atlas-held-context{stroke:#a3adb5!important;stroke-opacity:.52!important;stroke-dasharray:5 5;stroke-width:1.4;marker-end:none!important}.edge.atlas-derived-context{marker-end:none!important}.node.atlas-registered-context .lbl{fill:#c3cbd0}.node.atlas-registered-context circle.core{fill-opacity:.55;stroke-opacity:.65}.node.atlas-registered-context polygon{fill-opacity:.55}
@media(max-width:900px){.atlas-context-key{display:none}.atlas-industry-reading .atlas-reading-lead{font-size:21px}.atlas-industry-evidence-top>a{min-height:36px}.atlas-industry-comparisons>a{min-height:44px}}
/* Full industry cards must not stretch to a neighboring card's history height. */
.cards{align-items:start;grid-template-columns:repeat(auto-fill,minmax(min(100%,430px),1fr))}.card,.card-h,.card-h h3,.atlas-industry-reading,.theme{min-width:0;max-width:100%;overflow-wrap:anywhere}.card{scroll-margin-top:70px}.theme{scroll-margin-top:70px}.block{min-width:0;overflow-wrap:anywhere}table.rank{table-layout:fixed}table.rank td{overflow-wrap:anywhere}.card .atlas-reading-sources{max-width:100%}.card .atlas-industry-original{max-width:100%}.card .atlas-industry-state span{border-color:#c7ccc9}.jump .atlas-back{margin:0;font-size:11px;min-height:30px}
@media(max-width:720px){.cards{grid-template-columns:minmax(0,1fr)}.jump .atlas-back{min-height:44px}}

`;document.head.appendChild(css);
root.ATLAS_READING={bindPack,companyHTML,industryHTML,industryRelationsHTML,industryCardGapHTML,hydrateIndustryRecords,relationLabel:type=>RELATION_LABELS[type]||type,fold,graphSheet,flowSheet};
})(window);
