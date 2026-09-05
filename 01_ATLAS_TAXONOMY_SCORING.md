# 01_ATLAS_TAXONOMY_SCORING.md
## Global Sector Atlas OS v1.5 (Ontology Layer)
## Role: 분류 체계, 산업 카드 스키마, 수요-공급 채점, 티어 규칙, 출력 스펙
## Authority: Governing taxonomy & scoring specification

---

# 1. 분류 체계 (Taxonomy)

3층 구조:

```
Layer 1  섹터 11개 (GICS 준용):
         에너지 / 소재 / 산업재 / 유틸리티 / IT / 커뮤니케이션 /
         헬스케어 / 금융 / 부동산 / 필수소비재 / 임의소비재

Layer 2  산업 그룹 40~60개 (지도의 기본 단위 = 산업 카드 1장)
         예: 반도체(설계/제조/장비/소재 구분), 조선, 방산, 전력기기,
         원전, 바이오텍, 의료기기, 럭셔리, 크루즈/여행 ...
         BUILD 0에서 확정하고 이후 임의 변경 금지 (추가는 가능, 사유 기록)

Layer 3  크로스 섹터 테마 레이어 (산업을 가로지르는 수요 원천):
         예: AI 인프라, 전력화/그리드, 리쇼어링, 고령화, 비만치료제 파급,
         우주/저궤도, 로봇/자동화, 신냉전 공급망 재편
         테마는 산업 카드를 대체하지 않고 "수요 드라이버"로서 카드에 링크된다
```

원칙: 사용자의 목적은 "관심 없던 산업까지 커버"이므로,
지루한 산업(보험, 철도, 포장재, 폐기물 처리 등)도 카드를 생략하지 않는다.
사이클 반전은 지루한 산업에서 가장 크게 온다.

---

# 2. 산업 카드 스키마 (Layer 2 기본 단위)

```
[산업명] — 한 줄 경제 정의
AS_OF: YYYY-MM

① 수요 구조 (3~5문장):
   무엇이 수요를 만드는가 / 구조적 vs 경기적 분해 /
   현재 수요 모멘텀 방향 (가속·정체·감속)
② 공급 구조 (3~5문장):
   공급 능력과 증설 파이프라인 / 증설 리드타임 /
   진입장벽의 실체 / 현재 가동률·재고 수준 정황
③ 수급 균형 판정: 공급부족 / 균형 / 공급과잉 + 방향 (조여짐/풀림)
④ 사이클 위치: 회복초입 / 확장 / 피크권 / 하강 / 바닥권 + 판정 근거
⑤ 선행지표 2~4개: 이 산업의 변화를 미리 알려주는 데이터
   (예: 신조선가지수, DRAM 현물가, 리그 카운트, RevPAR, 처방 데이터)
   → 월간 업데이트 STEP 1이 훑는 대상이 바로 이 지표들이다
⑥ 잠재 트리거: 균형을 깨뜨릴 수 있는 이벤트 목록 (정책/기술/지정학/대체재)
⑦ 밸류체인 약도 + 주요 기업 5~10개:
   단계별 대표 기업 (미국 상장 우선, 핵심 해외 기업 포함)
   + 주목 기업 1~3개 (이유 1줄, UNVERIFIED 라벨)
⑧ 매력도 티어 + 근거 (→ §4)
⑨ 지난 갱신 대비 변화: 티어 변동 / 유지 사유 (UPDATE 모드에서 필수)
⑩ 엣지 목록: 이 산업이 다른 노드와 맺는 관계 (§2A 타입 사용, 최소 2개)
⑪ 시장 인지·모멘텀 (v1.2, 축 ③):
   consensus(LOW|MID|HIGH) / momentum(초기|가속|만개|롤오버|중립) / 유동성·내러티브 1줄
   → 부호 가변 축: 컨센서스 낮음+모멘텀 초기 = 매수 촉매(+),
     컨센서스 만개+모멘텀 롤오버 = 상투 경보(−). §3B 후보 선별의 3번째 입력.
```

---

# 2A. 온톨로지 엣지 스키마 (v1.1)

## 엣지 타입 (타입 있는 관계만 허용)

산업 ↔ 산업:
- SUPPLIES_TO: A의 산출물이 B의 투입물 (후판 → 조선)
- CUSTOMER_OF: SUPPLIES_TO의 역방향 명시가 필요할 때
- SUBSTITUTES: A가 B의 수요를 대체 가능 (LNG ↔ 석탄, 비만약 → 일부 식품)
- CAPACITY_COMPETES: 같은 생산능력/자원을 두고 경쟁 (파운드리 capa, 전력)
- DEMAND_COMOVES: 같은 최종 수요에 함께 노출 (핸드셋 부품군)
- INVERSE: A의 호황이 B에 비용/압력 (유가 → 항공, 운임 → 화주)

테마 → 산업:
- THEME_DRIVES: 테마가 산업 수요를 창출 (AI 인프라 → 전력기기)

기업 관련:
- OPERATES_IN: 기업 → 산업 (체인 단계 명시)
- COMPETES_WITH: 기업 ↔ 기업 (같은 customer job)
- KEY_SUPPLIER_OF / KEY_CUSTOMER_OF: 매출/원가 의존이 material한 경우만

## 엣지 필수 속성

```
{ type, from, to, direction(+|−|양면), strength(H|M|L),
  mechanism: "상태 변화가 전달되는 경제적 경로 1문장",
  lag: "전달 시차 (즉시/분기/연 단위)" }
```

mechanism이 1문장으로 써지지 않는 엣지는 등록하지 않는다.
strength H = 상대 노드의 손익에 material한 영향, L = 방향성 참고 수준.

## 등록 규율

- 산업 노드당 산업간 엣지 최소 2개, 권장 3~6개. 10개 초과 금지.
- 기업 엣지는 대표 기업 + 딥다이브 완료 기업 위주로만 (전 종목 그래프화 금지).
- BUILD 각 블록에서 블록 내 엣지를 만들고, BUILD 7에서 블록 간 엣지를 연결한다.

---

# 3. 트리거 체크리스트 (티어 변경의 증거 기준)

티어를 올리려면 아래 중 **2개 이상**의 [실제]/[독립검증] 신호가 필요하다:

수요 측:
- D1. 신규 수요원 등장 (새 응용처, 새 규제 의무화, 새 소비 행태)
- D2. 수요 선행지표의 방향 전환 (⑤에 등록된 지표 기준)
- D3. 고객 산업의 capex 가이던스 상향 사이클
- D4. 가격 인상이 수요 파괴 없이 흡수되는 정황

공급 측:
- S1. 공급 차질/퇴출 (사고, 제재, 파산, 구조조정으로 인한 capa 감소)
- S2. 증설 절벽: 수년간 투자 부진으로 신규 공급 파이프라인 공백
- S3. 리드타임 장기화 / 수주잔고 증가 정황
- S4. 재고 사이클 바닥 신호 (유통·고객 재고 소진)

정책/구조 측:
- P1. 보조금·관세·규제 전환으로 수급 지형 변경
- P2. 기술 세대 전환으로 기존 공급의 유효성 하락

티어 하향도 동일하게 증거 2개 이상 (역방향 신호).

---

# 3A. 전파 규칙 (Propagation, v1.1 — UPDATE 모드 STEP 2.5)

노드의 상태(수급 균형, 사이클 위치, 티어)가 바뀌면:

1. 해당 노드의 모든 엣지를 나열한다.
2. strength H/M 엣지의 상대 노드를 **재검토 소환 목록**에 올린다.
   (L 엣지는 diff 리포트에 언급만)
3. 각 소환 노드에 대해 mechanism을 따라 영향 방향을 판정한다:
   - AMPLIFY(+): 소환 노드의 기존 방향을 강화
   - PRESSURE(−): 반대 압력
   - MIXED: 양면 (예: 수요 증가 + 원가 상승 동시)
4. 영향 판정이 §3 트리거 증거 수준에 도달하면 소환 노드의 티어도 재조정.
   증거 미달이면 "감시 강화" 표기만 하고 티어는 유지.
5. 전파는 **2홉까지만** 걷는다. 3홉 이상은 신호가 희석되어 노이즈다.
   단, 2홉 끝에서 강한 신호가 발견되면 다음 달 그 노드를 1홉 출발점으로 삼는다.

diff 리포트에는 전파 경로를 체인 형태로 기록한다:
`AI 인프라(테마, 수요↑) → THEME_DRIVES → 전력기기(HEAT 유지)
→ SUPPLIES_TO(변압기 강판) → 전기강판(WARM 승격, 증거 D2·S3)`

---

# 3B. 딥다이브 후보 선별 (v1.2 — 매 빌드·갱신의 정식 산출물)

**티어만으로 후보를 뽑지 않는다.** 티어는 "지금 뜨거운가(온도)"라, 그것만으로 뽑으면
구조적으로 상투 근처만 추천하게 된다. 대신 3축을 결합해 3개 버킷으로 뽑는다.
딥다이브 후보는 두 트랙으로 나뉜다 (v1.3).

【NEW 트랙 — 미발굴 신규 노출】
  공통 조건: **verification=SHALLOW(아직 딥다이브 안 한) 기업만.**
  버킷 A/B/C로 분류한다. 목적은 "아직 안 본 것을 처음 보는 것".

【REVISIT 트랙 — 딥다이브 노드 재소환】
  대상: verification=DEEP_DIVED 노드.
  공통 조건: 아래 trigger 4종 중 1개 이상이 **관측 사실**로 확인될 것.
  버킷을 부여하지 않는다 — 버킷은 미발굴 노출의 분류축이므로 재소환에는
  의미가 없고, trigger.kind가 그 역할을 대신한다.
  목적은 "이미 본 것의 판단이 낡았는지 확인하는 것".

  ※ 딥다이브 완료는 후보 자격의 영구 소멸이 아니다. 딥다이브는 시점 판단이고,
    사실이 바뀌면 판단도 다시 물어야 한다.
후보 기업은 산업 카드 ⑦에서 "그 산업을 데운 바로 그 트리거에 가장 크게 노출된" 기업을 고른다
(예: 광업이 '구리 부족'으로 HEAT면 금 비중 큰 기업이 아니라 구리 순수 노출 기업).

```
버킷 A — 신규 수요 급증:
  축② 회복초입/확장 초 + 트리거가 새 수요원(D1) + 축③ 컨센서스 아직 낮음
  → 남들이 아직 안 보는 새 폭발. 단 "시장 저인지" 확인 필수.

버킷 B — 바닥 반전 (역발상 핵심):
  축① COLD/하강이지만 공급 퇴출·재고 바닥·수요 반등 신호가 실제로 켜짐
  → 위험조정수익 최고 구간. COLD 카드의 "바닥 반전 신호"가 켜지면 자동 소환.
  ※ COLD라는 사실만으로는 후보가 아니다. 바닥 반전 신호가 확인돼야 버킷 B.

버킷 C — 확장 지속:
  축① HEAT/WARM + 축② 선행지표 아직 가속 + 피크 신호 없음
  → 오케이. 단 축③ 모멘텀이 만개/컨센서스 극단이면 "진입 눌림 대기" 캐비앳을 단다.
```

**피크아웃 감시 (후보 아님):** HEAT/WARM 중 선행지표가 롤오버하기 시작한 산업은
후보에서 빼고 별도 "피크아웃 감시"로 표기(보유·차익 관점). tripwire를 1개 명시.

**REVISIT trigger 4종 (v1.3 — 이외 사유로는 등재 불가):**

| kind | 정의 | 판정 근거 |
|---|---|---|
| TRIPWIRE | deep_dive_ref.kpi_tripwires의 green↔yellow↔red 상태 전환 | 실적·공시 하드넘버 |
| TIER_CHANGE | 소속 산업 티어 변경(승격/강등) | tier_history |
| BALANCE_CHANGE | 소속 산업 balance 전환(SHORTAGE↔BALANCED↔SURPLUS) | 산업 카드 |
| THESIS_STALE | 직전 딥다이브 이후 4분기 경과 + 해당 산업 HEAT/WARM | as_of 경과 |

**명시적 배제 사유 (등재 금지):**
- 가격이 딥다이브 stance_zone 매력 구간에 진입 — 가격 감시는 아틀라스(산업 지도)
  밖의 일이다. 스크리닝·딥다이브 레이어 소관이며, 이를 허용하면 아틀라스가
  종목 가격 트래커로 변질되어 HARD RULE 2를 침식한다.
  - **(v1.4) 스탠스 보드가 생겨도 이 조항은 그대로다.** 보드는 가격 위치를 *보여줄*
    뿐이며, 보여준다는 사실이 등재 사유가 되지 않는다. 화면에 "밴드 진입"이 떠 있어도
    후보 등재는 여전히 아래 trigger 4종 중 하나를 **관측 사실로** 요구한다.
    표시(읽기)와 등재(쓰기)를 분리하는 것이 이 레이어 설계의 전제다(00 §0 방화벽).
  - **인간 경로 우회 주의:** 기계적 방화벽은 PACK 필드 간 참조만 막는다. 보드를 보고
    사람이 딥다이브를 돌리는 경로는 막을 수 없고, 막을 필요도 없다 — 다만 그렇게 시작한
    딥다이브라도 **후보 원장에는 trigger 근거로만 등재**된다. "가격이 싸 보여서"는
    verdict_log에 그렇게 적고, trigger 칸에 분식하지 않는다.
- 신규 후보가 부족해서 / 리스트를 채우기 위해 — 규율 마모의 시작점이다. 신규 후보가
  마르는 것은 딥다이브를 늘릴 신호가 아니라 산업 스캔 주기를 당길 신호다.
  후보가 없으면 멈추는 것이 정답이다.

**REVISIT 정원: 동시 OPEN ≤5종.** 초과 시 trigger 강도순으로 컷한다
(TIER_CHANGE > TRIPWIRE red > BALANCE_CHANGE > THESIS_STALE).

**REVISIT 판정 절차 (A타입 갱신 시 1회, 별도 세션 없음):**
전수 재조사는 금지(HARD RULE 6)이므로 필터 순서로 좁힌다.
```
1) 산업 필터 — 이번 갱신에서 tier/balance가 변한 산업의 DEEP_DIVED 노드 소환
   → TIER_CHANGE·BALANCE_CHANGE 자동 판정 (추가 조사 0)
2) 경과 필터 — 직전 딥다이브 4분기 초과 + HEAT/WARM 산업 노드
   → THESIS_STALE 후보군
3) tripwire 필터 — 1)2)에서 걸린 노드에 한해 실적 하드넘버 확인 → TRIPWIRE 판정
4) 정원 컷 — trigger 강도순 상위 5종만 OPEN
```

**각 후보 필수 필드 (없으면 후보 무효):**
- falsifier(반증조건): "이 논리가 틀렸다는 걸 무엇으로 아는가" 1문장. 확증편향 방지.
- horizon(시간지평): 촉매 예상 시점(수분기/1년/다년). 죽은 돈 방지 — 싼 데는 이유가 있고
  그게 풀리는 데 시간이 걸린다.
- (v1.3) 위 두 필드는 **NEW·REVISIT 양 트랙 모두에 예외 없이 적용**된다.
  REVISIT도 verdict_log 대상이다 — "재소환했는데 헛수고였다"는 기록이 가장 값진 학습이다.

**(v1.3) peak_watch와 REVISIT의 구분:** 선행지표가 롤오버한 산업은 여전히 후보가 아닌
peak_watch로 표기한다(산업 레벨 판정). REVISIT은 **종목 레벨** 재검토이지 산업 피크
판정이 아니므로 둘을 혼동하지 않는다.

**오답 로그(verdict_log):** 분기 리뷰에서 지난 후보의 사후 결과를 한 줄씩 기록한다
(HEAT라 팠는데 상투였다 / COLD 반전이라 봤는데 value trap이었다). tier_history는
"티어가 어떻게 변했나"는 남기지만 "그 판단이 맞았나"는 안 남긴다 — 이 로그가 엔진이
어느 사이클 위치에서 자주 틀리는지 학습하게 한다. 이것이 시스템을 살아있게 만든다.

축은 3개에서 멈춘다. 금리·환율·ESG·밸류에이션 배수 등은 새 축이 아니라 딥다이브에서 볼
하위 변수다. 축을 더하면 정확도가 아니라 노이즈가 늘고, 모든 산업이 "어떤 축에선 좋아 보여서"
다 뽑혀 필터가 필터 기능을 잃는다.

---

# 4. 매력도 티어 (산업 단위, 5단계)

```
HEAT   수급 균형이 깨졌거나 깨지는 중. 트리거 작동 확인.
       → 즉시 스크리닝 권고. 전체 산업의 15% 이내 유지.
WARM   트리거 조짐 있으나 확증 부족. 선행지표 월간 관찰 강화.
NEUTRAL 균형 상태. 분기 1회 확인이면 충분.
COLD   공급과잉/수요침체 진행 중. 단, 바닥권 진입 감시 대상으로 명시.
FROZEN 구조적 쇠퇴. 반기 1회 생존 확인만.
```

규칙:
- 티어는 "조사 우선순위"이지 매매 신호가 아니다 (모든 출력물에 고지)
- COLD/FROZEN은 무시 대상이 아니라 **역발상 감시 목록**이다.
  다음 HEAT는 대부분 오늘의 COLD에서 나온다. COLD 카드에는
  "바닥 반전을 알릴 신호"를 1개 이상 명시한다.
- 티어 변경은 §3 증거 없이 불가. "요즘 핫함"은 증거가 아니다.

---

# 5. ATLAS_PACK.json 스키마

```json
{
  "meta": { "version": "", "as_of": "", "build_progress": "완료 블록 기록",
            "prev_version": "" },
  "themes": [ { "id": "", "name": "", "demand_thesis": "",
                "linked_industries": [] } ],
  "industries": [
    { "id": "", "sector": "", "name": "", "definition": "",
      "demand": { "drivers": "", "secular_vs_cyclical": "", "momentum": "" },
      "supply": { "structure": "", "lead_time": "", "barriers": "",
                  "utilization_inventory": "" },
      "balance": "SHORTAGE|BALANCED|GLUT", "balance_direction": "",
      "cycle_stage": "RECOVERY|EXPANSION|PEAK|DOWNTURN|TROUGH",
      "leading_indicators": [ { "name": "", "last_reading": "", "as_of": "" } ],
      "triggers_watchlist": [],
      "companies": [ { "ticker": "", "name": "", "chain_position": "",
                       "note": "" } ],
      "tier": "HEAT|WARM|NEUTRAL|COLD|FROZEN",
      "tier_rationale": "",
      "market_read": { "consensus": "LOW|MID|HIGH",
                       "momentum": "초기|가속|만개|롤오버|중립", "note": "" },
      "tier_history": [ { "as_of": "", "tier": "", "reason": "" } ] }
  ],
  "edges": [
    { "type": "", "from": "", "to": "", "direction": "+|-|both",
      "strength": "H|M|L", "mechanism": "", "lag": "" }
  ],
  "company_nodes": [
    { "ticker": "", "name": "", "industries": [],
      "verification": "SHALLOW|SCREENED|DEEP_DIVED",
      "deep_dive_ref": { "as_of": "", "stance_zone": "", "thesis_oneline": "",
                         "moat_verdict": "", "mgmt_verdict": "",
                         "kpi_tripwires": [],
                         // (v1.5) 통관 계약 §7B. 전사만. 통관 시 1회 생성 후 동결.
                         "atlas_stance": {
                           "contract": "v1",
                           "contract_source": "DDOS_NATIVE|ATLAS_DERIVED",
                           "label": "AGGRESSIVE|ATTRACTIVE|WATCH|AVOID|UNKNOWN",
                           "label_basis": "IRR|EV|UD_RATIO|NONE",
                           "valuation_mode": "",
                           "bands": { "aggressive_max": null, "attractive": null,
                                      "watch": null, "avoid_above": null },
                           "ref_price": null, "price_asof": "", "hurdle": null,
                           "derived_note": "" } },
      // (v1.4) 계산값 — 아틀라스 소유. 매 UPDATE 재산출. 판단 아님.
      "stance_state": {
        "price": { "value": 0, "as_of": "", "source": "" },
        "zone": "AGGRESSIVE|ATTRACTIVE|WATCH|AVOID|UNKNOWN",
        "gap_to_attractive_pct": 0,
        "freshness": "FRESH|AGING|STALE",
        "tripwire_status": "GREEN|YELLOW|RED|UNKNOWN",
        "display_suppressed": false } }
  ],
  "monthly_diff": { "upgrades": [], "downgrades": [], "new_triggers": [],
                    "propagation_paths": [],
                    "screening_recommendations": [],
                    "deep_dive_candidates": [
                      { "id": "", "name": "",
                        "type": "NEW|REVISIT",
                        "bucket": "A|B|C",          // NEW만 필수, REVISIT은 null
                        "trigger": {                // REVISIT만 필수, NEW는 null
                          "kind": "TRIPWIRE|TIER_CHANGE|BALANCE_CHANGE|THESIS_STALE",
                          "detail": "", "evidence_as_of": "", "prior_dd_as_of": "" },
                        "tier": "", "why": "", "falsifier": "", "horizon": "",
                        "status": "OPEN|PENDING_TRIGGER|RESOLVED|EXPIRED",
                        "origin": "" } ],
                    "peak_watch": [
                      { "id": "", "name": "", "tier": "", "reason": "", "tripwire": "" } ] },
  "verdict_log": [ { "as_of": "", "id": "", "call": "", "outcome": "", "lesson": "" } ]
}
```

company_nodes.verification이 노드의 "진하기"다:
SHALLOW(이름+체인위치) → SCREENED(후보카드 있음) → DEEP_DIVED(팩 연결됨).

## 5A. 스탠스 레이어 규격 (v1.4)

**소유권 분리가 이 레이어의 전부다.**

| 필드 | 소유 | 성격 | 갱신 경로 |
|---|---|---|---|
| `deep_dive_ref.stance_zone` | 딥다이브 | 원문 (불변 보존) | §7A 4단계만 |
| `deep_dive_ref.atlas_stance` | 딥다이브(전사) | **판단** (밴드·EV·허들) | **§7B 통관 시 1회, 이후 동결** |
| `stance_state` | 아틀라스 | **관측·계산** (주가·위치) | 매 UPDATE 재산출 |

- `atlas_stance`는 §7B 통관 계약으로 생성된다. **전사만 하며 계산하지 않는다.**
  생성 후 동결되고, 새 날짜의 팩이 들어올 때만 다시 만든다.
- `stance_zone` **원문은 절대 삭제·수정하지 않는다.** `atlas_stance`는 그 옆에 붙는
  구조화 사본이며, 둘이 어긋나면 **원문이 우선**이다.
- 팩에서 밴드를 얻지 못하면 `label: UNKNOWN`. **서술에서 유추해 채우지 않는다**
  (00 §4 증거 규율 / §7B 제1·2조).
- `zone`은 저장된 밴드와 관측 주가의 **기계적 대조 결과**이지 새 판단이 아니다.
  경계값은 밴드 하한 이하부터 순서대로 판정하며, 밴드가 없으면 UNKNOWN.
- `gap_to_attractive_pct`: 현재가가 `attractive` 상단까지 남은 거리(%). 음수면 이미 진입.
- `freshness`: 직전 딥다이브 `as_of` 경과 기준. `FRESH`(≤2분기) / `AGING`(2~4분기) /
  `STALE`(4분기 초과). §3B의 THESIS_STALE 트리거와 같은 시계를 쓴다.
- `tripwire_status`: `kpi_tripwires`의 최신 판정 상태. 확인 안 했으면 `UNKNOWN`.
- `display_suppressed`: `freshness=STALE` 또는 `tripwire_status=RED`이면 **true**.
  뷰는 이 값이 true인 노드의 zone 강조를 끄고 밴드 수치를 접는다(00 §0 표시 억제).

**주가(`price`) 취급 규율:**
- `as_of`와 `source` **병기 필수.** 병기 없는 주가는 PACK에 넣지 않는다.
- 주가는 **UPDATE 시점 스냅샷**이며 실시간이 아니다. 뷰는 이를 실시간처럼 표시하지 않는다.
- 주가는 관측값이므로 갱신에 트리거 증거를 요구하지 않는다. 반대로 **주가만 바뀐 것은
  어떤 변화도 아니다** — diff 리포트의 티어·후보 섹션에 등장할 수 없다.

(v1.3) deep_dive_candidates.status 정의:
- OPEN — 즉시 딥다이브 대상
- PENDING_TRIGGER — 트리거 조건이 PACK에 기록돼 있으나 아직 미발생
  (예: 승격 체인 대기). 발생 시 OPEN으로 전환
- RESOLVED — 딥다이브 실행 완료(소진)
- EXPIRED — 트리거 해소·논제 무효로 원장에서 제거

tier_history가 이 시스템의 심장이다 — 순위가 "유기적으로 바뀌는" 기록 그 자체.

---

# 6. ATLAS_MAP.html 출력 스펙

단일 HTML, 한국어, 다음 구조:

1) 헤더: as-of / 커버리지 현황(카드 수) / "티어 ≠ 매매신호" 고지
2) **히트맵 대시보드**: 11개 섹터 × 산업 그룹 그리드, 티어별 색상
   (HEAT 진한 색 → FROZEN 회색). 한눈에 "지금 어디가 데워지고 있나"
3) **이번 달 변화** (UPDATE 모드): 티어 상승/하락, 새 트리거, 스크리닝 권고
4) HEAT/WARM 산업 카드 전문
5) NEUTRAL 이하: 한 줄 요약 리스트 (카드 전문은 PACK에만 보존)
6) 크로스 섹터 테마 레이어 요약
7) COLD 역발상 감시 목록 (바닥 반전 신호 명시)
8) **(v1.4) 스탠스 보드** — 아래 §6A
9) 푸터: 미검증·조사우선순위 고지 재확인

디자인: Part 2 디자인 시스템의 절제된 톤 준용. 신호등 남발 금지,
티어 색상 외 장식 최소화.

## 6A. 스탠스 보드 스펙 (v1.4)

**배치:** 콘솔 내부 탭. **5번째 HTML 파일을 만들지 않는다** — 뷰는 4개로 고정이며
파일을 늘리면 SOP §1 트리·`index.html`·전 뷰의 `xnav`가 연쇄 변경된다.

**축:** 산업 티어(주축) × zone(종속축). **zone 단독 정렬 금지**(00 §0 종속 원칙).
정렬 기본값은 티어 우선, 동일 티어 안에서 zone 근접도.

**구성 — 3블록:**
```
① 밴드 진입   zone ≤ ATTRACTIVE 인 DEEP_DIVED 노드
② 근접        gap_to_attractive_pct ≤ 15%
③ 커버리지 구멍  HEAT/WARM 인데 DEEP_DIVED 노드 0인 산업
```
③이 이 보드의 존재 이유에 가장 가깝다 — 깔때기(00 §0)가 어디서 막혔는지를 드러낸다.
①②만 있으면 이 보드는 가격 트래커가 된다. **③은 생략 불가.**

**필수 병기 (하나라도 빠지면 스펙 위반):**
- 각 행에 산업 티어 배지 · `freshness` · `tripwire_status` · 딥다이브 `as_of`
- `display_suppressed=true` 행은 zone 강조 해제 + 밴드 수치 접기
- 주가에 `as_of` 병기
- 보드 헤더 고지: **"표시는 딥다이브 산출의 인용이며 아틀라스의 매매 의견이 아님.
  밴드 진입은 후보 등재 사유가 아님(§3B)."**

**금지:** 스탠스만으로 정렬한 단독 랭킹, "매수/매도" 어휘, 아틀라스가 만든 목표가,
`label=UNKNOWN` 노드에 추정 밴드 표시.

---

# 7. 하류 공정 연결 (Funnel Contract)

- HEAT 판정 산업 → 스크리닝 프로젝트로:
  `스크리닝 시작 — <산업명>` + 해당 산업 카드 첨부
  카드의 ⑦ 주요 기업 목록이 스크리닝 유니버스의 출발점이 된다.
- 산업 카드의 ⑤ 선행지표는 딥다이브 Chapter 6 모니터링 KPI의 후보가 된다.
- 역방향 피드백: 딥다이브에서 발견된 산업 인사이트는 다음 아틀라스
  업데이트 때 카드에 반영한다 (딥다이브 보고서 첨부로 전달).

## 7A. 노드 승격 프로토콜 (v1.1)

딥다이브 완료 시:
1. 해당 종목의 REPORT_DATA_PACK.json을 아틀라스 업데이트 대화에 함께 첨부
2. 기업 노드를 DEEP_DIVED로 승격, deep_dive_ref에 핵심 결론 요약 저장
   (스탠스 존, 한 줄 thesis, 해자·경영진 평가, KPI tripwire 목록)
3. 딥다이브가 발견한 산업 레벨 사실(수급, 선행지표, 경쟁 구도)을
   산업 카드와 엣지에 역반영 — 딥다이브는 온톨로지를 살찌우는 공정이다
4. 분기 업데이트에서 스탠스가 바뀌면 노드의 deep_dive_ref도 갱신
   - **(v1.5) 이 4단계가 `atlas_stance`의 유일한 재생성 경로다(§7B 제3조 동결).**
     아틀라스는 어떤 모드에서도 밴드를 새로 만들거나 고치지 않는다. 밴드가 낡았다고
     판단되면 고치는 게 아니라 `freshness=STALE`로 표시하고 딥다이브에 되돌린다.
   - 새 DATA_PACK을 통합할 때 §7B 통관을 다시 거쳐 `atlas_stance`를 재생성하고,
     기존 `stance_zone`은 새 값으로 교체한다(원문의 최신성 유지). 과거 원문은
     `data/deepdive/`의 이전 날짜 파일이 보존한다.
5. (v1.3) deep_dive_ref.kpi_tripwires는 저장으로 끝나지 않는다 — 이후 갱신에서
   REVISIT 트리거의 소스가 된다(§3B). 딥다이브가 산업 카드·엣지로 되먹임되듯
   (3단계), 종목 tripwire는 후보 원장으로 되먹임된다. 이것이 딥다이브→아틀라스
   역방향 루프의 종목 레벨 경로다.

## 7B. 스탠스 정규화 — 통관 계약 (v1.5)

**문제:** 딥다이브 팩은 자유 형식이다. 실측 결과 밴드 키 이름 225종, 구조 4계열,
버전 표기 5종이 확인됐다. 팩이 늘수록 사후 번역 부담은 무한히 자란다.

**해법의 위치가 중요하다.** 이 정규화는 **아틀라스의 통관 절차**이지 딥다이브의
출력 규격이 아니다. 딥다이브(DDOS)는 이 스키마를 알 필요가 없고, 알아서도 안 된다 —
"4개 밴드를 내야 한다"는 인식은 밸류에이션 사고 자체를 밴드에 맞춰 왜곡시키고,
Mode A~F를 사업 유형별로 골라 쓰는 DDOS의 설계를 마모시킨다.
**딥다이브는 지금처럼 자유롭게 쓰고, 정규화는 문 앞에서 일어난다.**

### 제1조 — 전사(轉寫)만 한다

> **팩 안에 이미 존재하는 숫자만 옮겨 적는다. 없으면 UNKNOWN. 예외 없음.**

아틀라스는 이 단계에서 계산·추정·보간을 하지 않는다. 팩에 밴드가 없는데 서술에서
가격을 유추해 채우는 것은 **딥다이브 판단의 위조**이며 00 §0 방화벽 위반이다.

### 제2조 — UNKNOWN은 일급 답이다

UNKNOWN은 미달이 아니라 정당한 결론이다. "목표가 $37–243 극단 분산"이 결론인 팩에서
밴드를 짜내면 **그 분산이라는 발견 자체가 사라진다.** 칸을 채우려는 압력에 굴복하지 않는다.

### 제3조 — 통관 시 1회 생성 후 동결

`atlas_stance`는 팩 통관 시점에 **한 번** 만들어 노드에 박제한다. 이후 갱신에서
재계산하지 않는다. 재계산하면 같은 팩이 세션마다 다른 라벨을 받는다.
**새 날짜의 팩이 들어올 때만** 새로 만든다.

### 블록 규격

```json
"atlas_stance": {
  "contract": "v1",
  "contract_source": "DDOS_NATIVE | ATLAS_DERIVED",
  "label": "AGGRESSIVE|ATTRACTIVE|WATCH|AVOID|UNKNOWN",
  "label_basis": "IRR|EV|UD_RATIO|NONE",
  "valuation_mode": "<팩의 valuation.mode 원문 그대로>",
  "ladder": [
    { "lo": null, "hi": 42, "tier": "AGGRESSIVE", "src": "strong_attractive" },
    { "lo": 42, "hi": 45, "tier": "ATTRACTIVE", "src": "attractive_conditional" },
    { "lo": 45, "hi": 52, "tier": "WATCH", "src": "watch_fair" },
    { "lo": 52, "hi": null, "tier": "AVOID", "src": "evidence_required_above" }
  ],
  "ref_price": null, "price_asof": "", "hurdle": null, "hurdle_unit": "decimal",
  "derived_note": "<UNKNOWN 사유 또는 판단이 갈린 지점 1줄>"
}
```

**밴드는 고정 4칸이 아니라 순서 있는 사다리(`ladder`)다.** 실측 결과 5단 구성이
오히려 흔하다(AMKR·FCX·ANET·CEG·COHR 모두 5단). 4칸에 욱여넣으면 밴드를 합쳐야 하고,
합치는 순간 그건 전사가 아니라 판단이 되어 제1조를 위반한다.
**팩의 밴드 개수를 그대로 옮기고, 각 칸에 정규 tier를 태그한다.**

- `src`에 팩의 **원래 키 이름을 그대로** 남긴다. 태그가 틀렸을 때 역추적이 가능해야 한다.
- `lo`/`hi`는 경계값. 개구간 끝은 `null`.
- 밴드가 없으면 `ladder: []`. 그래도 `label_basis`가 있으면 `label`은 붙는다
  (예: WULF — 밴드 없으나 IRR 0.16 존재).

### 단위 정규화 — 유일하게 허용되는 변환

실측에서 같은 필드가 다른 단위로 들어온다: `expected_irr`가 AMKR은 `0.1094`,
COHR은 `13.4`다. 통관은 **단위만** 소수로 통일하고 `hurdle_unit`에 기록한다.
단위 변환은 값을 바꾸지 않으므로 전사의 범위 안이다. **그 외 어떤 산술도 금지된다.**

구조가 어긋난 필드(예: ANET의 `price_asof`가 문자열이 아니라 dict)는
날짜만 뽑아 `price_asof`에 넣고 원본 구조는 버리지 않는다 — 팩이 원본이다.

### 그 외 필드 규율

- `valuation_mode`는 **원문 그대로** 싣는다. 모드를 통일하지 않는다 — 기록하는 것이지
  규격화하는 것이 아니다. NAV형·순환형이 IRR을 내지 않는 것은 결함이 아니라 설계다.
  (실측: `"Mode D - Cyclical / Commodity"`, `"Mode E Financial Institution with
  segment SOTP overlay"` 등 — 이 다양성이 DDOS의 자산이다.)
- `contract_source`: 팩이 `atlas_stance`를 직접 담고 있으면 `DDOS_NATIVE`,
  아틀라스가 통관에서 파생했으면 `ATLAS_DERIVED`. **NATIVE가 있으면 항상 우선**한다.
  이 필드가 있어 훗날 DDOS가 블록을 네이티브로 내기 시작해도 이행이 매끄럽다.

### 제4조 — 게이트는 팩을 막지 않는다

계약을 못 채운 팩도 **통관은 된다.** `label: UNKNOWN`으로 들어오고 diff에 플래그만
남는다. 딥다이브 통합이 계약 때문에 멈추는 일은 없어야 한다 — 마찰이 쌓이면
게이트가 느슨해지고, 그러면 계약 자체가 무너진다.

### 제5조 — 파생분은 전량 공시한다

`contract_source: ATLAS_DERIVED`인 항목은 **그 세션 diff 리포트에 전량 나열한다**
(티커 · label · label_basis · derived_note).

이유: 정규화를 아틀라스가 하면 **밸류에이션을 직접 수행한 사람의 검토가 빠진다.**
남의 작업을 해석하는 것이므로 오류가 조용히 지나갈 수 있다. 전량 공시가 그 검토를
사용자에게 되돌려주는 유일한 장치다. 요약·샘플링하지 않는다.

시간이 지날수록 진한 노드가 늘어나는 것이 이 시스템의 복리다.
단, 진한 노드도 낡는다 — 복리를 지키는 것은 재소환 규율이다.

---

# 8. QA Gate (출력 전 자가 점검)

- [ ] HEAT 티어 ≤ 전체 15%
- [ ] 모든 티어 변경에 §3 증거 2개 이상
- [ ] 모든 카드에 선행지표 ≥ 2개
- [ ] COLD 카드 전부에 바닥 반전 신호 명시
- [ ] 숫자·지표에 as-of 병기
- [ ] UPDATE 모드: diff 리포트 존재, "변화 없음" 산업에도 유지 근거
- [ ] PACK + HTML 동시 출력, tier_history 누적 확인
- [ ] 종목 레벨 판단·목표가 0건 (deep_dive_ref의 스탠스는 딥다이브 산출의 인용이므로 예외)
- [ ] 모든 산업 노드에 산업간 엣지 ≥ 2개, mechanism 1문장 존재
- [ ] 상태 변경 노드 전부에 전파 실행 흔적 (propagation_paths 기록)
- [ ] 전파 2홉 초과 0건
- [ ] (v1.2) 모든 카드에 market_read(축 ③) 존재
- [ ] (v1.3) 딥다이브 후보 전부에 type(NEW|REVISIT)·falsifier·horizon 존재
- [ ] (v1.3) type=NEW: bucket(A|B|C) 존재 + verification=SHALLOW만
- [ ] (v1.3) type=REVISIT: trigger 4종 중 1개 명시(관측 사실·evidence_as_of 병기)
      + verification=DEEP_DIVED + 버킷 미부여
- [ ] (v1.3) REVISIT 동시 OPEN ≤5종
- [ ] (v1.3) REVISIT 등재 사유에 가격·리스트 공백 0건
- [ ] (v1.2) 버킷 B는 COLD/하강 + "바닥 반전 신호 확인"된 경우만 (COLD 사실만으론 후보 아님)

**(v1.4) 스탠스 레이어 게이트 — 방화벽 검증**
- [ ] **`stance_state`가 티어·balance·`deep_dive_candidates`에 영향 준 흔적 0건**
      (이번 갱신의 티어 변경 근거에 가격·zone 어휘 0건)
- [ ] 아틀라스가 신규 산출한 밴드·목표가·기대수익률 0건 (`atlas_stance`는 전부 팩에서 전사)
- [ ] `stance_zone` 원문 삭제·수정 0건 (구조화는 추가만)
- [ ] 모든 `stance_state.price`에 `as_of`·`source` 병기
- [ ] `label=UNKNOWN` → `zone=UNKNOWN` 일치 (추정 밴드 0건)
- [ ] **(v1.5) `contract_source=ATLAS_DERIVED` 항목이 diff에 전량 나열됐는가 (§7B 제5조)**
- [ ] **(v1.5) 통관에서 재계산·보간한 숫자 0건 — 전부 팩 원본 전사 (§7B 제1조)**
- [ ] **(v1.5) `valuation_mode`를 팩 원문 그대로 실었는가 (모드 통일 0건)**
- [ ] `freshness=STALE` 또는 `tripwire_status=RED` → `display_suppressed=true` 일치
- [ ] `freshness`가 `deep_dive_ref.as_of` 경과와 일치 (수기 지정 0건)
- [ ] 스탠스 보드에 커버리지 구멍(③) 블록 존재 (①②만 있는 보드 = 스펙 위반)
- [ ] 뷰 교체가 있었다면: `ATLAS_DERIVE` 블록의 **의도치 않은 분기 0건**
      — 주의: 3파일이 byte 동일하지 않다. CONSOLE만 `deep_dive_ref`를 파생에 싣고
      GRAPH·MAP은 싣지 않는 **의도된 차이**가 이미 존재한다(2026-09-02 확인).
      따라서 md5 일치가 아니라 **diff를 열어 차이가 위 항목뿐인지 확인**한다.
      새 차이가 생겼다면 3파일에 모두 반영했는지 검토한다.
- [ ] (v1.2) 선행지표 롤오버한 HEAT/WARM은 후보 아닌 peak_watch로 표기
- [ ] (v1.2) 축은 3개 초과 금지 (금리·환율·밸류에이션 배수 등은 딥다이브 하위 변수)
