/* Read-only price presentation. No conversion, band calculation, or PACK writes. */
(function(root){
  'use strict';
  const ZONE={AGGRESSIVE:'적극 관심 구간',ATTRACTIVE:'매력 구간',WATCH:'관망',AVOID:'회피',UNKNOWN:'판단 불가'};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const currency=v=>typeof v==='string'&&/^[A-Za-z]{3}$/.test(v.trim())?v.trim().toUpperCase():'';
  const finite=v=>typeof v==='number'&&Number.isFinite(v);
  const money=(value,code)=>finite(value)?(code?code+' '+value:value+' (통화 미기재)'):'—';
  function describe(n){
    const s=n.stance_state||{}, p=s.price||{}, r=n.deep_dive_ref||{}, a=r.atlas_stance||{};
    const snapshot=p.source==='deep_dive_pack_snapshot';
    // A DD snapshot can inherit its explicit contract currency. A later quote cannot.
    const quoteCurrency=currency(p.currency)||(snapshot?currency(a.currency):'');
    const bandCurrency=currency(a.currency);
    const price=money(p.value,quoteCurrency);
    const suppressed=!!s.display_suppressed||s.freshness==='STALE'||s.tripwire_status==='RED';
    const mismatch=!!(quoteCurrency&&bandCurrency&&quoteCurrency!==bandCurrency);
    const sourceLabelUnknown=a.label==='UNKNOWN';
    const zone=sourceLabelUnknown?'UNKNOWN':(s.zone||'UNKNOWN');
    const comparisonReview=n.price_comparison_review||{};
    const comparison=s.comparison_basis&&typeof s.comparison_basis==='object'?s.comparison_basis:null;
    return {price,quoteCurrency,bandCurrency,mismatch,suppressed,zone,comparison,
      sourceLabelUnknown,highlightAllowed:!suppressed&&!mismatch&&!sourceLabelUnknown&&zone!=='UNKNOWN',
      kind:snapshot?'DD 원본 가격 스냅샷':'관측 가격 스냅샷',
      asof:p.as_of||'미기재',source:p.source||'미기재',ddAsOf:r.as_of||'미기재',
      freshness:s.freshness||'미기재',tripwire:s.tripwire_status||'UNKNOWN',
      refresh:s.refresh_status||'',note:typeof p.note==='string'?p.note:'',
      basis:typeof a.derived_note==='string'?a.derived_note:'',
      unit:p.unit||'미기재',rawValue:p.raw_value,rawCurrency:p.raw_currency||'',rawUnit:p.raw_unit||'미기재',normalizationFactor:p.normalization_factor,
      suppressionReason:typeof s.suppression_reason==='string'?s.suppression_reason:'',priorTripwire:s.prior_tripwire_status||'미기재',
      ladder:Array.isArray(a.ladder)?a.ladder:null,contractPriceAsOf:a.price_asof||'미기재',
      blockingReasons:Array.isArray(comparisonReview.blocking_reasons)?comparisonReview.blocking_reasons:[],
      status:suppressed?'표시 억제 · 저장 위치 '+zone:(ZONE[zone]||zone)+' · '+zone};
  }
  function html(n){
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
    const historical=d.basis?line('과거 DD 계약 설명',d.basis)+line('계약 설명의 시점','계약 반영 당시 기록입니다 (반영일은 별도 미기재). DD 검증일 '+d.ddAsOf+' / 계약 가격 기준일 '+d.contractPriceAsOf+'. 계약의 current price 등 표현은 새 관측 가격에 대한 설명이 아닙니다.') :'';
    // Numeric/action bands stay folded under suppression; factual quarantine caveats
    // without bands (e.g. IBM) remain visible in neutral prose.
    const contract=d.suppressed&&d.ladder&&d.ladder.length&&historical?'<details><summary>과거 DD 계약 설명 · 밴드 포함 (접힘)</summary>'+historical+'</details>':historical;
    const bandStructure=d.ladder?(!d.ladder.length?'등록 밴드 없음 (ladder 0개)':d.ladder.some(b=>b.tier==='UNKNOWN')?'등록 밴드 '+d.ladder.length+'개 · 원문 tier=UNKNOWN '+d.ladder.filter(b=>b.tier==='UNKNOWN').length+'개; 의미상 UNKNOWN을 매수/매도로 변환하지 않습니다.':'등록 밴드 '+d.ladder.length+'개 · 원문 공백/미포함 영역은 계약 설명 참조; 보간하지 않습니다.'):'밴드 구조 미기재';
    return '<div class="atlas-price-info" data-zone="'+esc(d.zone)+'" data-suppressed="'+d.suppressed+'" style="font-size:11.5px;line-height:1.65;overflow-wrap:anywhere">'+
      line(d.kind,d.price+' · 관측일 '+d.asof)+line('관측 가격 단위',d.unit)+line('가격 출처',d.source)+
      (d.rawValue!=null?line('원시 호가',String(d.rawCurrency||'통화 미기재')+' '+d.rawValue+' · 원시 단위 '+d.rawUnit+' · 제공된 정규화 계수 '+(d.normalizationFactor??'미기재')):'')+
      comparison+line('저장 상태',d.status)+line('DD 검증일',d.ddAsOf+' · freshness '+d.freshness)+
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
  function reviewHTML(n){
    if(!n)return '';
    const messages=[];
    for(const k of ['identity_review','security_history','evidence_holds']){
      for(const r of (Array.isArray(n[k])?n[k]:[]))messages.push((r.proposal||'검토')+' · '+(r.reason||r.event||'')+(r.quote_comparison==='HOLD'?' · 다른 증권 가격 연결 보류':''));
    }
    if(n.perimeter_review)messages.push('사업 범위 검토 보류 · '+n.perimeter_review.reason);
    if(n.membership_status==='NODE_ONLY_CARD_OMISSION')messages.push('노드 원장 연결 · 산업 카드 명단 누락 이력. 신규 산업 편입으로 세지 않습니다.');
    return industryReviewHTML(n)+[...new Set(messages)].map(m=>'<div class="atlas-review-note" style="font-size:11.5px;line-height:1.65;overflow-wrap:anywhere;border-left:2px solid #8A9099;padding-left:8px;margin:8px 0">'+esc(m)+'</div>').join('');
  }
  function edgeHTML(e){return e&&e.propagation_status==='HOLD'?'<div class="atlas-edge-hold" style="font-size:11.5px;overflow-wrap:anywhere">전파 해석 보류 · '+esc(e.review_note||'')+'</div>':'';}
  function signalReviewHTML(n){
    const r=n&&n.company_signal_review;if(!r)return '';
    const list=v=>Array.isArray(v)?v:v==null?[]:[v];
    const fact=v=>typeof v==='string'?v:(v&&typeof v==='object'?(v.fact||v.finding||v.observation||JSON.stringify(v)):String(v??''));
    const vals=r.display_summary?[r.display_summary]:Array.isArray(r.safe_now)?r.safe_now:[r.safe_now];
    const action=r.action==='HISTORY_AND_NEXT_CHECK_ONLY'?'이력·다음 확인 기록 (변화 없음 판정 아님)':'현재 서술의 제한된 사실 갱신';
    return '<section class="atlas-company-review" style="font-size:11.5px;line-height:1.65;overflow-wrap:anywhere;margin:10px 0"><b>주간 회사별 제한 확인 · '+esc(r.weekly_review_as_of)+'</b><div>'+esc(action)+'</div><div>자료 마감 '+esc(r.cutoff_utc)+' · '+esc(r.scope)+'</div>'+
      vals.filter(v=>v!=null).map(v=>'<p>'+esc(fact(v))+'</p>').join('')+
      list(r.tripwire_observations).map(o=>'<div><b>개별 KPI 관찰</b> '+esc(o.original_kpi||o.original_tripwire_verbatim||'')+' — '+esc(o.assessment||o.status||o.scan_observation_status||'측정 미확립')+'</div>').join('')+
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
      '<div>'+esc(r.classification_note)+'</div><div>기존 마감 '+esc(r.prior_publication_cutoff_utc)+' · 별도 추가창 끝 '+esc(r.separate_extension_end_utc)+'</div>'+
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
  function companyReviewHTML(n){return signalReviewHTML(n)+businessReviewHTML(n)+reusedCoverageHTML(n);}
  function industryReviewHTML(n){
    const r=n&&n.weekly_company_research;if(!r)return '';
    return '<details class="atlas-industry-research" style="font-size:11.5px;line-height:1.65;overflow-wrap:anywhere;margin:10px 0"><summary>산업 본문에 반영한 회사 근거·반증 ('+r.companies.length+')</summary><p>'+esc(r.demand_implication)+'</p><p>'+esc(r.supply_and_counterevidence)+
      '</p><div>개별 기업 신호가 산업 트리거2개 충족을 뜻하지 않습니다. 산업상태 전이 HOLD.</div>'+r.companies.map(c=>'<p><b>'+esc(c.ticker+' · '+c.disposition)+'</b> '+esc(c.scope)+'<br>HOLD · '+esc(c.holds.join('; '))+'<br>'+(c.public_source_urls||[]).map(u=>safeLink(u)).join('<br>')+'</p>').join('')+'</details>';
  }
  function businessCoverageHTML(md){
    const r=md&&md.remaining68_business_integration_20261017;if(!r)return '';
    return '<section class="atlas-business-coverage" style="font-size:12px;line-height:1.65;overflow-wrap:anywhere;padding:10px 0"><b>회사 근거 통합 · 2026-10-17</b>'+
      '<div>355 = 기존 보완235 + 재사용52 + 추가68 · 전체 현재운영 검증 완료를 뜻하지 않습니다.</div>'+
      '<div>추가68: changed53 / stale11 / unavailable1 / follow-up3 · 미완15와 회사별 HOLD 유지</div>'+
      '<div>기존52: changed27 / follow-up24 / unavailable1 · 전사 무변화 판정0</div>'+
      '<div>기존111은 signal scan: 현행서술55 + history/next-check56. 22 DD와5개 중복, 합집합128.</div>'+
      '<div>기존07:53Z와 별도22:00Z 추가창 구분 · extension4 계보/직접회사5 · 가격 관측일·사업근거일·DD일은 서로 다릅니다.</div>'+
      '<details><summary>미완15·시간·증권·관계 한계</summary><p>'+esc(r.nonchanged15.join(' · '))+
      '</p><p>changed도 사업 개선·새 독립사건·전면 DD 완료가 아닙니다. 시간미상 자료, mutable 문서 vintage, FI/FISV 및 BEP/BEPC 등의 증권 매핑과 경제적 전파는 HOLD를 보존합니다.</p></details></section>';
  }
  root.ATLAS_PRICE={describe,html,reviewHTML,edgeHTML,companyReviewHTML,businessReviewHTML,businessCoverageHTML};
})(typeof window!=='undefined'?window:globalThis);
