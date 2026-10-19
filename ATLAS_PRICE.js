/* Read-only price presentation. No conversion, band calculation, or PACK writes. */
(function(root){
  'use strict';
  const ZONE={AGGRESSIVE:'적극 관심 구간',ATTRACTIVE:'매력 구간',WATCH:'관망',AVOID:'회피',UNKNOWN:'판단 불가'};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const currency=v=>typeof v==='string'&&/^[A-Za-z]{3}$/.test(v.trim())?v.trim().toUpperCase():'';
  const finite=v=>typeof v==='number'&&Number.isFinite(v);
  const money=(value,code)=>finite(value)?(code?code+' '+value:value+' (통화 미기재)'):'—';
  function quoteValid(p){
    if(!p||!finite(p.value)||p.value<=0||!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(p.as_of||'')||!Number.isFinite(Date.parse(p.as_of)))return false;
    const day=p.as_of.slice(0,10);if(new Date(day+'T00:00:00Z').toISOString().slice(0,10)!==day)return false;
    if(!/^[A-Z]{3}$/.test(p.currency||'')||!new RegExp('^'+p.currency+'_per_[A-Za-z_]+$').test(p.unit||''))return false;
    if(!/^[A-Za-z0-9._-]+:[A-Za-z0-9._^-]+$/.test(p.listing||''))return false;
    if(['raw_value','raw_currency','normalization_factor'].some(k=>Object.prototype.hasOwnProperty.call(p,k))){
      if(!finite(p.raw_value)||p.raw_value<=0||!finite(p.normalization_factor)||p.normalization_factor<=0||Math.abs(p.value-p.raw_value*p.normalization_factor)>Math.max(1e-10,Math.abs(p.value)*1e-10))return false;
      if(p.raw_currency!==p.currency&&!(p.raw_currency==='ILA'&&p.currency==='ILS'&&p.normalization_factor===0.01&&p.raw_unit==='ILA_per_share'&&p.unit==='ILS_per_share'))return false;
    }
    try{const u=new URL(p.source);return ['http:','https:'].includes(u.protocol)&&!!u.hostname&&!u.username&&!u.password}catch(e){return false}
  }
  function describe(n){
    const s=n.stance_state||{}, p=s.price||{}, r=n.deep_dive_ref||{}, a=r.atlas_stance||{};
    const snapshot=p.source==='deep_dive_pack_snapshot';
    const invalidQuote=!quoteValid(p);
    const comparisonInvalid=n.price_comparison_review?.comparison_eligible===false;
    // A DD snapshot can inherit its explicit contract currency. A later quote cannot.
    const quoteCurrency=currency(p.currency)||(snapshot?currency(a.currency):'');
    const bandCurrency=currency(a.currency);
    const price=invalidQuote?'—':money(p.value,quoteCurrency);
    const suppressed=invalidQuote||!!s.display_suppressed||s.freshness==='STALE'||s.tripwire_status==='RED';
    const mismatch=!!(quoteCurrency&&bandCurrency&&quoteCurrency!==bandCurrency);
    const sourceLabelUnknown=a.label==='UNKNOWN';
    const zone=invalidQuote||comparisonInvalid||sourceLabelUnknown?'UNKNOWN':(s.zone||'UNKNOWN');
    const comparisonReview=n.price_comparison_review||{};
    const comparison=!invalidQuote&&s.comparison_basis&&typeof s.comparison_basis==='object'?s.comparison_basis:null;
    return {price,quoteCurrency,bandCurrency,mismatch,suppressed,zone,comparison,
      sourceLabelUnknown,invalidQuote,gap:invalidQuote||comparisonInvalid||sourceLabelUnknown?null:s.gap_to_attractive_pct,
      historicalObservations:Array.isArray(s.price_observation_history)?s.price_observation_history:[],
      highlightAllowed:!suppressed&&!mismatch&&!sourceLabelUnknown&&!comparisonInvalid&&zone!=='UNKNOWN',
      kind:snapshot?'DD 원본 가격 스냅샷':'관측 가격 스냅샷',
      asof:p.as_of||'미기재',source:p.source||'미기재',ddAsOf:r.as_of||'미기재',
      freshness:s.freshness||'미기재',tripwire:s.tripwire_status||'UNKNOWN',
      refresh:s.refresh_status||'',note:typeof p.note==='string'?p.note:'',
      basis:typeof a.derived_note==='string'?a.derived_note:'',
      unit:p.unit||'미기재',rawValue:p.raw_value,rawCurrency:p.raw_currency||'',rawUnit:p.raw_unit||'미기재',normalizationFactor:p.normalization_factor,
      suppressionReason:invalidQuote?'현재 호가의 값·관측일·출처·통화·단위가 유효하지 않아 UNKNOWN입니다.':typeof s.suppression_reason==='string'?s.suppression_reason:'',priorTripwire:s.prior_tripwire_status||'미기재',
      ladder:Array.isArray(a.ladder)?a.ladder:null,contractPriceAsOf:a.price_asof||'미기재',
      blockingReasons:Array.isArray(comparisonReview.blocking_reasons)?comparisonReview.blocking_reasons:[],
      status:suppressed?'표시 억제 · 저장 위치 '+zone:(ZONE[zone]||zone)+' · '+zone};
  }
  function priceDetailsHTML(n){
    if(!n||!n.stance_state)return '';
    const d=describe(n);
    const line=(label,value)=>'<div><b>'+esc(label)+'</b> '+esc(value)+'</div>';
    const c=d.comparison;
    const comparison=c?line(c.asynchronous_conversion||c.not_observed_TWSE_price?'저장된 조건부 환산 비교값':'저장된 비교값',money(c.value,currency(c.currency))+' · 단위 '+(c.unit||'미기재'))+
      line('저장된 환산식',c.conversion||'미기재')+
      (c.fx_rate!=null?line('제공된 FX',c.fx_rate+' · 기준일 '+(c.fx_date||'미기재')+' · FX 정확 UTC 시각 '+(c.fx_market_timestamp_utc||'미기재')):'')+
      (c.fx_source?line('FX 출처',c.fx_source):'')+(c.ads_ratio_source?line('ADS 비율 출처',c.ads_ratio_source):'')+
      ('asynchronous_conversion' in c?line('비동시 환산',String(c.asynchronous_conversion)):'')+
      ('not_observed_TWSE_price' in c?line('TWSE 실관측 가격 아님',String(c.not_observed_TWSE_price)):''):'';
    const prior=d.historicalObservations.filter(h=>quoteValid(h.price)).map(h=>{
      const rejected=h.kind==='RECEIVED_OLDER_SOURCE_SNAPSHOT_NOT_ADOPTED';
      return line(rejected?'수신한 이전 시점 호가 · 현재 채택 안 함':'과거 정상 관측 · 현재 판단 아님',money(h.price.value,h.price.currency)+' · '+h.price.as_of+
        (rejected?'':' · 당시 '+(h.zone||'UNKNOWN')+' · 당시 gap '+(h.gap_to_attractive_pct??'미확립')))+
        (rejected&&h.reason?line('현재 미채택 사유',h.reason):'')+line('과거 관측 출처',h.price.source);
    }).join('');
    const historical=d.basis?line('과거 DD 계약 설명',d.basis)+line('계약 설명의 시점','계약 반영 당시 기록입니다 (반영일은 별도 미기재). DD 검증일 '+d.ddAsOf+' / 계약 가격 기준일 '+d.contractPriceAsOf+'. 계약의 current price 등 표현은 새 관측 가격에 대한 설명이 아닙니다.') :'';
    // Numeric/action bands stay folded under suppression; factual quarantine caveats
    // without bands (e.g. IBM) remain visible in neutral prose.
    const contract=d.suppressed&&d.ladder&&d.ladder.length&&historical?'<details><summary>과거 DD 계약 설명 · 밴드 포함 (접힘)</summary>'+historical+'</details>':historical;
    const bandStructure=d.ladder?(!d.ladder.length?'등록 밴드 없음 (ladder 0개)':d.ladder.some(b=>b.tier==='UNKNOWN')?'등록 밴드 '+d.ladder.length+'개 · 원문 tier=UNKNOWN '+d.ladder.filter(b=>b.tier==='UNKNOWN').length+'개; 의미상 UNKNOWN을 매수/매도로 변환하지 않습니다.':'등록 밴드 '+d.ladder.length+'개 · 원문 공백/미포함 영역은 계약 설명 참조; 보간하지 않습니다.'):'밴드 구조 미기재';
    return '<div class="atlas-price-diagnostics" data-zone="'+esc(d.zone)+'" data-suppressed="'+d.suppressed+'" style="font-size:11.5px;line-height:1.65;overflow-wrap:anywhere">'+
      line(d.kind,d.price+' · 관측일 '+d.asof)+line('관측 가격 단위',d.unit)+line('가격 출처',d.source)+
      (d.rawValue!=null?line(d.invalidQuote?'실패 입력의 원시값 · 현재 호가 아님':'원시 호가',String(d.rawCurrency||'통화 미기재')+' '+d.rawValue+' · 원시 단위 '+d.rawUnit+' · 제공된 정규화 계수 '+(d.normalizationFactor??'미기재')):'')+
      comparison+(prior?'<details class="atlas-price-history"><summary>과거 정상 호가·미채택 수신 기록 (현재 값 아님)</summary>'+prior+'</details>':'')+line('저장 상태',d.status)+line('DD 검증일',d.ddAsOf+' · freshness '+d.freshness)+
      line('현재 tripwire_status',d.tripwire)+line('과거 prior_tripwire_status',d.priorTripwire)+
      (d.suppressionReason?line('제공된 억제 사유',d.suppressionReason):'')+
      (d.refresh?line('관측 갱신 상태',d.refresh):'')+
      (d.zone==='UNKNOWN'?line('UNKNOWN 개별 사유',d.blockingReasons.length?d.blockingReasons.join('; '):'전용 개별 사유 미기재. 일반 refresh_status 자체는 UNKNOWN 사유가 아닙니다. 제공된 억제 사유와 과거 계약의 유의사항을 별도로 확인하세요.'):'')+
      line('저장된 밴드 구조',bandStructure)+
      (d.mismatch?line('통화·상장 단위 확인','관측 '+d.quoteCurrency+' / 밴드 '+d.bandCurrency+' · 직접 비교 전 ADS/보통주 등 단위와 환산 근거 확인 필요. 저장 위치의 강조는 보류합니다.'):'')+
      (d.suppressed?line('표시 억제 유지','freshness '+d.freshness+' / 현재 KPI '+d.tripwire+' / 과거 KPI '+d.priorTripwire+' · 새 가격 관측만으로 기존 tripwire·밸류에이션 격리 해제를 확인할 수 없습니다.'):'')+
      (d.note?line('가격·비교 근거',d.note):'')+contract+
      line('신선도 의미','FRESH/AGING/STALE는 저장 DD 경과기간이며 회사·KPI 전체 최신 검증 상태가 아닙니다. tripwire UNKNOWN은 확인 완료가 아닙니다.')+line('시점 안내','관측일과 DD 검증일은 별개이며 실시간 가격이 아닙니다.')+'</div>';
  }
  function html(n){
    if(!n||!n.stance_state)return '';
    const d=describe(n),reason=d.blockingReasons.join('; ');
    return '<section class="atlas-price-info atlas-compact-price" data-zone="'+esc(d.zone)+'" data-suppressed="'+d.suppressed+'">'+
      '<b>'+esc(d.kind)+' · '+esc(d.price)+' · '+esc(d.unit)+'</b><div>관측 '+esc(d.asof)+' · 실시간 가격 아님</div>'+
      '<div>'+esc(d.status)+' · 원 DD '+esc(d.ddAsOf)+'</div>'+
      (d.zone==='UNKNOWN'?'<div>비교 HOLD · '+esc(reason||'원 DD 라벨/비교 근거 미확립')+'</div>':'')+
      (d.mismatch?'<div>통화·상장 단위 비교 HOLD · '+esc(d.quoteCurrency)+' / '+esc(d.bandCurrency)+'</div>':'')+
      (d.suppressed?'<div>표시 억제 · '+esc(d.suppressionReason||'DD 경과기간/KPI 상태에 따른 억제 유지')+'</div>':'')+
      '<div>가격 관측과 회사 사업 확인은 별개입니다. FRESH는 DD 경과기간 표시입니다.</div>'+
      '<details class="atlas-price-details"><summary>가격 출처·단위·보존 DD 계약·검수 상세</summary>'+priceDetailsHTML(n)+'</details></section>';
  }
  let boundPack=null;
  function bindPack(pack){boundPack=pack;}
  const core=()=>boundPack?root.ATLAS_READER.selectUpdateRefs(boundPack).judgment.record:null;
  const corePaths=()=>{
    const c=core();if(!c)return [];
    if(Array.isArray(c.propagation_paths))return c.propagation_paths;
    return root.ATLAS_READER.selectUpdateRefs(boundPack).judgment.record_key==='core_rejudgment_20261017'?
      boundPack?.monthly_diff?.remaining68_propagation_review_20261017?.paths||[]:[];
  };
  const revalidationHeld=id=>!!core()?.industry_dispositions?.find(x=>x.industry===id)?.decision?.includes('REVALIDATION_HOLD');
  function coreBadgeHTML(id){
    const d=core()?.industry_dispositions?.find(x=>x.industry===id);
    return d?.decision?.includes('REVALIDATION_HOLD')?'<span class="atlas-current-status" data-industry="'+esc(id)+'" style="display:inline-block;max-width:100%;font-size:10.5px;line-height:1.5;color:#E2A63F;white-space:normal">HEAT 이월 · 현재 재검증 HOLD</span>':'';
  }
  function sourceLinks(ids){
    const registry=core()?.source_registry||{};
    return [...new Set(ids||[])].map(id=>{
      const s=registry[id];if(!s)return '';
      const date=s.current_documents?.published_on;
      return (s.canonical_public_urls||[]).map((url,i)=>safeLink(url,id+(date&&s.current_documents.urls?.includes(url)?' · 문서 '+date:' · 보존/대조 근거')+(i?' · '+(i+1):''))).join('<br>');
    }).filter(Boolean).join('<br>');
  }
  function corePathHTML(p){
    const names=(p.path||[]).map(id=>boundPack?.industries?.find(n=>n.id===id)?.name||id);
    const effect={MIXED:'양면',PRESSURE:'반대 압력',AMPLIFY:'제한 강화'}[p.economic_effect]||'경제효과 미판정';
    return '<div class="atlas-core-path" data-review-id="'+esc(p.review_id)+'" style="margin:12px 0;padding-left:8px;border-left:2px solid #59636D"><b>'+esc(p.review_id+' · '+names.join(' → '))+'</b><div>'+esc((p.assessment==='STOP_SCOPE_OR_UNMEASURED'?'범위·측정 미확립으로 중단':'제한 감시 · 상태 전이 없음')+' · '+effect)+'</div><p>'+esc(p.economic_reason_ko)+'</p><div>다음 확인 · '+esc(p.next_check_ko)+'</div><details><summary>등록 경로·공개 근거</summary><div>'+esc(p.mechanism)+'</div>'+(p.edge_trace||[]).map(e=>'<div>'+esc(e.hop+'홉 · '+e.type+' / '+e.strength+' / '+e.direction+' · 등록 시차 '+e.lag)+'</div>').join('')+sourceLinks(p.source_ids)+'</details></div>';
  }
  function coreIndustryHTML(n){
    const c=core();if(!c||!n?.id)return '';
    const d=c.industry_dispositions.find(x=>x.industry===n.id),g=(c.closed_judgments||[]).find(x=>x.industry===n.id);
    const paths=corePaths().filter(p=>p.path.includes(n.id));
    if(!d&&!paths.length)return '';
    let h='<section class="atlas-core-industry" data-industry="'+esc(n.id)+'" style="font-size:11.5px;line-height:1.7;overflow-wrap:anywhere;margin:12px 0">';
    if(d){
      h+='<b>현재 제한 재판단 · '+esc((c.correction_read_at_utc||c.integration_recorded_at_utc||c.read_recorded_on||'기록일 미기재').slice(0,10))+'</b><div>'+coreBadgeHTML(n.id)+'</div><p>'+esc(g?.judgment||d.decision||d.reason||d.status)+'</p>'+
        '<div>사업 자료 마감 '+esc(c.research_cutoff_utc)+(c.correction_read_at_utc?' · 원문 재열람/교정 '+esc(c.correction_read_at_utc):'')+'</div>';
      if(d.axes_ko)h+='<div>수급·방향 · '+esc(d.axes_ko.balance_direction)+'</div><div>사이클·변화율 · '+esc(d.axes_ko.cycle_rate)+'</div><div>시장인지 보조축 · '+esc(d.axes_ko.market_read)+'</div>';
      else h+=(d.status?'<div>현재 확인 범위 · '+esc(d.status)+'</div>':'')+(d.counterevidence?'<div>반대근거 · '+esc(d.counterevidence)+'</div>':'');
      const next=Array.isArray(d.next_questions)?d.next_questions.join(' / '):d.next_check;
      if(next)h+='<p>다음 확인 · '+esc(next)+'</p>';
      if(g){h+='<details><summary>연결 기업·후보와 근거 정산</summary>'+g.company_reviews.map(r=>'<p><b>'+esc(r.tickers.join(' · '))+'</b> '+esc(r.decision_ko)+'</p>').join('')+'<p>'+esc(g.candidate_result)+'</p>'+
        (g.incident_inbound_review||[]).map(r=>'<p>인바운드 재검토 소환 · '+esc(r.nodes?.join(' · ')||r.node)+' · '+esc(r.reason_ko)+'</p>').join('')+
        '<div>인바운드 소환은 반대 방향의 인과 전파를 확정한 것이 아닙니다.</div>'+sourceLinks(g.sources)+'</details>';}
    }
    if(paths.length)h+='<details class="atlas-core-paths"><summary>이 회차의 등록 관계 검토 · '+paths.length+'경로</summary><p>최대 2홉의 제한 검토입니다. 첫 홉 미성립·상품 범위·측정 공백에 따라 중단하며 산업상태를 자동 전이하지 않습니다.</p>'+paths.map(corePathHTML).join('')+'</details>';
    return h+'</section>';
  }
  function coreCompanyHTML(n){
    const c=core();if(!c||!n?.ticker)return '';
    const groups=(c.closed_judgments||[]).filter(g=>g.company_reviews.some(r=>r.tickers.includes(n.ticker)));
    const cr=c.candidate_reviews?.find(r=>r.ticker===n.ticker),candidate=boundPack.monthly_diff.deep_dive_candidates.find(r=>r.ticker===n.ticker);
    const recall=n.ticker==='UBER'&&c.conditional_UBER_evaluation?.applied;
    if(!groups.length&&!cr&&!recall)return '';
    let h='<section class="atlas-core-company" data-ticker="'+esc(n.ticker)+'" style="font-size:11.5px;line-height:1.7;overflow-wrap:anywhere;margin:12px 0"><b>회사에 전달한 제한 재판단 · '+esc((c.correction_read_at_utc||c.integration_recorded_at_utc||c.read_recorded_on||'기록일 미기재').slice(0,10))+'</b><div>기존 자료 마감 '+esc(c.research_cutoff_utc)+' · 전면 DD·사업 전체 최신 검증이 아닙니다.</div>';
    for(const g of groups)for(const r of g.company_reviews)if(r.tickers.includes(n.ticker))h+='<p>'+esc(r.decision_ko)+'</p>';
    if(candidate&&(cr||recall))h+='<div class="atlas-core-candidate"><b>현재 후보 원장 · '+esc(candidate.type+' / '+candidate.status)+'</b><p>'+researchText(candidate.rationale)+'</p><div>보존된 반증 기준 · '+esc(candidate.falsifier)+'</div><div>다음 검토 · '+esc(candidate.horizon)+'</div><div>원 DD·밴드·KPI와 가격 관측은 보존합니다.</div></div>';
    const ids=[...groups.flatMap(g=>g.sources),...(cr?.sources||[]),...(recall?['GOV','UBER','AAR','JBHT']:[])];
    return h+'<details><summary>판단의 공개 근거</summary>'+sourceLinks(ids)+'</details></section>';
  }
  function reviewHTML(n){
    if(!n)return '';
    const messages=[];
    for(const k of ['identity_review','security_history','evidence_holds']){
      for(const r of (Array.isArray(n[k])?n[k]:[]))messages.push((r.proposal||'검토')+' · '+(r.reason||r.event||'')+(r.quote_comparison==='HOLD'?' · 다른 증권 가격 연결 보류':''));
    }
    if(n.perimeter_review)messages.push('사업 범위 검토 보류 · '+n.perimeter_review.reason);
    if(n.membership_status==='NODE_ONLY_CARD_OMISSION')messages.push('노드 원장 연결 · 산업 카드 명단 누락 이력. 신규 산업 편입으로 세지 않습니다.');
    return coreIndustryHTML(n)+industryReviewHTML(n)+[...new Set(messages)].map(m=>'<div class="atlas-review-note" style="font-size:11.5px;line-height:1.65;overflow-wrap:anywhere;border-left:2px solid #8A9099;padding-left:8px;margin:8px 0">'+esc(m)+'</div>').join('');
  }
  function edgeHTML(e){
    if(!e)return '';
    const from=e.from||e.a?.id,to=e.to||e.b?.id;
    const rows=corePaths().filter(p=>p.path.some((id,i)=>id===from&&p.path[i+1]===to));
    return (e.propagation_status==='HOLD'?'<div class="atlas-edge-hold" style="font-size:11.5px;overflow-wrap:anywhere">전파 해석 보류 · '+esc(e.review_note||'')+'</div>':'')+
      (rows.length?'<details class="atlas-edge-current" onclick="event.stopPropagation()" style="font-size:11.5px;line-height:1.7;overflow-wrap:anywhere"><summary>이 회차의 관계 판단 · '+rows.length+'경로</summary>'+rows.map(corePathHTML).join('')+'</details>':'');
  }
  function signalReviewHTML(n){
    const r=n&&n.company_signal_review;if(!r)return '';
    const list=v=>Array.isArray(v)?v:v==null?[]:[v];
    const fact=v=>typeof v==='string'?v:(v&&typeof v==='object'?(v.fact||v.finding||v.observation||JSON.stringify(v)):String(v??''));
    const vals=r.display_summary?[r.display_summary]:Array.isArray(r.safe_now)?r.safe_now:[r.safe_now];
    const action=r.action==='HISTORY_AND_NEXT_CHECK_ONLY'?'이력·다음 확인 기록 (변화 없음 판정 아님)':'현재 서술의 제한된 사실 갱신';
    return '<section class="atlas-company-review" style="font-size:11.5px;line-height:1.65;overflow-wrap:anywhere;margin:10px 0"><b>주간 회사별 제한 확인 · '+esc(r.weekly_review_as_of)+'</b><div>'+esc(action)+'</div><div>자료 마감 '+esc(r.cutoff_utc)+' · '+esc(r.scope)+'</div>'+
      vals.filter(v=>v!=null).map(v=>'<p>'+esc(fact(v))+'</p>').join('')+
      list(r.tripwire_observations).map(o=>'<div><b>개별 KPI 관찰</b> '+esc(o.original_kpi||o.original_tripwire_verbatim||o.original_tripwire||'')+' — '+esc(o.assessment||o.status||o.scan_observation_status||o.post_dd_observation||'측정 미확립')+'</div>').join('')+
      list(r.limits).map(v=>'<div>한계 · '+esc(v)+'</div>').join('')+
      '<div>전면 DD·모든 KPI 재검증이 아닙니다. 아래 보존 필드의 “현” 수치와 일정은 당시 기록이며, 위 주간 관찰의 시점·분모와 구분합니다.</div></section>';
  }
  function safeLink(url,label){
    try{const u=new URL(url);if(!['https:','http:'].includes(u.protocol))return esc(label||url);}
    catch(e){return esc(label||url);}
    return '<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:underline;text-underline-offset:2px">'+esc(label||url)+'</a>';
  }
  function researchText(value){
    // Escape every text span before interpreting only explicit HTTP(S) links.
    const s=String(value??'');const re=/\[([^\]]+)\]\((https?:\/\/[^\s]+?)\)/g;
    let out='',last=0,m;
    while((m=re.exec(s))){out+=esc(s.slice(last,m.index))+safeLink(m[2],m[1]);last=re.lastIndex;}
    return (out+esc(s.slice(last))).replace(/\*\*/g,'').replace(/\n/g,'<br>');
  }
  function businessReviewHTML(n){
    const r=n&&n.weekly_business_review;if(!r)return '';
    const source=(s)=>'<li>'+safeLink(s.url,s.source_id||'공개 근거')+' · 출판 '+esc(s.published||s.publication_precision||'개별 본문 참조')+
      ' · 경제기간/단계 '+esc(s.economic_period||s.economic_period_and_stage||'개별 본문 참조')+
      '<div>이전 연구 열람범위 · '+esc(s.read_depth||s.prior_research_read_depth||'개별 본문 참조')+'</div>'+
      (s.cutoff_relation?'<div>조사창 · '+esc(s.cutoff_relation)+'</div>':'')+'</li>';
    const relation=(n.business_relationship_observations||[]).map(e=>'<li>'+esc(e.from_ticker+' → '+(e.to_ticker||'본문 당사자')+' · '+e.observed_stage)+
      '<div>경제적 전파 HOLD · '+esc(e.remaining_hold)+'</div></li>').join('');
    return '<section class="atlas-business-review" data-ticker="'+esc(n.ticker)+'" data-disposition="'+esc(r.disposition)+'" style="font-size:11.5px;line-height:1.65;overflow-wrap:anywhere;margin:10px 0">'+
      '<b>회사 사업근거 · '+esc(r.review_recorded_on)+' · '+esc(r.disposition)+'</b><p>'+researchText(r.scope)+'</p>'+
      '<details class="atlas-audit-details"><summary>연구 범위·검수 설명</summary><div>'+esc(r.classification_note)+'</div></details><div>기존 마감 '+esc(r.prior_publication_cutoff_utc)+' · 별도 추가창 끝 '+esc(r.separate_extension_end_utc)+'</div>'+
      '<div>원자료의 날짜·경제기간을 따릅니다. 연구 수신·통합은 새 원문 전수조사가 아닙니다.</div>'+
      '<ul class="atlas-business-holds">'+(r.holds||[]).map(x=>'<li>HOLD · '+esc(x)+'</li>').join('')+'</ul>'+
      '<details class="atlas-business-evidence"><summary>사실·반대근거·공개 출처 보기</summary>'+
      (r.narrative_paragraphs||[]).map(x=>'<p>'+researchText(x)+'</p>').join('')+
      '<div>추가창 판정 · '+esc(r.extension_status)+'</div>'+
      (relation?'<b>관계 관측과 전파 한계</b><ul>'+relation+'</ul>':'')+
      '<b>공개 출처와 원래 열람범위</b><ul>'+(r.source_records||[]).map(source).join('')+'</ul><div>아래 참조 링크에는 탐색·미열람 자료도 포함됩니다. 근거 등급과 한계는 위 본문을 따릅니다.</div>'+
      '<ul>'+(r.public_source_urls||[]).map(u=>'<li>'+safeLink(u)+'</li>').join('')+'</ul></details></section>';
  }
  function reusedCoverageHTML(n){
    const r=n&&n.reused_business_coverage;if(!r)return '';
    return '<section class="atlas-reused-business-review" style="font-size:11.5px;line-height:1.65;overflow-wrap:anywhere;margin:10px 0"><b>기존 회사연구 재사용 · '+esc(r.disposition)+
      '</b><div>원 DD/조사기점 '+esc(r.original_dd_and_scan_dates)+'</div><p>'+esc(r.bounded_facts)+'</p><div>HOLD·다음 확인 · '+esc(r.holds_and_next_check)+
      '</div><div>'+(r.scan_cutoff_utc?'기존 신호조사 마감 '+esc(r.scan_cutoff_utc):'DD 채택 이후 회사별 신호조사 미확립')+
      ' · 22:00Z까지 소급 검증하지 않았습니다. 가격 FRESH는 회사·KPI 전체 최신 검증을 뜻하지 않습니다.</div></section>';
  }
  function companyReviewHTML(n){return coreCompanyHTML(n)+signalReviewHTML(n)+businessReviewHTML(n)+reusedCoverageHTML(n);}
  function industryReviewHTML(n){
    const r=n&&n.weekly_company_research;if(!r)return '';
    return '<details class="atlas-industry-research" style="font-size:11.5px;line-height:1.65;overflow-wrap:anywhere;margin:10px 0"><summary>산업 본문에 반영한 회사 근거·반증 ('+r.companies.length+')</summary><p>'+esc(r.demand_implication)+'</p><p>'+esc(r.supply_and_counterevidence)+
      '</p><div>개별 기업 신호가 산업 트리거2개 충족을 뜻하지 않습니다. 산업상태 전이 HOLD.</div>'+r.companies.map(c=>'<p><b>'+esc(c.ticker+' · '+c.disposition)+'</b> '+esc(c.scope)+'<br>HOLD · '+esc(c.holds.join('; '))+'<br>'+(c.public_source_urls||[]).map(u=>safeLink(u)).join('<br>')+'</p>').join('')+'</details>';
  }
  function businessCoverageHTML(md,meta){
    if(!md||!Object.prototype.hasOwnProperty.call(md,'current_update_refs'))return legacyBusinessCoverageHTML(md,meta);
    let selected;
    try{selected=root.ATLAS_READER.selectUpdateRefs({monthly_diff:md})}
    catch(e){return '<section class="atlas-weekly-source-coverage">현재 회차 참조 확인 필요 · HOLD</section>'}
    const business=selected.business,r=business.record;
    const row=(label,value)=>'<div>'+esc(label)+' · '+esc(value)+'</div>';
    let h='<section class="atlas-weekly-source-coverage" style="font-size:12px;line-height:1.7;overflow-wrap:anywhere;padding:10px 0"><b>회사·산업 근거 검토</b>'+
      row('사업 기록 상태',business.status);
    if(r){
      const companies=Array.isArray(r.company_coverage)?r.company_coverage:[],industries=Array.isArray(r.industry_coverage)?r.industry_coverage:[];
      const counts={};companies.forEach(x=>{counts[x.status]=(counts[x.status]||0)+1});
      h+=row('연구 통합 기록일',r.read_recorded_on||'미기재')+row('사업 근거 마감',r.research_cutoff_utc||r.publication_cutoff_utc||'미기재')+
        row('회사·산업 검토 원장',companies.length+'개 / '+industries.length+'개')+
        row('근거·서술 보완',counts.changed||0)+row('제한 범위 내 중요 변화 미확인',counts['checked-no-material-change']||0)+
        row('stale / unavailable / follow-up',[counts.stale||0,counts.unavailable||0,counts['follow-up']||0].join(' / '));
      if(r.price_refresh?.summary){const p=r.price_refresh.summary;h+=row('이 기록에 보존된 가격 비교',String(p.comparable??'미기재')+' / UNKNOWN '+String(p.UNKNOWN??'미기재'))}
    }else h+=row('사업 판단','이번 역할은 실행하지 않았거나 HOLD입니다. 이전 자료의 날짜를 확인합니다.');
    for(const [role,label] of [['judgment','수급·관계 판단'],['primary_extension','1차 본문 보완'],['gap_completion','잔여 문서 확인'],['coverage','입력·coverage 정산']]){
      const ref=selected[role],record=ref.record;
      h+=row(label,ref.status+' · '+(record?(record.read_recorded_on||record.recorded_at_utc||record.correction_read_at_utc||record.integration_recorded_at_utc||'기록일 미기재'):'실행 기록 없음'));
    }
    return h+row('검증 범위','수신일·검토일은 새 사건일이나 사업 최신성의 대체가 아닙니다. 원 DD·관측 가격 시점과 기존 HOLD를 유지하며 전면 현재운영·주간 운영 완료를 뜻하지 않습니다.')+'</section>';
  }
  function legacyBusinessCoverageHTML(md,meta){
    const r=md&&md.remaining68_business_integration_20261017;if(!r)return '';
    const c=md.core_rejudgment_20261017;
    const w=md.weekly_full_scope_20261018,counts=w?.company_status_counts,prices=w?.price_refresh?.summary;
    const extension=md.weekly_primary_extension_20261018?.summary;
    const latest=w?'<section class="atlas-weekly-source-coverage" style="font-size:12px;line-height:1.7;overflow-wrap:anywhere;padding:10px 0"><b>이번 회사·산업 근거 검토 · '+esc(w.read_recorded_on)+'</b>'+
      '<div>회사 355개·산업 56개의 실제 검색을 수행하고 명시된 출처 범위에서 본문·반증·등록 관계 132개를 대조했습니다.</div>'+
      '<div>회사별 상태: 근거·서술 보완 '+esc(counts?.changed)+' / 제한 범위 내 중요 변화 미확인 '+esc(counts?.['checked-no-material-change'])+' / 후속 확인 '+esc(counts?.['follow-up'])+' / 접근·자료 미확립 '+esc(counts?.unavailable)+'</div>'+
      (extension?'<div>174개 후속 심화: 명시한 1차 핵심 본문을 최소 하나 읽은 회사 '+esc(extension.companies_with_at_least_one_completed_stated_primary_core)+'개 · 선택 관련 본문·표 범위 완료 '+esc(extension.companies_all_selected_relevant_body_and_tables_completed)+'개 / 잔여 '+esc(extension.companies_selected_scope_incomplete)+'개. 원문 미독해·접근 제한·미발표·현재 KPI 미관측을 개별 기록에서 구분합니다. changed에도 경제적 후속 확인이 남습니다.</div>':'')+
      '<div>자료 발행·경제 기간은 개별 원문을 따릅니다. 검토일은 새 사건일이 아니며 전체 현재 운영·새 DD 검증 완료를 뜻하지 않습니다. 기존 미완 15개와 개별 HOLD를 유지합니다.</div>'+
      (prices?'<div>앞선 회차의 사업 판단 뒤 가격 출처 128개 조회 · 채택한 날짜별 관측 '+esc(prices.source_status_counts.RECEIVED_DATED_QUOTE_ACCEPTED)+'개 · 비교 가능 '+esc(prices.comparable)+' / UNKNOWN '+esc(prices.UNKNOWN)+'. 이번 본문 심화에서 새 호가는 요청하지 않았습니다. 미수신·이전 거래일 출처의 비교 보류와 과거 정상 관측을 보존했습니다.</div>':'')+
      '<div>MODE B 비교·재무 HTML 3개는 모두 읽었습니다. 자유형·밴드 없는 DD도 원 규칙상 허용되며, 기존 개별 DD의 교체 대상·원저자 계약 매핑 미확정으로 통관을 보류합니다. 원 DD 날짜·평가 밴드·계약과 산업 상태를 보존했습니다. 아래 10/17 기록은 이전 회차의 범위입니다.</div></section>':'';
    return latest+(c?'<section class="atlas-core-coverage" style="font-size:12px;line-height:1.7;padding:10px 0"><b>수급·관계·후보 제한 재판단 · 2026-10-17</b><div>MAT-02 HEAT 이월 · 현재 재검증 HOLD. 구리 연간 전망·잠정 실제·지역 현물을 분리합니다.</div><div>IND-06 WARM 유지 · 전체 철도 회복을 석탄 호재로 전달하지 않습니다. ITC-05는 AI/서버와 소비 역신호를 분리합니다.</div><div>55경로별 실제 중단 이유·다음 확인과 기존 9개 후보의 개별 반증 평가를 기록했습니다.'+(c.conditional_UBER_evaluation?.applied?' UBER는 10/16 산업 전이의 누락 재소환 1건이며 Freight 중요도 검토에 한정합니다.':'')+'</div><div>이번 교정의 새 산업상태 전이는 0건이며 전체 355개 현재 운영 검증은 미완입니다. 가격 관측 시점은 갱신하지 않았습니다.</div></section>':'')+
      '<section class="atlas-business-coverage" style="font-size:12px;line-height:1.65;overflow-wrap:anywhere;padding:10px 0"><b>회사 근거 통합 · 2026-10-17</b>'+
      '<div>355 = 기존 보완235 + 재사용52 + 추가68 · 전체 현재운영 검증 완료를 뜻하지 않습니다.</div>'+
      '<div>추가68: changed53 / stale11 / unavailable1 / follow-up3 · 미완15와 회사별 HOLD 유지</div>'+
      (meta?.ui_revision?'<div>UI 판본 '+esc(meta.ui_revision.id)+' · 연구 마감 2026-10-16 07:53Z / 별도 추가창 22:00Z</div>':'')+
      '<details class="atlas-audit-details"><summary>연구 범위·날짜·검수 상세</summary>'+
      '<div>기존52: changed27 / follow-up24 / unavailable1 · 전사 무변화 판정0</div>'+
      '<div>기존111은 signal scan: 현행서술55 + history/next-check56. 22 DD와5개 중복, 합집합128.</div>'+
      '<div>기존07:53Z와 별도22:00Z 추가창 구분 · extension4 계보/직접회사5 · 가격 관측일·사업근거일·DD일은 서로 다릅니다.</div>'+
      '<details><summary>미완15·시간·증권·관계 한계</summary><p>'+esc(r.nonchanged15.join(' · '))+
      '</p><p>changed도 사업 개선·새 독립사건·전면 DD 완료가 아닙니다. 시간미상 자료, mutable 문서 vintage, FI/FISV 및 BEP/BEPC 등의 증권 매핑과 경제적 전파는 HOLD를 보존합니다.</p></details>'+
      (meta?.ui_revision?'<p>UI 준비 '+esc(meta.ui_revision.prepared_at_utc)+' · 연구 관측 시각과 다릅니다. <a href="https://github.com/BilBu1127/atlas/actions" target="_blank" rel="noopener noreferrer">게시 실행 이력</a></p>':'')+'</details></section>';
  }
  root.ATLAS_PRICE={bindPack,revalidationHeld,coreBadgeHTML,coreIndustryHTML,coreCompanyHTML,describe,html,reviewHTML,edgeHTML,companyReviewHTML,businessReviewHTML,businessCoverageHTML};
})(typeof window!=='undefined'?window:globalThis);
