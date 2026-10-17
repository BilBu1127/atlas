# Atlas 수급·관계·후보·탐색 교정 R3 · 2026-10-17

기준 main은 `40ba04c66eebcca3c957ad2684846c1fe97d3f13`이다. R3는 제한 교정이며 전 산업·355개 회사의 현재 운영 검증을 새로 완료한 회차가 아니다. 연구 마감 `2026-10-16T07:53:00Z`, 별도 추가창 끝 `2026-10-16T22:00:00Z`, 10/17 원문 재열람·교정과 UI 준비 시각을 구분한다. 가격 관측은 새로 조회하거나 현재 시세로 재명명하지 않았다.

## 수급과 근거 정산

MAT-02는 **HEAT 이월·현재 재검증 HOLD**다. 과거 정련적자 150–330kt는 현재 지지에서 철회한다. [ICSG 10/14 연간 전망](https://icsg.org/download/2026-10-14-press-release-icsg-copper-market-forecast-2026-2027/)의 2026 +104kt·2027 +368kt로 4월 전망을 대체했다. [9/24 잠정 통계](https://icsg.org/download/2026-09-24-monthly-press-release/)의 1~7월 +32kt·중국 보세재고 추정 조정 −5kt와 8월말 거래소 재고 997.6kt는 서로 다른 기간·분모다. 연간 전망을 현재 지역 현물 부족이나 장기 광산 갭과 합치지 않는다. FCX 복구가 이미 전망에 포함되면 별개 독립 충격으로 다시 더하지 않는다. 구판과 이전 접근 실패 문구는 이력으로 보존하면서 현재 본문에는 대체 관계를 표시했다. 색·enum은 보존하고 산업 판정 옆에 HOLD를 붙였으며 이번 교정을 새 스크리닝 권고로 세지 않는다.

IND-06은 **현재 WARM 유지**다. [AAR 2024](https://www.aar.org/news/aar-reports-weekly-rail-traffic-for-the-week-ending-december-28-2024/)·[2025의 52주 비교](https://www.aar.org/news/aar-reports-weekly-rail-traffic-for-the-week-ending-january-3-2026/)·[2026년 40주](https://www.aar.org/news/aar-reports-weekly-rail-traffic-for-the-week-ending-october-10-2026/)의 carload 회복 D2는 지속 관측이다. 별도 [JBHT ICS 실적](https://investor.jbhunt.com/news/2026/10-15-2026-210616255)의 물량 +22%와 운임 흡수는 회사 범위 D4를 지지하되 비용·믹스·다른 부문 약세를 함께 남겼다. 같은 AAR 원문의 석탄 주간 감소 때문에 전체 철도 회복을 석탄 호재로 전달하지 않는다. 과거 PRIVATE/승인 대기 원전이는 그대로 보존하고 10/17 현재 유지 판단을 별도로 기록했다. 이번 교정의 새 산업 전이는 0건이다.

ITC-05는 HEAT 유지·피크 감시 강화다. [Micron 원문](https://s25.q4cdn.com/621799436/files/doc_financials/2026/q4/Q4-FY26-Prepared-Remarks.pdf)의 AI/서버 계약과 소비 약화·DIO를 함께 본다. fiscal/blended ASP, 달력 DRAM 가격 전망, EOL 선생산·재고 원가 효과의 분모를 맞추기 전 원 반증을 기계적으로 PASS/FAIL하지 않는다. 수상을 새 주문으로, CPO 발표를 전력 발주·리츠 인도 MW로, 구리를 니켈·코발트·우라늄으로 전용하지 않는다.

## 관계·회사·후보에 반영한 범위

검토 제안의 기본 변경 87건은 RFC6902 연산 31건 + 기존 경로 55행 갱신 + 회차 기록 1건이다. 경로는 12개 제한 감시/43개 중단이며 최대 2홉이다. 각 경로의 상품·등록 방향·시차, 현재 이유와 다음 확인을 실제 산업·관계 패널에 표시한다. 첫 홉이 성립하지 않으면 뒤 홉의 실현 효과도 주장하지 않는다. 인바운드 재검토 소환과 정방향 인과 전파를 구분한다.

기존 9개 후보의 status·falsifier는 그대로 보존하고 개별 현재 rationale·반증 평가·남은 질문을 갱신했다. MU·329180.KS·PKG·HSHP·LNG·VG·ONTO·CAMT·TLN을 일괄 완료·일괄 무변화로 처리하지 않는다. TLN은 UTL-02 WARM으로 승격 트리거 미발생/PENDING을 유지한다. UBER는 원 §3B의 소속 DD 필터 누락을 보충한 별도 1건이다. 실제 IND-06 소속·9/3 DD·중복 0·REVISIT OPEN 3→4≤5를 확인했고 Freight 규모·운임/물량·손익 중요도에 한정했다. Mobility/Delivery DD 논제의 새 확증이 아니다. 새 산업 사건이나 가격 사유로 세지 않는다.

87건과 별도로 출처 registry 56키/기준 JSON 58개 실제 복사, GOV 원규칙 URL·문서 해시, 과거/현재 상태 32필드 보완, 55경로의 등록 엣지 추적과 읽기 문안 정리를 기록했다. 잘못 붙은 공개 URL 꼬리 13개는 같은 회사 본문의 명시적 Markdown 대상과 일치할 때만 교정했다. 회사·산업 복사본을 맞추고 이전 문자열을 정산 기록에 보존했다. URL을 추정하거나 실패한 본문을 읽은 것으로 바꾸지 않았다.

회사 패널에는 현재 제한 판단과 기존 DD·원 반증을 함께 표시한다. 355노드/128 DD/227 SHALLOW·56산업·132엣지, 107비교/21 UNKNOWN을 유지한다. 추가68의 changed53/stale11/unavailable1/follow-up3, 미완15와 scoped HOLD도 유지한다. 기존52·111·22의 중복 회계와 두 조사창을 합산하지 않는다. DD 날짜·밴드·KPI·증권 단위·128개 수신 가격 스냅샷은 변경하지 않았다.

## 검수와 운영 범위

결합 후보에서 데이터/방화벽/불변/로컬 재실행 경계 49건, 1440/390 브라우저 시나리오 30건과 실제 355노드 inspector 렌더링 2,130건, 새 코어 표시·escaping 12건, 초기 입력·지연 4건, 직접 링크 초점·도움말 4건을 검사했다. 프로그램 렌더링, 실제 입력, 가상 장애·악성 문자열 복사본은 서로 다른 검사다. 새 시세 조회·실제 연구 모델/예약 재실행·전면 DD 완료로 확대하지 않는다.

관계 상세의 Enter/Space를 부모 산업 선택이 가로채던 결함을 고쳤고 두 화면 폭에서 실제 키 입력으로 재검사했다. Back 펼침/스크롤은 두 프레임 뒤 복원이 끝난 DOM 상태를 기다려 대조한다. 고정 150ms에 먼저 측정해 실패한 기록과 별도 5회 관찰은 비공개 QA에 보존했다.

Flow 검색창에서 Tab으로 결과에 들어갔을 때 blur 타이머가 결과와 초점을 없애던 경계도 수정했다. 초점이 검색창·결과 영역을 떠날 때 닫으며, 키보드 선택과 기존 클릭·터치·Escape를 함께 대조했다.

별도 검토자가 공식 원문 17개 관련 구간과 원 제안을 독립 경제검토했고, 현재 HOLD/구판 대체·IND-06 유지 확정·출처·조건부 소환·최종 결합 검증을 조건으로 수용했다. 원 제안·R2 UX·결합본의 정확한 해시 검수 범위를 구분한다. 최종 비작성자 검수와 실제 게시 결과는 해당 파일 해시·커밋·Pages 실행에 연결된 별도 기록을 따른다. 실제 휴대폰·Safari/보조공학·네이티브 라이브 TLS 전수 검증과 전체 회사 현재 운영 확인은 별도 범위다.

가벼운 입출력·중복 방지 운영 문안은 PACK에 제안으로 보존했다. SOP가 지침 변경 시 저장소/프로젝트 Knowledge 동시 동기화를 요구하므로 00/01/02/03/SOP/USAGE와 예약 프롬프트는 변경하지 않았다. 실제 예약·모델 재실행은 미실시다.

PACK SHA256: `5f211726e01a7e27d63440905adab531374d54293c1c4b29e4c8dcff39720eea`

---

## 이전 R2 기록 — 보존 이력

# Atlas 교정·탐색 개선 R2 · 2026-10-17

기준 공개 main은 `40ba04c66eebcca3c957ad2684846c1fe97d3f13`이다. 아래 이전 추가68 통합 기록은 보존 이력이며, R2 판본의 검수·배포 완료를 뜻하지 않는다. 연구의 기존 마감 `2026-10-16T07:53:00Z`와 별도 추가창 끝 `2026-10-16T22:00:00Z`, UI 판본/준비 시각, 실제 GitHub Pages 배포 시각을 구분한다.

## 귀속·표시 교정

- IND-06 육상물류·철도와 IND-08 항공운송의 신규 수요·공급 요약이 뒤바뀐4문장을 바로잡았다. 각 산업의 수요 본문·공급 본문·회사 연구 요약2곳, 총8개 문자열 필드를 교정했다. 기존 본문은 보존하고 잘못 붙은 추가 문단만 교정했다.
- 회사별 연구와 회사 소속·관계는 서로 바꾸지 않았다. 원 조립 사전의 산업 키를 고치고, 철도/항공 및 럭셔리/여행의 주제·회사명 귀속을 별도로 검사했다. membership이 비어 있지 않다는 구조 검사만으로 의미 귀속을 검증하지 않는다.
- IND-06의 기존 WARM 근거는 AAR carload D2와 JBHT 운임·물량 D4이며 항공 요약을 사용한 이력이 없다. 귀속 교정만으로 티어를 내리지 않았다. “물동량 반등 확인 전”이라는 낡은 시장인지 문구는 과거 이력으로 보존하고 현재 판정과 맞췄다. 원 판단의 경제·출처 재검증은 코어 검토와 구분한다.

## 탐색·읽기 동작

기존 지도 색·그물망·관계 유형을 유지했다. Console/Graph/Flow의 의미 있는 선택은 브라우저 Back/Forward 및 새로고침으로 복원하며, 필터·지도 위치·펼친 근거·읽던 위치를 함께 보존한다. 회사 URL의 부모 산업을 펼치고, 같은 회사 재선택이 읽기 위치를 초기화하지 않게 했다. 사용자 입력이 시작되면 늦은 상태 복원이 그 조작을 덮어쓰지 않도록 했다.

Graph는 touch pan/pinch, 산업·회사 검색, 노드 방향키/Enter 선택과 닫기를 제공한다. Flow는 빈 지도 drag와 click을 구분하며, 검색 Enter가 새로 초점받은 닫기 버튼을 작동시키지 않는다. 닫힌 패널은 초점 대상에서 제외하고, Console 모달의 배경 스크롤/Tab과 초점 복귀를 관리한다. 모바일 닫기를 고정하고 hit area를 넓혔다. reduced motion을 CSS뿐 아니라 Graph JS 움직임에도 적용했다.

보존된 DD 논제·날짜와 회사 제한 확인을 가격 진단보다 먼저 읽을 수 있게 했다. 가격 출처·단위·보존 계약·검수 상세는 접을 수 있다. UNKNOWN, 비교/표시 억제, 중요 HOLD, 실제 관측일과 원 DD일은 요약에도 남긴다. DD 밴드·가격·환산·tripwire 원장은 수정하지 않았다. 긴 coverage/후보/검수 상세를 접어 산업 시작점을 앞당겼으며 전체 현재운영 검증이 미완이라는 설명은 유지했다. 데이터 실패 시 상단 이동을 보존하고 재시도를 제공한다.

## 검수 범위

작성자 로컬 후보에서 1440/390의 실제 조작을 포함한30개 시나리오와 실제 PACK의2130개 회사 inspector 렌더링을 검사했다. renderer 전수 호출과 실제 사용자 조작은 별도 검사다. 실패 주입 HTTP503·지연과 악성 문자열 복사본 검사는 가상 조건이며 공개 서비스 장애나 실제 PACK 변경으로 세지 않는다. 브라우저에서 PACK 값은 불변이고 원 DD·관측일·단위·억제·UNKNOWN 방화벽을 대조했다. 발견된 새 Enter/초점 회귀를 수정한 뒤 해당 여정을 재실행했다.

아래 이전 검수의 반복선택·뒤로가기 통과는 당시 시나리오 범위의 기록이다. 이후 실사용 감사에서 발견된 복귀·터치·패널 결함은 R2에서 교정했으며, 과거 구조/렌더링 통과를 UX 완성으로 확대해석하지 않는다. 독립 최종 검수와 게시 결과는 최종 판본에 연결된 검수·커밋·Pages 실행 기록으로 확인한다. 실제 휴대폰·Safari 검증과 전체355회사 현재운영 전면검증은 별도 미완 범위다.

---

## 이전 추가68 통합 기록 — 보존 이력

# Atlas 추가68 통합 delta · 2026-10-17

검증 기준 main: `9280de69f1e9fc1a80a56e647bff3cc14132161b`. 이 문서는 게시 전 검증기록이다. 실제 게시·배포 결과는 이 기록을 포함한 커밋과 해당 GitHub Pages 실행으로 별도 확인한다.

355노드(128 DD / 227 SHALLOW)·56산업·132등록엣지 유지. 추가68은 changed53/stale11/unavailable1/follow-up3. 미완15와 changed행의 scoped HOLD를 보존했다. changed는 사업 개선·새 사건·전면 DD 완료가 아니다.

15개 관련 산업의 수요·공급 본문을 보완하고 관계 관측30개와 기존 방향을 따르는 최대2홉 경로55개를 기록했다. 경제적 중요도·독립 트리거가 미확인인 관계는 HOLD이며 신규 활성엣지·산업상태 전이·후보 변경은0이다.

기존52는 changed27/follow-up24/unavailable1, 전사 무변화0. 355=235+52+68은 서로소 coverage 회계이다. 기존111은 signal scan(현행서술55/history-nextcheck56)이며22 DD와5중복, 합집합128이다. 전체 현재운영 검증 PASS로 표시하지 않는다.

원 조사창07:53Z와 별도22:00Z 추가창을 분리했다. 시간검증 extension은4계보, 직접회사5(GE/LMT/NOC/UNP/OWL)이며 BA는 기존주문 관계뿐이다. LMT/NOC 공유기체와 UNP/NSC 공식요약을 두 독립 trigger로 더하지 않는다.

원 DD날짜·밴드·통관계약·단계·tripwire와 가격관측 시점을 유지했다. 107비교/21UNKNOWN, LAES UNKNOWN/null gap 및 USD1.93 관측을 보존한다. FI/FISV·BEP/BEPC·ADR 등의 가격/밴드 자동승계는 없다. CRDO/UUUU/ASML의 원 DD와 새 본문 시점 표시를 보존했다.

Console/Graph/Flow의 회사패널에 사실·반증·원출처·HOLD를 표시하고 Console/Map에 현재 coverage 한계를 표시한다. 기존 디자인 CSS와 그물망·관계맵을 유지했다. 출처 링크는 원래 테마 색을 따른다.

수신 연구와 기존 독립감사 기록을 재사용했다. 이번 통합을 새로운 원문 전수열람·새 시세조회·전사실적 재검증으로 표현하지 않는다.

검증: 기존 구조53 + 추가통합53, 실제355노드의 desktop/mobile 3개 inspector2130회, 브라우저 시나리오140개 통과. 실제 픽셀 150개는 비공개 QA에 보존. 원본 데이터 불변·반복선택·뒤로가기·escaping·단위/경계·UNKNOWN·전파 HOLD 포함. 별도 검토자의 최종 독립검수는 아래 지정 해시 후보에 대해 조건부 수용으로 완료됐다. 원격 반영과 실서비스 검증은 그 독립검수의 실행 범위에 포함되지 않는다.

PACK SHA-256: `c2378ee31d88dd4014975b8d3ec956c6909c6255a1ab8dced3bb52d192e3dd31`

## 회사별 delta와 잔여 HOLD

| 회사 | 판정 | 반영한 본문 범위 | 잔여 HOLD |
|---|---|---|---|
| NEM | stale | 9/24 확보한10/22 결과발표 일정은 실적이 아니다. 최신 생산·AISC·현금 비교 stale. | 최신 생산·AISC·capex·현금 비교 미완 |
| AEM | stale | 9/28 결과발표 일정 확인; 광산별 현재 생산·원가·현금은 stale. | 광산별 최신 운영·원가·현금 비교 미완 |
| WPM | stale | 10/6 SEC 일정 공시는11/5 발표 예고; 현재 stream 인도·현금 비교 stale. | stream 인도·부채·현금 비교 미완 |
| MP | stale | 과거 정책 공식요약과11/5 결과 일정 보완; 자석·NdPr 생산/수율 actual 미완. | 원 정책 고시·생산·수율·실적 미완 |
| LMT | changed | 10/15 C-130J 기반기체 인도·Texas 생산투자·Avio 협력을 보완. mission integration·qualification·funding은 별도. | funding·qualification·실제 ramp·마진·현금 HOLD |
| NOC | changed | LMT와 공유하는 C-130J 인도계보; NOC mission integration은 미래. 과거 Sentinel와 현재 사건을 분리. | mission integration·양산·프로그램 수익성 HOLD |
| GD | changed | 10/7 발표한 경영진 승계의 미래효력과 자회사 범위 보완; 즉시 실행·운영개선 아님. | 승계 미래효력; 생산·funded backlog·실적 HOLD |
| BA | changed | 기존 인도표 재사용과 PAC-3 seeker·F/A-XX 계약단계 보완. funding·물량·margin 미완. | contract definitization·funding·인도/현금 연결 HOLD |
| GE | changed | 10/16 10:47:43Z CFM–Turkish MOU. 엔진/서비스/옵션·GE–Safran JV와 BA 과거주문을 분리. | MOU·옵션·서비스/JV 귀속·실제 shop throughput HOLD |
| UNP | changed | STB 공식요약과10/16 13:01:58Z SEC 은퇴계획 문서 보완. 원결정·합병승인 미확인. | SEC10/16시각 후속검증 해결;STB원결정·독립실적 HOLD |
| NSC | follow-up | STB 공식요약만으로 합병승인을 판정하지 않는다. 원결정·독립 운영비교 follow-up. | STB원결정·독립실적 HOLD |
| CSX | changed | COO 전환과 조직운영 발표 보완. 현재 수송량·yield·운영개선은 별도 미확인. | timestamp없는 weekly traffic 제외; 실제 물량/yield/OR HOLD |
| ODFL | stale | 요율공고와 과거8월 운영 앵커; 이후 실제 물량·yield·운영은 stale. | 요율 공고와 과거8월 실적; 이후 실제 운영 HOLD |
| DAL | changed | 9/30 종료분기 actual의 TRASM/yield 개선과 margin9.4%·FCF463m 악화를 함께 보완. Q4는 전망. | 기존 사건의 전체표 보완;10-Q및 향후 actual HOLD |
| UAL | changed | 정비 확대·10/15 Starlink 운영 및 dated 실적일정 보완. Q3 재무 actual과10/16 시각미상 앱은 HOLD. | 기존 live source 부적격 유지;Q3재무결과·10/16앱시각 HOLD |
| FDX | changed | 10/1 FedEx Supply Chain 매각완료. EV1.4bn은 세후현금·이익이 아니며 연결비교 후속 필요. | perimeter·fiscal기간·parcel/freight비교 실적 HOLD |
| D | changed | 자회사 연료비 유동화 승인 보완; 실제 발행·현금확보 아님. 문서 만기/사건번호 불일치 HOLD. | 원문/부록 만기·사건번호 불일치;최종IAL·실제발행 HOLD |
| SO | changed | 10/10 18:00ET 복구42만·잔여8만 고객의 날짜 고정 관측.10/16 현재 정전상태·회수비용 아님. | 10/10관측의 현재화 금지;복구비용·규제회수 HOLD |
| AEP | changed | 조건부1GW 고객약정과702MW Google/Bloom 전원계획을 분리. 실제 부하·가동·BE 매출로 합산 금지. | 조건부계약·PPA계획;승인·실제부하·가동 HOLD |
| ENPH | changed | repowering 프로젝트의 완료30kW·진행240kW 등을 구분. 전체 출하·margin·세제적격 미완. | 제한된 프로젝트 실행;전체shipments·margin·cash HOLD |
| BEP | changed | BEPC 투표승인과 BEP outstanding-unit 요건·미래court/closing을 분리. Westinghouse 틀은 nonbinding. | BEP표결·court·closing·Westinghouse계약귀속 HOLD |
| FLNC | changed | Vattenfall signed 프로젝트·EVE 조달과 과거 guidance 하향 반증 보완. 2028말 가동은 전망;10/9 8-K는 리더십. | forecast손실·제조지연 보존;현금·commissioning HOLD |
| KLAC | stale | Historical product/service comparison and future results date | Pre-baseline actual and calendar only; fresh operating conclusion incomplete |
| ONTO | changed | 9/28 award announced 10/12; Dragonfly G5/HBM relationship | Award and issuer-side customer relationship not new order or independent customer confirmation |
| CAMT | unavailable | Route-specific unavailable; not companywide access failure | 10/14 deck access only; Q2 body was read and remains historical |
| MU | changed | Prior earnings reuse, SCA structure and separate Netlist settlement | Selected 10-K paragraphs only; management margin expectation is not guarantee; 600m license obligation not paid total |
| SNDK | stale | Standalone SNDK fiscal Q4 anchor, not MU proxy | Historical release actual, not latest operation or fully audited 10-K certification; customer denominator preserved |
| SMCI | changed | Product, CFO and specific patent-proceeding events | ITC proceeding termination is not BIS clearance or ITGC remediation; OCF counterevidence preserved |
| CLS | changed | DS6005 CPO product and Broadcom relationship | Paid deployments, revenue and market share not established |
| APH | follow-up | Succession notice; historical Q2 anchor | Future segment leadership effective date; fresh operating comparison incomplete |
| V | changed | Prior A2 reuse plus China/Direct milestones | China preparatory approval is not final license; limited production eligibility; stablecoin subset not entire network |
| MA | changed | Agent Pay/B2B/BVNK/European processing milestones | Availability, testing, opened processing and future integrations distinguished; endpoint count is not paid TPV |
| FI | changed | Platform/product/deployment facts with prior Q2 deterioration counterevidence | Same Fiserv issuer now FISV; no automatic key, price or band migration; Deployment and cumulative shipment do not establish current profitability |
| PYPL | changed | Product terms and announcement; historical financial anchor | 10/15 Venmo launch eligibility announced; implementation not independently confirmed; Synchrony/Visa identity |
| BX | changed | BXPM launch, Analogic-Leidos financing, Falcata platform announcement. | Q3 full results and vehicle-specific redemption/credit-risk updates not established.; Product launch is not proven inflow.; No proof that all announced acquisitions closed or all loan amount belongs to BX. |
| KKR | changed | QTD monetization estimate, Samsung Helix commitment, Gen II agreement and TotalEnergies JV expansion agreement. | QTD estimates are not full Q3 actual results.; 2026 FRE classification differs from prior comparison period.; Transaction closing and insurance-credit-risk current status not fully established. |
| ARES | changed | Preliminary performance income, new fundraising, PTI financing, Plenitude governance and Statera investment. | Q3 consolidated FPAUM bridge and FRE not established.; Fund commitments and financed assets are not parent operating cash or AUM growth.; Ares Plenitude IR URL failed; counterparty Eni primary body successfully read. |
| OWL | changed | Subsidiary credit amendment and separate related-fund tender pressure; O3 is isolated extension. | Parent OWL is not the credit agreement party.; OTIC tender amounts are not parent liabilities or OTF metrics.; Q3 full manager results not established.; Undated homepage permanent-capital number must not override dated Q2 deck. |
| ICE | changed | September and Q3 product-volume changes. | RPC, data and mortgage results, acquisition status and comprehensive regulatory coverage remain follow-up.; Dynamic supplemental page rendered navigation only; absence is not no-change evidence. |
| CME | changed | Existing monthly/Q3 body reused; oil product filing withdrawal, cloud milestones, initial baseball live versus additional contracts. | C0 was already established in A2 and is not new source/event credit.; RPC and data revenue/profitability not established.; Margin-advisory attachment and publication timestamp unavailable. |
| NDAQ | changed | LeveL acquisition completed; options volume, share and estimated capture examined. | Mutable monthly PDF byte-version at historical cutoff not established.; Revenue capture remains estimated.; Future always-on services and approvals not established as actual. |
| SCHW | changed | Q3 actual flows, NII and cash balances; announced TXSE secondary listing with NYSE primary retained. | Cash categories and long-short presentation are distinct.; Secondary-listing announcement does not independently prove first trading.; Relevant earnings sections read, not full 10-Q DD. |
| SBAC | changed | Commercial paper program established. | Capacity is not issuance.; Q2 operations and 2026 guidance are historical context.; 2021-1C anticipated November 9 repayment/refinancing current completion remains unverified. |
| TSLA | changed | Q3 생산 464,391대, 인도 486,532대, 에너지저장 배치 13.7GWh. Model 3/Y 인도 478,237대, 기타 8,295대. 자동차와 에너지의 운영 지표를 처음 보완함. | Q3 마진/FCF/ASP 미확인; Roadster 10/15 발표 보도 발견; tesla.com/roadster 원문은 3행으로 내용·출판시각 미확립. 사양·2028 생산전망 편입 HOLD; NHTSA robotaxi 관련 secondary discovery는 원문조사 미완료; 안전 결론 없음 |
| GM | changed | 미국 Q3 판매 670,974대, 전년 대비 약 6% 감소. Trax +16%, Buick +8%, fleet +10%로 총판매 감소와 차종/채널 강세가 공존. | 10/12 China Q3/NEV release는 공식 IR 검색목록에 있으나 원문 미확보; investors.gm.com 403 및 구형 news index 미렌더링은 GM의 중국 공시 경로에만 영향; 10/16 혁신 소개 페이지 date-only, extension 편입 불가 |
| F | changed | Q3 미국판매 509,764대(-6.6%). Escape/Corsair 단종 영향 제외시 회사추정 점유율 +0.4%p; Maverick hybrid 27,793대(+59.6%). 유료 소프트웨어 구독 >170만(+40% 이상). Michigan LIFT 발족으로 공급망 혁신 파트너 관계 보완. | 미국 판매와 연결 재무 분리; 업체별 LIFT award/계약·구독 매출/ARPU 미공개; BEV 감소율은 이 원문 텍스트에서 확인되지 않아 secondary 수치 미편입 |
| STLA | changed | 추정 연결출하 1,286천대(-1%): 북미 -12%, 유럽 +10%, 중동아프리카 -21%, 남미 보합, 아태 -6%. 북미 Jeep 생산중단과 Ram 증가, 유럽 Smart Car·Leapmotor 증가의 혼합. 기존 Jeep 재고169일은 유지. | B10 10/16 DATE_ONLY: 07:53 이후/22:00 이전 모두 확정 불가; Q3 연결매출·마진 미공시; 10/28 발표예정; Cox EV undated correction 격리 유지 |
| TM | changed | 미국 Q3 TMNA 판매 633,223대(+0.6%), 전동화 363,367대(+28.5%), mix57.4%. 9월 판매 +8.4% volume, +4% DSR. Toyota/Lexus Q3 각각 +0.5%/+1.6%. 기존 Toyota브랜드 재고35일 유지. | 글로벌 9월 생산/판매 및 현 FY 연결수익성 미검증; 10/14 RAV4 PHEV recall secondary discovery의 NHTSA 원문 확인 HOLD; Cox EV 격리 유지 |
| RIVN | changed | Q3 생산19,751대/인도19,248대. FY2026 인도 가이던스65,000–70,000대 유지. 규모 증대는 확인하되 연간 전망 상향으로 기록하지 않음. | 10/14 Redwood lifecycle partnership issuer-wire 검색발견, BusinessWire 및 Nasdaq open 실패. 보도 요약만으로 관계 확대 확정 편입 금지; 10/16 OTA 고객후기 date-only는 현재 검증·extension 근거 아님; Q3 cash burn/R2 gross profit/부품 공급 미확인 |
| APTV | changed | 9/25 사례공개: 중국 EV OEM에 Emergency Power Module 양산 적용. 기존 body controller 손상 시 ultracapacitor 백업전원/독립 unlock 경로를 제공. 안전 전자부품 역량 및 OEM 공동설계 근거 보완. | 신규 매출/양산날짜 미확인; 9/10 smart camera·8/25 NVIDIA 발표는 pre-baseline; Q3 결과11/3 일정만, 실제실적 미확인 |
| BYDDY | changed | 9월 NEV 판매463,561대, 생산463,864대. 1–9월 누적 판매3,131,576대(-3.94%). 승용 BEV 누적+1.50%, PHEV 누적-10.19%; 9월 수출180,700대. | ADR instrument identity/비율/후계치환 HOLD; 9월 수익성·가격/할인·현금흐름 미확인; PDF 시각표 검증 미완료, 입력수치 추가 수동대조 권고; 10/16 Seal06 launch 검색인덱스는 date-only/본문 미확인 |
| LVMUY | changed | 기존 Q3 그룹 organic+1%, 패션/가죽-5%, 주얼리+6%, 선택적유통+8%를 유지. 이번 새 사건 수에 포함하지 않음. | LVMUY ADR 검증 미완료 유지; 10/16 Les Journées/중국관련 보도는 정확시간/원문 범위 미확립; 이번 checked-no-material-change 전체판정 아님; baseline 대비 기존 change를 재사용한 것 |
| HESAY | stale | 현 게시문서의 실제 재무기간은 H1: 매출€8.163bn(+6% CC/+2% reported), recurring margin41.0% vs41.4%. 10월 새 Q3 성과로 입력할 수 없음. | HESAY ADR mapping 미검증; 10/8 guide timestamp timezone unknown 및 PDF September 표제차 보존; Q3 10/22 예정은 실제발표 아님; Grace Wales Bonner/Nichanian transition 독립 최초발표일 확인 필요 |
| PPRUY | changed | 10/9 Saint Laurent와10/15 McQueen의 창작리더 퇴임이 별개 issuer 발표로 확인됨. 두 브랜드의 후임 발표는 아직 미래로 기술. | PPRUY ADR mapping 미검증 유지; 10/16 share-voting statement date-only, extension HOLD; 10/16 Flore Larger appointment secondary 기사만 발견, primary/시간 미검증; A2에서 거부된 2025 Q3본문/2026검색메타 혼합자료 재활용 금지 |
| NKE | changed | FY27 Q1 매출$11.213bn(-4% reported/-5% CC), Direct-8%/Digital-13%, wholesale-1%, Converse-28%. GM42.8%(+60bp), 순이익$712m(-2%), 재고$7.846bn(-3% y/y). Pace와 FY27 전망을 발표. | 10-Q URL 발견했지만 별도 전체 MD&A 읽지 않았으므로 추가 units/ASP 수치 편입 안 함; 10/16 foam explainer/Form4 date-only는 extension 적격시간 미확인; 매출/재고 quarter-end를 현재10/16 재고로 취급 금지 |
| RL | stale | 기존기간 FY27 Q1 매출+14% reported/+13% CC, DTC comps low-double-digit와 AUR+15%. 과거 영업기반 이해 보완이며 이번 주간 신규실적으로 집계하지 않음. | 10/8 Nov5 Q2 발표일 공지는 실적본문 아님; 현재 organic/volume/채널재고/GM 변화 미확립; 공식 홈페이지의 현재뉴스가 없음은 무변화 판정근거 아님 |
| TPR | stale | FY26 매출$8.0bn(+14%reported), Coach성장과 Kate Spade부진이 양극화. 주간범위의9/28 인터뷰 소개에는 새 운영 수치가 없고 full interview 확보도 없음. | 9/16 partner원문 route error; 이번새관계로 집계 금지; 9/28 인터뷰 영상 미확인; 현재 FY27 실적·반품/재고·채널mix 미확립 |
| EL | changed | Oevel 공장 수자원 시스템€5.7m 투자. 가동 후 물 사용강도 9.3→3.6 L/kg 및 연 약 2,500만 L 절감 예상; 제조 효율화/공급망 관측 보완. | FY26 Aug19 earnings는 검색발견만, 이번본문 검토아님; current organic sales/travel retail/China·재고/GM 미검증; 10/8 브랜드GM appointment/10월 philanthropy는 index만 보고 실적변화로 쓰지 않음 |
| CPRI | stale | 과거 Q1FY27 매출$769m(-3.5%reported/-4.1%CC); Michael Kors-7.1%, Jimmy Choo+10.5%. GM65%(+200bp), 재고-20%. FY27 매출약$3.4bn/EPS약$2.15 전망은8/5시점. | 10/16 Q2 report-date notice는 검색인덱스에 있으나 공식본문/게시시각 못확립: CUTOFF_TIME_HOLD; 현재 Q2 actual이나 forecast변경 확인 아님; 동적IR latestnews 미렌더링과 PDF일시failure는 CPRI 해당route에만 영향 |
| MAR | changed | 10/5 Townhouse Hotels 계약: 네덜란드8개호텔/700실 이상, Series6개와 Tribute2개 편입 예정. 기존 독립호텔의 collection-brand 유통/로열티 확장. | 10/7 Thailand FICO primary page0행: 그계약만 미검증; Q3 results Nov2 일정만 존재; 현재 RevPAR·fees·occupancy 미확인 |
| HLT | changed | Bengaluru공항 인근 Kalyani Group과 두호텔 계약, Conrad300실/Hilton300실,2030예정. 인도 development/partner관계 보완. | Q3 RevPAR/ADR/occupancy/fee results 미검증; 계약금·개발지연·수수료조건미공개; 현재 파이프라인 총계 재계산 안 함 |
| BKNG | changed | Vayo 신규사업에 계획$100m 투자, invite-only무료privatebeta. 그룹/외부여정 확인정보를 모으는 AI여정 도우미로 directbooking·nativeapp·groupplanning은 미래기능. | Q3 roomnights/bookings/takerate 실제수치미검증; OpenTable/Visa10/14는 index-only, 별도primarybody미검토; 투자계획을 확정capitalallocation으로 적용금지 |
| ABNB | changed | AI검색/비교·설명,50개이상언어지원,호스트멀티캘린더/3D플랜·가격추천·대시보드. 유럽음식/장보기와미국Rinse세탁/BabyQuip 등 stays연계서비스 확장. | Q3 bookings/nights/GBV/takerate/경험매출미검증; Lark75hotel 관계 secondary 날짜가8/4와10/13으로 충돌, issuer원문미확립: 새10월사건으로 편입금지; soft-franchise라는 외부분석을 실제가맹계약으로 입력금지 |
| RCL | changed | CruisePortNaha 신규 터미널 기공, MSC계열CTLMaritime와RCLCruises의 JV. 8월합의 이후 실제 프로젝트 실행단계이며 운영2028-03 목표. | Q3 netyield/bookings/cost financialbody미검토; 9/23Sandals파트너발표 baseline동일일 시각불명·본문미독이라 HOLD; 10/14Europe2028/29deployments index-only, 실제yield로 전이금지 |
| CCL | changed | Q3 netyield CC+2.4%, 조정EBITDA약$3.0bn전년유사, 조정EPS1.43. 2027예약/보증금강세와 비용부담 공존. 10/15 호주배치계획: Luminosa/Adventure2028년3월 이탈, Splendor/Encounter 유지. | PDF파일명 Final-Draft 및03폴더와9/29본문날짜를보존; SECexhibit교차확인은미완료; groupCCL과CarnivalCruiseLine브랜드관측분리; 현행보유증권법인/후계치환미실행 |
| MCD | follow-up | 10/1회사입장: 도구는식당별가격추천이며 자동/실시간/개인화가격설정은하지않고 가맹점이독립결정한다고설명. 가맹모델/AI운영관계의반증자료로사용가능. | currenttraffic/check/same-storesales/restaurantmargin미검증; 소송제기/피고/청구의primarydocket확인필요; secondary보도만으로법적결론금지; 9/23발표를baseline이후사건으로확정금지 |
| CMG | changed | Bradenton1500번째Chipotlane개점,2년미만500개추가.새매장Habanero디자인/HEEP장비.2026년350–370개개점은가이던스,미국캐나다7000개는장기목표. | Q3실적10/28예정;현재트래픽·마진미검증; Florida+17%/1500jobs는미래전망; 10/13bag·10/5marketing자료를실적사건으로중복계산안함 |
| 300308.SZ | changed | 10.47% share transfer closed; dated notices and historical anchors | 9/23 buyback economic boundary unknown; ESOP is not cancellation; no price/security replacement |


## 공개 검증기록 · 게시 전 고정

실행 식별키: `BilBu1127/atlas|2026-10-17|weekly-update`. 같은 키와 같은 제품 해시가 이미 반영돼 있으면 중복 커밋을 만들지 않는다.

### 입력 시점과 후보 연결

- 기존 연구의 공개자료 마감은 `2026-10-16T07:53:00Z`다. 별도 추가창의 끝은 `2026-10-16T22:00:00Z`이며, 4개 사건/문서 계보·직접 관련 회사5개(GE, LMT, NOC, UNP, OWL)로 한정한다. 기존52개를 22:00Z까지 소급 검증한 것이 아니다. BA는 기존 주문의 관련 회사다.
- 공개자료 출판시각, 실제 경제기간·계약단계, 원 DD 검증일, 가격 관측일은 서로 다르다. 날짜만 있는 자료와 미열람·동적 문서의 한계를 본문에 보존한다. 수신·통합일은 새로운 원문 전수조사일이나 새 시세일이 아니다.
- 유일한 구동 원본은 `data/ATLAS_PACK.json`이다. 최종 후보는 2,470,778 bytes, SHA-256 `c2378ee31d88dd4014975b8d3ec956c6909c6255a1ab8dced3bb52d192e3dd31`이다. 이 문서 보완은 검수된 PACK/UI 바이트를 변경하지 않는다.

### 완료된 독립 검수

- 검토자 식별명: `independent_final68_audit`. 통합 작성자와 별도인 검토자이며 개인 계정 식별정보는 공개하지 않는다.
- 완료시각: `2026-10-17T04:09:08.407981Z`.
- 판정: `CONDITIONAL_ACCEPT_LOCAL_REVIEW_CANDIDATE`. 신규 중대 내용 결함0, 신규 hard blocker0. 독립 파일·데이터 검사33개와 브라우저 검사56개 PASS. 실제355노드의 3개 inspector × 2개 화면폭 순회2,130건과 별도 실제선택42건을 구분한다. 모든 노드를 마우스로 클릭한 검사나 새로운 외부 원문 전수조사라는 뜻은 아니다.
- 독립 보고서 MD SHA-256: `e82cede5a57a6f3933a4dd7322062e088d4c335ef0c79e0d863349fe25f627b1`.
- 독립 보고서 JSON SHA-256: `f00f23c9e271245abb69ef1e35c87fbe3fbf674133fff5682920bcb1e594b595`.
- 원 보고서·스크린샷은 비공개 보존 대상이다. 위 digest는 해당 검수기록을 고정하며 비공개 원문 자체를 공개하는 링크가 아니다.
- 수용 조건: 미완15와 changed행별 scoped HOLD, 서로소 coverage 회계, 조사창·경제기간·증권·가격의 경계를 유지한다. 전체355 현재 운영 검증, 새 전면 DD·밴드 검증, 새 시세조회, Library 보존 또는 게시·배포 완료로 표현하지 않는다.
- 비차단 서식 관찰1개: FI 근거의 `### Identity: preserve FI node, flag historical alias`가 일반 텍스트로 표시된다. 내용과 신원·HOLD를 읽을 수 있고 출처 손실은 없다. 이번 게시에서 수정하지 않는다.
- 실제 화면에는 coverage와 회사별 HOLD·원 DD일·가격 관측일이 표시된다. 전용 last-good 상태 필드·배지 또는 자동 복구 기능은 구현돼 있지 않다. 저장된 FRESH/AGING/STALE는 회사·KPI 전체 현재 검증 완료를 뜻하지 않는다.

### 공개안전과 보존 상태

- 승인된 게시 범위는 PACK, Console/Graph/Flow/Map, 공통 표시 helper 및 이 공개 변경기록이다. 기존 Guide/index, DD 아카이브, 지침 및 보안·Pages 설정은 보존한다.
- 공개 ZIP의 전체 member와 patch의 삭제·문맥 부분을 독립 검사했다. 실제 자격증명·Library ID·비공개 절대경로 검출0. 이는 모든 가능한 기밀 형태를 수학적으로 배제한다는 주장은 아니다.
- 비공개 연구 원문·입력 ZIP·private QA·계정 정보·인증 정보는 GitHub에 게시하지 않는다. 주요 근거의 공개 출처와 원래 열람 범위는 PACK 본문에 유지한다.
- 최종 산출물의 Library 새 버전 보존은 미완이다. 공식 업로드 helper의 도구 검색 단계에서 HTTP 401이 발생했고 신규 버전 확정은 완료되지 않았다. 해당 경로는 중단 상태로 유지하며 GitHub로 비공개 자료를 옮겨 우회하지 않는다. 이는 연구의 조건부 부분 게시와 별도 보존 상태다.
- 이 기록은 게시 전 검증 snapshot이다. GitHub main 반영, 해당 커밋의 Pages terminal success, 실제 제공되는 PACK/UI 해시와 화면 검증은 후속 배포 영수증으로 확인한다.

### 검수된 제품 파일 SHA-256

| 경로 | SHA-256 |
|---|---|
| `data/ATLAS_PACK.json` | `c2378ee31d88dd4014975b8d3ec956c6909c6255a1ab8dced3bb52d192e3dd31` |
| `ATLAS_CONSOLE.html` | `135da3d8604135217b6050cb6317a6f99032b9675f4d9e70949d591fa48cea77` |
| `ATLAS_GRAPH.html` | `5bb805e9fa93fa4ce32f31cdfc54e544eaa4bf90bcca076d304c157d1c42441a` |
| `ATLAS_FLOW.html` | `955d9f4a6d188f6681406ac790065879dcd0b030803d70f1603a76c387aa6a25` |
| `ATLAS_MAP.html` | `c42fc45aa6dd818b07557f591c0801cb70017638ed042e31956cc6e2d09a52b9` |
| `ATLAS_PRICE.js` | `e8ca540eb2f8ffbfc38286f622620481a99f6127a745b7a8577b9b2a7c7200cd` |
