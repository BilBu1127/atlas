/* Presentation normalization. Input records remain immutable; no trading/state decisions. */
(function(root){
'use strict';
const arr=v=>v==null?[]:Array.isArray(v)?v:[v];
const unique=xs=>[...new Set(xs.filter(x=>typeof x==='string'&&x.trim()))];
const scalar=v=>typeof v==='string'?v:typeof v==='number'?String(v):'';
let pack=null;
let compatible=false;
let selectedReader=null;
const data=()=>compatible?selectedReader:{translations:{},company_research:{},editorial:{}};
const updateRoles={business:'weekly_full_scope_20261018',judgment:'core_rejudgment_20261017',primary_extension:'weekly_primary_extension_20261018',gap_completion:'weekly_gap_completion_20261018',coverage:'mode_b_drive_backup_reconciliation_20261018'};
function selectUpdateRefs(p){
 const md=p?.monthly_diff||{},refs=md.current_update_refs;
 const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
 const fail=()=>{throw new Error('INVALID_CURRENT_UPDATE_REF')};
 if(!Object.prototype.hasOwnProperty.call(md,'current_update_refs')){
  return Object.fromEntries(Object.entries(updateRoles).map(([role,key])=>[role,{status:Object.prototype.hasOwnProperty.call(md,key)?'DATED_RETAINED':'NOT_RUN',record_key:Object.prototype.hasOwnProperty.call(md,key)?key:null,record:md[key]??null}]));
 }
 if(!object(refs)||refs.schema_version!==1||Object.keys(refs).sort().join('|')!==['schema_version',...Object.keys(updateRoles)].sort().join('|'))fail();
 const result={};
 for(const [role,legacy] of Object.entries(updateRoles)){
  const ref=refs[role];
  if(!object(ref)||Object.keys(ref).sort().join('|')!=='record_key|status'||!['REVIEWED_SCOPED','DATED_RETAINED','NOT_RUN','HOLD'].includes(ref.status))fail();
  const key=ref.record_key;let record=null;
  if(key===null){if(!['NOT_RUN','HOLD'].includes(ref.status))fail();}
  else{
   if(typeof key!=='string'||!/^[A-Za-z0-9_-]+$/.test(key)||key==='current_update_refs'||!object(md[key])||ref.status==='NOT_RUN')fail();
   record=md[key];if(record.update_role!==role&&!(key===legacy&&(record.update_role===undefined||record.update_role===role)))fail();
  }
  result[role]={status:ref.status,record_key:key,record};
 }
 return result;
}
function fingerprint(value){
 // Same ordered UTF-8 leaf stream as the saved fingerprint scheme, without
 // retaining a second full PACK-sized leaves array and joined string.
 let h=2166136261,first=true;
 const byte=b=>{h=Math.imul(h^b,16777619)>>>0};
 function leaf(s){
  if(!first)byte(0);first=false;
  for(let i=0;i<s.length;i++){
   let c=s.charCodeAt(i);
   if(c<128)byte(c);
   else if(c<2048){byte(192|(c>>6));byte(128|(c&63));}
   else{
    if(c>=0xd800&&c<=0xdbff){const d=s.charCodeAt(i+1);if(d>=0xdc00&&d<=0xdfff){c=0x10000+((c-0xd800)<<10)+(d-0xdc00);i++;}else c=0xfffd;}
    else if(c>=0xdc00&&c<=0xdfff)c=0xfffd;
    if(c>0xffff){byte(240|(c>>18));byte(128|((c>>12)&63));byte(128|((c>>6)&63));byte(128|(c&63));}
    else{byte(224|(c>>12));byte(128|((c>>6)&63));byte(128|(c&63));}
   }
  }
 }
 const bytes=new Uint8Array(8),view=new DataView(bytes.buffer),hex=Array.from({length:256},(_,i)=>i.toString(16).padStart(2,'0'));
 function visit(v){if(typeof v==='string')leaf('s:'+v);
  else if(v===null)leaf('null');
  else if(typeof v==='boolean')leaf('b:'+v);
  else if(typeof v==='number'){view.setFloat64(0,v,false);leaf('n:'+Array.from(bytes,b=>hex[b]).join(''));}
  else if(Array.isArray(v))v.forEach(visit);
  else if(v&&typeof v==='object')Object.keys(v).sort().forEach(k=>{leaf('k:'+k);visit(v[k])});}
 visit(value);
 return h.toString(16).padStart(8,'0');
}
function validReviews(pair,r){
 const hex=v=>typeof v==='string'&&/^[0-9a-f]{64}$/.test(v),sameKeys=(x,ks)=>x&&typeof x==='object'&&Object.keys(x).sort().join('|')===ks.slice().sort().join('|');
 const expected=[...Object.keys(r.editorial||{}).map(k=>'editorial:'+k),...Object.keys(r.company_roles||{}).map(k=>'role:'+k),...Object.keys(r.company_research||{}).map(k=>'research:'+k),...Object.keys(r.translations||{}).map(k=>'translation:'+k),'reader_metadata'];
 if(!sameKeys(pair.record_bindings,expected))return false;
 const fields=['review_id','reviewer_role','reviewed_at_utc','decision','evidence_sha256','current_operations_verified'];
 const receiptKey=x=>JSON.stringify([x.record_id,x.input_sha256,x.summary_sha256,...fields.map(f=>x[f])]);
 const receipts=Array.isArray(pair.change_receipts)?new Set():null;
 if(receipts)for(let i=0;i<pair.change_receipts.length;i++){
  if(!(i in pair.change_receipts))continue; // Array.some skips holes.
  const x=pair.change_receipts[i];
  // A null encountered before a matching receipt used to fail closed. Keep
  // that barrier while preserving acceptance of an unreachable null tail.
  if(x==null)break;
  receipts.add(receiptKey(x));
 }
 for(const key of expected){
  const b=pair.record_bindings[key],v=b?.review;if(!hex(b?.input_sha256)||!hex(b?.summary_sha256)||!v||v.current_operations_verified!==false)return false;
  if(v.status==='RETAINED_5G_BASELINE_UNVERIFIED'){if(!sameKeys(v,['status','current_operations_verified']))return false;}
  else if(!sameKeys(v,fields)||!['independent_reviewer','designated_reviewer'].includes(v.reviewer_role)||!['REVISED','RETAIN_DATED'].includes(v.decision)||
   !/^[A-Za-z0-9_.:-]{1,100}$/.test(v.review_id)||!hex(v.evidence_sha256)||!/(?:Z|[+-]\d{2}:\d{2})$/.test(v.reviewed_at_utc)||!Number.isFinite(Date.parse(v.reviewed_at_utc))||
   !receipts||!receipts.has(receiptKey({record_id:key,input_sha256:b.input_sha256,summary_sha256:b.summary_sha256,...v})))return false;
 }
 return true;
}
function selectReader(p){
 if(!p||typeof p!=='object')return null;
 try{selectUpdateRefs(p)}catch(e){return null}
 if(Object.prototype.hasOwnProperty.call(p,'_reader_pair')){
  const pair=p._reader_pair,c=Object.fromEntries(Object.entries(p).filter(([k])=>k!=='_reader_pair')),r=pair?.reader;
  if(pair?.schema_version!==1||pair.content_hash_scheme!=='atlas-pack-core-json-v1'||!r||
    pair.current_operations_verified!==false||pair.automatic_weekly_integration_complete!==false||
    pair.pair_semantic_fingerprint!==fingerprint(Object.fromEntries(Object.entries(pair).filter(([k])=>k!=='pair_semantic_fingerprint')))||
    r.reading_only!==true||r.all_355_current_operations_verified!==false||
    r.pack_hash_scheme!=='atlas-pack-core-json-v1'||r.pack_sha256!==pair.pack_content_sha256||
    !/^[0-9a-f]{64}$/.test(pair.pack_content_sha256)||!/^[0-9a-f]{64}$/.test(pair.reader_content_sha256)||
    r.pack_semantic_fingerprint!==fingerprint(c)||pair.reader_semantic_fingerprint!==fingerprint(r)||
    !r.translations||!r.company_research||!r.editorial||!pair.record_bindings||!validReviews(pair,r))return null;
  return r;
 }
 // Legacy is restricted to the exact saved 5G semantic pair, never a new PACK.
 const r=root.ATLAS_READER_DATA;
 return fingerprint(p)==='fd9df48b'&&r&&fingerprint(r)==='7d87d2e7'?r:null;
}
function acceptPack(p){return !!selectReader(p)}
function bindPack(p){const r=selectReader(p);pack=p;selectedReader=r;compatible=!!r;return compatible;}
let legacyLoad=null;
function ensureLegacy(p){
 // Current paired PACKs carry their reader. Keep the exact dated 5G fallback
 // available without downloading its duplicate data on every current visit.
 if(p&&Object.prototype.hasOwnProperty.call(p,'_reader_pair')||root.ATLAS_READER_DATA)return Promise.resolve();
 if(!legacyLoad)legacyLoad=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src='./ATLAS_READER_DATA.js';
  script.onload=()=>resolve();script.onerror=()=>reject(new Error('보존 읽기 자료 수신 실패'));
  document.head.appendChild(script);
 });
 return legacyLoad;
}
const translate=s=>data().translations[s]||s;
const prose=s=>translate(s).replace(/\[([^\]]+)\]\(https?:\/\/[^\s)]+\)/g,'$1')
 .replace(/https?:\/\/[^\s)]+/g,'').replace(/^#{1,6}\s*/gm,'').replace(/\*\*/g,'').trim();
const plain=v=>typeof v==='string'?v:Array.isArray(v)?v.map(plain).filter(Boolean).join(' · '):v&&typeof v==='object'?
  plain(v.fact||v.finding||v.observation||v.question||v.description||v.text||v.reason||v.rationale||v.remaining_hold)||
  Object.entries(v).map(([k,x])=>k+': '+plain(x)).join(' · '):v==null?'':String(v);
// Candidate triggers are structured contracts: keep every key, state and date.
const recordFields=(v,prefix='')=>v&&typeof v==='object'?
 Object.entries(v).flatMap(([k,x])=>recordFields(x,prefix?prefix+'.'+k:k)):
 [prefix+': '+(v==null?'null':String(v))];
const strings=v=>arr(v).flatMap(x=>typeof x==='string'?[x]:x&&typeof x==='object'?[plain(x)].filter(Boolean):[]);
const urls=(v,out=[])=>{
 // Recursive callers use only the collected array. Deduplicate and filter
 // once after the complete walk, preserving traversal order and raw out.
 function walk(x){if(typeof x==='string'){for(const u of x.match(/https?:\/\/[^\s<>\]`]+/g)||[])out.push(u.replace(/[.,;)]*$/,''));}
  else if(Array.isArray(x))x.forEach(walk);else if(x&&typeof x==='object')Object.values(x).forEach(walk);}
 walk(v);return unique(out).filter(u=>/^https?:\/\//.test(u)&&!/(?:oaiusercontent|\/workspace\/|localhost|127\.0\.0\.1)/i.test(u));};
function nextFields(v){
 if(typeof v==='string')return [v];
 if(Array.isArray(v))return v.flatMap(nextFields);
 if(!v||typeof v!=='object')return [];
 return unique(['question','focus','reason','next_check','next_step','needed_evidence','required_evidence','condition'].flatMap(k=>strings(v[k])));
}
function tripwires(n){
 const r=n.company_signal_review||{};
 return arr(r.tripwire_observations).map((v,k)=>({
  title:v.original_kpi||v.original_tripwire_verbatim||v.original_tripwire||v.unchanged_dd_tripwire||
   n.deep_dive_ref?.kpi_tripwires?.[v.index??v.original_kpi_index??k]||'원 DD 확인 조건 '+(k+1),
  observation:unique([v.observation_note,v.post_dd_observation,v.assessment,v.finding].flatMap(strings)),
  status:v.scan_observation_status||v.status||'',source_ids:arr(v.source_ids),
  canonical_status_changed:v.canonical_status_changed===true,
  pointer:'company_signal_review.tripwire_observations['+k+']'
 }));
}
function sourceRecords(n){
 const rs=[n.company_signal_review,n.weekly_business_review,...arr(n.supplemental_research)].filter(Boolean);
 return rs.flatMap(r=>arr(r.source_records||r.public_sources).map(s=>typeof s==='string'?{url:s}:s))
  .map(s=>({...s,date:s.publication_date||s.published||s.release_date||s.as_of||'',
   read_scope:s.read_depth||s.read_status||s.sections_read||''}));
}
function supplemental(n){return arr(n.supplemental_research).map(s=>({
 as_of:s.as_of,paper_as_of:s.paper_as_of||null,scope:s.scope,
 thesis:s.thesis_evidence||'',kpis:strings(s.kpi_tripwires),
 signals:arr(s.signals).map(x=>({as_of:x.event_as_of,finding:x.finding,limit:x.bounded_limit,next:x.follow_up,url:x.source_url})),
 urls:urls(s),valuation_change:s.valuation_change||'NO_RESET'
}));}
function memberships(n){return arr(n.industries).map(id=>{const i=pack?.industries?.find(x=>x.id===id);return {id,name:i?.name||id,definition:i?.definition||'',card:i?.companies?.find(c=>c.ticker===n.ticker)};});}
function normalizeCompany(n,industry,card){
 if(!n)return null;
 const r=n.company_signal_review||{},w=n.weekly_business_review||{},reuse=n.reused_business_coverage||{},dd=n.deep_dive_ref;
 const saved=arr(data().company_research[n.ticker]);
 const override=data().editorial[n.ticker];
 const ms=memberships(n);
 const industryReview=arr(industry?.weekly_company_research?.companies).find(x=>x.ticker===n.ticker);
 const originalNarrative=strings(w.narrative_paragraphs).map(translate).flatMap(s=>s.split(/\n+/).map(x=>x.trim()).filter(Boolean));
 const narrative=originalNarrative.map(prose).filter(s=>s&&!/^(?:변화·HOLD·후보|Newly read original-window bodies|Stale comparison and risk anchor|Identity:)/.test(s));
 const sourceMetadata=s=>(s.match(/https?:\/\//g)||[]).length>0&&/읽음|본문|lines|추출/.test(s)&&!data().translations[s];
 const factParagraphs=originalNarrative.filter(s=>!sourceMetadata(s)).map(prose)
  .filter(s=>s&&! /^(?:#{1,6}|반대근거|한계|다음|후속|반영 범위|기존 exact|10\/16 exact|변화·HOLD·후보|Newly read|Stale comparison|Identity:|남은 확인|HOLD:|중요 HOLD)/.test(s));
 const datedManagement=dd?.mgmt_verdict?.includes('[주간 확인')?[dd.mgmt_verdict]:[];
 const safe=strings(r.safe_now);
 const facts=unique([
  ...strings(r.display_summary),...strings(w.scope).map(prose).filter(s=>s.length<=600),...factParagraphs,...strings(reuse.bounded_facts),
  ...datedManagement,...(factParagraphs.length?[]:strings(w.scope)),
  ...(!n.weekly_business_review&&!n.company_signal_review&&!saved.length?strings(industryReview?.scope):[]),
  ...saved.flatMap(x=>strings(x.facts_ko)),...safe
 ]);
 const limits=unique([
  ...strings(r.limits),...strings(w.holds),...narrative.filter(s=>/반대근거|미확인|미완료|HOLD|남은 확인|미해결/.test(s)),
  ...saved.flatMap(x=>strings(x.limits_ko)),...strings(reuse.holds_and_next_check),
  ...strings(n.identity_review?.hold),...strings(n.security_history?.hold)
 ]);
 const next=unique([
  ...nextFields(r.focused_next_check),...strings(w.next_check),...strings(w.next_checks),...strings(w.holds),
  ...narrative.filter(s=>/다음|후속|HOLD|남은 확인/.test(s)),
  ...narrative.filter(s=>/^(?:다음|후속)/.test(s)),...saved.flatMap(x=>strings(x.next_ko)),
  ...strings(reuse.holds_and_next_check),...strings(dd?.kpi_tripwires)
 ]);
 const candidates=arr(pack?.monthly_diff?.deep_dive_candidates).filter(c=>(c.ticker||c.company_ticker)===n.ticker);
 const relationships=arr(n.business_relationship_observations);
 const profile=saved.find(x=>x.role_ko)?.role_ko||data().company_roles?.[n.ticker]?.role_ko||null;
 const role=override?.role||profile||dd?.thesis_oneline||
  ms.map(m=>m.card?.chain_position?m.name+'에서 '+m.card.chain_position+' 역할로 등록돼 있습니다. '+
   ((m.card.role_reason||m.card.note||'').split('| 주간 근거')[0].trim()||''):m.name+'와 연결된 조사 대상입니다.').join(' ');
 return {ticker:n.ticker,name:n.name,verification:n.verification,dd_as_of:dd?.as_of||null,
  role,role_kind:override||profile?'source_bound_profile':dd?'dated_dd_thesis':'stored_membership',
  headline:override?.headline||n.name+'의 사업 근거와 남은 확인 조건',
  facts,limits,next,tripwires:tripwires(n),candidates,relationships,memberships:ms,
  editorial:override||null,supplement:saved,addenda:supplemental(n),sources:sourceRecords(n),public_urls:urls([r,w,reuse,saved,n.supplemental_research]),
  dates:{signal:r.weekly_review_as_of||null,recorded:w.review_recorded_on||null,
   cutoff:r.cutoff_utc||w.prior_publication_cutoff_utc||reuse.scan_cutoff_utc||null,
   extension:w.separate_extension_end_utc||null},
  has_company_evidence:!!(facts.length||dd||saved.length||n.supplemental_research||relationships.length),
  coverage:{signal:!!n.company_signal_review,weekly:!!n.weekly_business_review,reused:!!n.reused_business_coverage,
   preserved_research:saved.length,dd:!!dd,full_current_verification:false},
  source_pointers:unique([
   ...Object.keys(r).map(k=>'company_signal_review.'+k),...Object.keys(w).map(k=>'weekly_business_review.'+k),
   ...Object.keys(reuse).map(k=>'reused_business_coverage.'+k),
   ...Object.keys(dd||{}).map(k=>'deep_dive_ref.'+k),
   ...(n.supplemental_research?['supplemental_research']:[]),...(relationships.length?['business_relationship_observations']:[])
  ])};
}
function normalizeIndustry(i){
 if(!i)return null;
 i=pack?.industries?.find(x=>x.id===i.id)||i;
 const w=i.weekly_company_research||{},c=i.current_revalidation,ov=data().editorial[i.id];
 return {id:i.id,name:i.name,role:ov?.role||i.definition,editorial:ov||null,
  facts:unique([...strings(w.demand_implication),...strings(c?.summary),...strings(i.last_review?.reason),...strings(i.tier_rationale),...strings(i.demand?.drivers),...strings(i.demand?.momentum)]),
  limits:unique([...strings(w.supply_and_counterevidence),...strings(i.evidence_holds),...strings(c?.holds),...strings(i.scope_note),...strings(i.supply?.structure),...strings(i.supply?.lead_time),...strings(i.supply?.utilization_inventory)]),
  next:unique([...strings(i.triggers_watchlist),...strings(i.triggers),...strings(w.next_check)]),
  indicators:arr(i.leading_indicators).map(l=>({...l,reading:l.last_reading??l.reading??null})),
  demand:i.demand,supply:i.supply,market_read:i.market_read,cold_reversal_signal:i.cold_reversal_signal,
  tier:i.tier,as_of:i.last_review?.as_of||null,recorded:c?.recorded_at_utc||null,
  public_urls:urls([i.last_review,i.current_revalidation,i.weekly_company_research,i.leading_indicators])};
}
root.ATLAS_READER={bindPack,acceptPack,ensureLegacy,normalizeCompany,normalizeIndustry,nextFields,tripwires,fingerprint,selectUpdateRefs,
 compatible:()=>compatible,translate,prose,strings,urls,unique,plain,recordFields};
})(window);
