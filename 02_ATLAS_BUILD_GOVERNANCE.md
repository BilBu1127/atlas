# 02_ATLAS_BUILD_GOVERNANCE.md
## Global Sector Atlas OS v1.3 (Governance Patch Layer)
## Role: 증분 구축(BUILD 1~6)이 품질을 흘리지 않게 잠그는 규율
## Authority: 00/01 위에 얹히는 패치. 충돌 시 이 문서가 '절차'를, 00/01이 '판단 기준'을 관장.

> 왜 존재하나: 지도는 한 대화에서 못 만든다. 블록을 나눠 쌓는 순간
> 세 곳에서 품질이 샌다 — ① HEAT 예산을 앞 블록이 먼저 써버려 뒷 블록이
> 순서 때문에 눌린다, ② 아직 없는 노드로 향하는 엣지가 '어음'으로 쌓여
> 관계망이 섬이 된다, ③ 새 블록이 옛 카드를 부주의하게 건드린다.
> 이 문서는 이 세 누수를 절차로 막는다. **판단을 늘리지 않고 규율만 늘린다.**

---

# 1. 잠정 티어 규율 (Provisional Tier Discipline)

**핵심 재정의:** 00/01의 "HEAT ≤ 전체 15%"는 **블록별로 소진하는 예산이 아니라
BUILD 7에서 한 번 정규화하는 전역 제약**이다. 이 구분을 놓치면 빌드 순서가
티어를 왜곡한다(먼저 지어진 반도체가 나중 지어질 비만치료제의 자리를 미리 먹음).

규칙:
1. BUILD 1~6에서 티어는 **절대 근거(§3 트리거 증거)로만** 매긴다.
   "다른 산업 대비 상대적으로"는 이 단계에서 **금지** — 상대 비교는 BUILD 7의 일.
2. 그렇게 매긴 모든 티어는 `tier_provisional: true`로 표시한다.
3. 증분 단계에서 15% 한도는 **경보용**이지 강제 상한이 아니다.
   provisional HEAT가 (지금까지 구축된 카드 수 기준) 20%를 넘으면
   diff에 "정산 압력 높음" 플래그만 남기고, **억지로 강등하지 않는다.**
   억지 강등은 순서 편향을 오히려 고착시킨다.
4. BUILD 7 정산(§2)을 통과하면 `tier_provisional: false`로 확정된다.
   그 전까지 **어떤 출력물도 티어를 '최종'으로 표기하지 않는다.**

즉 증분 구축의 티어는 "이 산업이 자기 근거만으로 뜨거운가"의 정직한 기록이고,
그것들을 한 줄로 세워 상한을 씌우는 건 56장이 다 모인 뒤에 한 번만 한다.

---

# 2. HEAT 정산 알고리즘 (BUILD 7 — 결정론적)

BUILD 7에서 provisional HEAT 후보 전부를 다음 절차로 정규화한다.
사람 눈이 최종 승인하되, 랭킹 근거는 재현 가능해야 한다.

```
STEP A  HEAT 후보 풀 = tier=='HEAT' && tier_provisional 인 모든 산업.
STEP B  각 후보에 heat_score 산출 (가산식, 근거는 tier_rationale에서 실제 카운트):
        + 서로 다른 §3 트리거 태그 수 (D1/D2/S1/S3... 중복 타입 1회만)  … 각 +2
        + balance=='SHORTAGE' && balance_direction 조여짐              … +2
        + cycle_stage in (회복초입, 확장) && 선행지표 '가속'            … +1
        − market_read.momentum in (만개, 롤오버)  (추격 위험)          … −1
        − market_read.consensus=='HIGH'                                … −1
        ※ 점수는 랭킹용 서수(ordinal)일 뿐, 매매 신호가 아니다.
STEP C  heat_score 내림차순 정렬. 상위 ⌊0.15 × 56⌋ = 8개까지 HEAT 확정.
STEP D  8위 밖으로 밀린 후보는 WARM으로 강등하고,
        tier_history에 "BUILD7 정산 강등: {상위 산업}에 밀림, heat_score={n}" 기록.
        verdict_log에도 강등 사유 1줄 남긴다(엔진이 '뭘 과열로 봤나' 학습).
STEP E  동점이면: 공급 경직도 높은 쪽(리드타임 김) 우선 → 그래도 동점이면
        THEME_DRIVES 인바운드 엣지 많은 쪽(수요 원천이 더 두꺼운 쪽) 우선.
```

경계: heat_score는 **후보를 줄 세우는 도구**지 판단을 대신하지 않는다.
근거가 의심스러운 상위 후보를 사람이 끌어내리는 것은 언제나 허용된다(00 §3 경계 상속).

---

# 3. 크로스블록 엣지 원장 (Pending Cross-Edge Ledger)

**문제:** 블록 N이 아직 안 지어진 블록 M의 노드로 엣지를 그으면, 그 엣지는
전파가 못 흐르는 죽은 선이다. 이게 쌓이면 관계망이 어음 더미가 된다.

규칙:
1. 살아있는 `edges` 배열에는 **양 끝이 모두 BUILT인 엣지만** 존재한다.
   전파(01 §3A)는 오직 이 배열만 걷는다 — 죽은 선을 밟는 일이 원천 차단된다.
2. 미구축 노드를 향한 연결 '의도'는 `edges`가 아니라 최상위
   `pending_cross_edges` 원장에 **가설로** 적재한다.
   각 항목: `{type, from, to, direction, strength, mechanism_hypothesis,
   created_block, status}` (status: PENDING).
3. **연속 정산(중요):** 새 블록이 지어질 때마다, 그 블록이 만든 노드를
   `to` 또는 `from`으로 가진 PENDING 항목을 전부 꺼내 검증한다.
   양 끝이 이제 BUILT면 → mechanism을 확정 문장으로 다듬어 `edges`로 승격,
   원장에서 status=RESOLVED. **어음을 BUILD 7까지 미루지 않고 매 블록 갚는다.**
4. BUILD 7 종료 시 `pending_cross_edges`의 PENDING 잔량은 **0이어야 한다.**
   남아 있으면 두 경우뿐: (a) 실제로 연결 없음 → 항목 삭제(status=DROPPED, 사유),
   (b) 누락 → 즉시 승격. 어느 쪽도 아닌 잔류는 QA FAIL.

이로써 "BUILD 7이 크로스 엣지를 다 연결한다"는 어음이,
**매 블록 조금씩 갚고 BUILD 7은 잔금만 처리하는** 구조로 바뀐다.

---

# 4. 블록 무결성 락 (Prior-Block Integrity Lock)

**문제:** 새 블록을 얹다가 옛 카드를 부주의하게 덮어쓰면 조용히 품질이 샌다.

규칙:
1. 블록 N 작업은 블록 <N의 카드를 **수정하지 않는다.** 단 하나의 예외:
   **전파(01 §3A)로 인한 티어 재조정**. 이 경우에도 카드 본문(수요/공급 서술)은
   건드리지 않고 `tier`, `tier_rationale`, `tier_history`, `market_read`만 갱신하며,
   `tier_history`에 "BUILD N 전파로 조정: {경로}"를 남긴다.
2. 각 빌드 종료 시 무결성 체크를 실행하고 `meta.integrity`에 기록한다:
   블록 <N BUILT 카드 수·필드 완전성·선행지표≥2가 직전 빌드와 **불변**인지.
   전파로 인한 티어 변경분은 propagation_paths에 근거가 있어야 하며,
   그 외의 변경이 하나라도 있으면 QA FAIL.
3. 카드는 append로 자란다(tier_history 누적). overwrite로 줄어들지 않는다.

---

# 5. 커버리지 원장 (Coverage Ledger)

매 빌드가 "무엇이 끝났고 무엇이 남았는지"를 한눈에 알도록 `meta.coverage_ledger`를
유지한다. 이게 있으면 소화할 양이 많아도 길을 잃지 않는다.

```
coverage_ledger: {
  total: 56, built: N, remaining: 56−N,
  built_blocks: [1,2,3,...], next_block: k,
  remaining_by_sector: { 헬스케어: 5, ... },
  provisional_heat: h,  heat_cap: 8,
  pending_edges: e,     // pending_cross_edges 중 PENDING 수
  last_integrity_ok: true|false
}
```

---

# 6. PACK 스키마 증분 (v1.3에서 추가되는 필드만)

기존 필드는 그대로. 아래만 **추가**한다(과거 데이터 파괴 금지):

산업 카드:
- `tier_provisional: true|false`  (§1)

최상위:
- `pending_cross_edges: [ {type,from,to,direction,strength,
   mechanism_hypothesis, created_block, status} ]`  (§3)

meta:
- `coverage_ledger: {...}`  (§5)
- `integrity: { last_verified_block, prior_cards_unchanged: bool,
   changed_by_propagation: [산업id...], note }`  (§4)
- `os_version: "v1.3"`

---

# 7. 매 빌드 확장 QA 게이트 (01 §8에 이어붙임)

기존 01 §8 전부 + 아래:

- [ ] (v1.3) 신규 카드 티어 전부 `tier_provisional: true`
- [ ] (v1.3) 티어는 절대 근거로만 매겨짐(상대 비교로 HEAT 부여한 카드 0)
- [ ] (v1.3) 살아있는 `edges`에 미구축 엔드포인트 엣지 0건
- [ ] (v1.3) 미구축 노드 지목 연결은 전부 `pending_cross_edges`(PENDING)에 존재
- [ ] (v1.3) 이번 블록 노드를 지목하던 과거 PENDING 항목 전부 정산(RESOLVED/유지사유)
- [ ] (v1.3) 블록 <N 카드 무결성 통과(전파 외 변경 0), `meta.integrity` 기록됨
- [ ] (v1.3) `coverage_ledger` 갱신됨(built/remaining/provisional_heat/pending_edges)
- [ ] (v1.3) provisional HEAT가 구축분의 20% 초과 시 diff에 "정산 압력" 플래그

---

# 8. BUILD 7 최종 정산 체크리스트 (딱 한 번, 확정 단계)

- [ ] §2 HEAT 정산 실행 → HEAT 정확히 ≤8, 전 티어 `tier_provisional: false`
- [ ] 강등된 후보 전부 tier_history + verdict_log에 사유 기록
- [ ] `pending_cross_edges` PENDING 잔량 0 (전부 RESOLVED 또는 DROPPED)
- [ ] 블록 간 엣지 연결 완료 — 모든 산업 노드가 최소 1개의 '다른 섹터' 엣지 보유
      (섬 해소 최종 확인)
- [ ] 56장 전 카드 BUILT, market_read·선행지표≥2·tier_history 누적 확인
- [ ] 첫 완성 ATLAS_MAP.html 출력(06 스펙) + 전체 정렬 반영
- [ ] `meta.integrity.prior_cards_unchanged` 최종 true

> BUILD 7을 통과하기 전까지 이 지도는 '잠정'이다. 이 문서의 목적은
> 그 잠정 상태를 **정직하게 표시하고, 어음을 매 블록 갚게 만들어**,
> 마지막에 한꺼번에 터지지 않게 하는 것이다.
