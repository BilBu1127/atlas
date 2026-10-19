# 기존 수동 UPDATE와 주간 운영의 연결

원 00/01/02의 수급·사이클·변화율 판단과 03의 진입/통관/전파/부채/가격 순서를 유지한다.
기존 예약은 이 문서의 사람/대화 판단 경로를 호출하는 주체이며 코드는 조사·경제 판단을 대신하지 않는다.
실제 주간 판단의 진입은 예약 메시지/UPDATE 대화다. 로컬 PACK/reader의 검증·활성화 진입점은
기존 `tools/build_reader.py`다. 새 범용 runner, 모델 호출, 인증 기능은 없다.

1. **판본 확인:** 현재 canonical main·PACK·지침6종·직전 cutoff·기존 성공/실패 기록·중복 run key를 확인한다.
   로컬 private 후보를 이미 게시된 canonical 상태로 취급하지 않는다.
   외부 조사 요청 전 아래의 접근 이력 handoff를 먼저 만들고 각 조사자의 수신·동의를 결속한다.
2. **MODE A:** 산업/회사 전체를 실제 PACK에서 열거한다. 변화 경량 스캔과 실제 원문 재독해를 구분하고
   근거·반대근거·기간·분모·계보·잔여질문을 기록한다. 일부 자료 읽기를 전체 현재 운영 검증으로 확대하지 않는다.
3. **MODE B:** 실제 발견한 새/수정 DD를 신원/내용/판본으로 중복 제거하고 원문 날짜·밴드·KPI·산업 귀속을 통관한다.
   원문을 못 읽었거나 발견 범위가 불완전하면 HOLD다. 수신 날짜를 원 DD 날짜로 바꾸지 않는다.
4. **유기적 반영:** 회사 사실을 산업 수급/사이클과 관계 경로·기존 후보의 반증/다음 확인에 연결한다.
   실제 상태가 바뀌면 H/M 연결을 소환해 최대2홉 재검토하며 미실행 부채를 남긴다. 단일 보도 계보를
   독립 신호 두 개로 세거나 가격·리스트 공백으로 후보를 채우지 않는다.
5. **가격:** 티어·후보·전파 판단 뒤 관측 시점/통화/증권/단위/비교 자격을 확인한다. 실패 입력은 UNKNOWN,
   마지막 정상 값은 과거 기록이다. 이 단계 NOT_RUN인 부분 리허설은 최신 가격·전량 주간 성공으로 표시하지 않는다.
6. **로컬 계획:** 새 PACK/reader와 원 diff를 활성 경로 밖에 둔다. SOP §3의 `--prepare-reader`는
   미검토 초안만 만든다. `--mode A/B --pack ... --reader ... --diff ... --review-plan ...`은 승인하지 않는다.
7. **실제 독립 검토:** 전체 UPDATE와 reader별 변경을 구분하여 원문·반대근거·실제 판단·정규화 후 내용을
   독립 검토한다. 실제 근거 파일과 이전/제출/정규화 PACK·reader·diff·지침6종 해시에 묶인 기록만 쓴다.
   합성 QA 영수증을 실제 연구에 재사용하지 않는다. checkpoint 문자열은 판단 진실성이나 신원 인증이 아니다.
8. **로컬 활성화:** 같은 제안·reader·diff와 `--reviews ... --update-review ...`를 기존 빌더에 전달한다.
   성공하면 단일 PACK/reader pair를 교체한다. 실패는 이전 pair, 같은 입력은 중복 없는 재개다.
9. **Knowledge:** 후보 지침6종과 로컬 mirror의 bytes·MD5·SHA256을 전량 대조한다. 원격 Knowledge 교체는
   실제 쓰기와 확인 전까지 미완이다. mirror 검증을 원격 동기화로 보고하지 않는다.
10. **원격 반영:** 별도 승인·기존 차단 해소 후에만 최신 main을 재대조하고 동시 변경을 조정·재검증하여
    guarded 반영한다. commit·Pages terminal success·실제 site 파일·화면·입력/검토 판본의 연결이 필요하다.
    현재 이 원격 단계와 예약 수정은 수행하지 않는다.

원본/실패 증거는 덮어쓰지 않는다. 실제 연구 리허설과 합성 테스트, 성공한 정적 배포와 성공한 주간
조사를 구분한다. 각 대상의 정직한 coverage와 남은 HOLD가 유지되어야 한다.


## P01–P06 로컬 실행 계약 (구현본, 예약·원격 운영 아님)

기존 `tools/build_reader.py`가 검토 계획과 단일 PACK/reader 활성화를 맡는다.
경제 판단·실제 원문 독해·독립 검토·예약 실행·원격 반영을 대신하지 않는다.
새 runner/model API/cron은 추가하지 않는다. DDOS1.7→Drive 자동 편입은 이 범위 밖이다.

### 요청 전 접근 이력

기존 빌더는 요청 전 handoff와 이후 검수의 누락을 차단한다. 사후 제외는 요청 예방이 아니다.
빌더는 실제 web/Drive/Library 도구 요청을
가로채지 못한다. 실행 actor는 이 절차를 조사 handoff에 넣고 **요청 전에** 지켜야 한다.
이 로컬 구현·fixture 합격은 native 예약·자동운영 PASS가 아니다.

private 접근 정책은 검토된 원장의 정확한 판본과 원문 사유·대상·기록시점/미상·원 재시도
범위를 담은 증거를 보존한다. 빌더는 코드에 digest로 고정한 검토 정책
판본과 모든 증거 bytes를 확인한다. 기록일은 원문 발행일이나 정확한 요청 시각이 아니다.
배치 응답은 해당 URL의 구간으로 읽는다. 원문에 없는 HTTP코드·재시도 허용을 추론하지 않는다.
이는 주어진 이력과 이번 run의 추가 실패 범위이며 전역 이력의 완전목록이 아니다. 다른 과거
제한을 알고 있으면 원 규칙을 우선하고 요청을 HOLD한 뒤 그 정확 대상·증거를 검토된 이력에
반영한다. 원장 대조 통과만으로 접근이 허용되는 것은 아니다. 정책과 증거는 실행 환경의
private 목적지에 실제 수신하고 bytes·hash를 확인한다. 다른 환경의 경로는 가용 파일이 아니다.

- 명시적403/거부, 요청 금지, 인증 요구, 도구의 안전상 거절은 해당 자료 HOLD다. 다른 host/path,
  미러·프록시·새 로그인으로 같은 자료의 제한을 피하지 않는다. 재시도 근거로 해제하지 않는다.
- 404, 일반 전송 실패, `not accessible via this tool`, 검색 무결과, 본문 미완은 각각 별도 상태다.
  이것만으로 접근 거부나 회사/host 전체의 영구 금지를 만들지 않는다. 정확 대상·사유·유효기간·
  1회 budget이 있는 원 규칙/사용자 지시의 재시도 근거를 결속해야 해당 실패 URL을 요청할 수 있다.
  과거 `NOT_RETRIED`는 과거 행위를 설명하며 새 영구 금지나 새 허용을 만들지 않는다.
- 거부 대상과 같은 회사/host 또는 연관 대상을 고를 때 관계를 숨기지 않는다. 정상 공개된
  **별도 원문**은 저장된 목록/링크의 URL·제목·발행주체·문서 신원과 독립성을 확인하면 허용할 수
  있다. 같은 발행자의 별도 문서라도 원문 신원과 독립성을 검토한다. 같은 자료를 다른 경로로 전송하는
  것은 별도 원문이 아니다. 의미·의도·원문 독립성의 진실성은 actor와 독립 검토자의 책임이다.

먼저 private request plan에 `schema_version:1`, context rawSHA, `researcher_id`,
`planned_at_utc`, `requests`를 쓴다. 각 요청은 고유 `request_id`, operation, 정확 URL 또는
검색 query, subject/resource 신원, purpose, `bypass_intent:false`, `related_history_urls`를
담는다. click은 실제 `link_ref/link_id`와 저장한 링크 증거가 필요하다. 별도 원문은 discovery에
artifact(file/SHA), 정확 target URL·title·publisher·document_id·기록시점,
`distinct_from_denied_resource:true`, `not_alternate_delivery:true`를 결속한다.
click의 저장 artifact는 `verified_links:[{link_ref,link_id,target_url,title,publisher}]` 대응표를
포함해야 한다. 이 대응표의 원문 해석은 실제 검토가 필요하다. 이번 최소 구현의 open/find/screenshot은
정확 URL만 허용하며, 해석되지 않은 다른 `source_ref`는 중단한다. 정상 원문을 찾는 검색은
별도 자료의 존재/접근 허용과 구분해 허용할 수 있다. 금지 자료의 대체 전송을 찾으려는 요청은 HOLD다.
원문의 의미가 맞지 않거나 미확인이면 HOLD한다. 새 실패 후에는 같은 대상/관계 요청을 중단하고
정확 capture·시각·분류를 `prior_failures`에 넣어 새 handoff를 만든다. 새 실패가 기존 원장
밖에 있어도 검수에서 이전 실패와 다음 요청을 대조한다. 서로 무관한 정상 원문은 허용할 수 있다.

```sh
python tools/build_reader.py --mode A --run-context <frozen-context> --access-history <private-policy> --request-plan <private-request-plan> --prepare-research-handoff <new-private-handoff>
```

이 명령은 네트워크 요청이나 조사 승인을 발행하지 않는다. HOLD를 포함한 결정을 반환한다.
실제 요청을 할 조사자는 각 handoff의 SHA·정책 SHA·자신의 ID·동의시각을 요청 전에 ack한다.
허용 결정만 범위/budget 안에서 요청하고, HOLD는 skipped로 기록한다. 요청의 추가·링크/대상 변경은
새 handoff가 필요하다. 요청 결과를 빼먹거나 사후 handoff를 만들어 이전 요청을 승인하지 않는다.

private access audit은 context SHA, `complete_request_inventory:true`, `unlisted_requests:0`,
`actor_limits_acknowledged:true`, sessions를 담는다. 각 session은 handoff(file/SHA), ack,
모든 request_id의 outcomes를 담는다. 실행한 요청에는 실제 요청 identity·시각·invocation_id·원본 capture(file/SHA)·
result_class를, 실행하지 않은 요청에는 `attempted:false`를 기록한다. 원문에 명시된 실패 분류와
다르게 성공을 신고하거나 같은 URL의 재시도 budget을 넘으면 검수에서 중단한다.
capture의 실제 도구 arguments 전부가 해당 invocation의 outcomes와1:1로 대응해야 한다.
정상 항목 하나만 신고하고 같은 배치의 금지 요청을 빼면 중단한다. 병렬 sessions의 배열 순서와
무관하게 invocation 시각순으로 검사하며 같은 배치의 결과는 그 배치 이후 요청에 적용한다.

기존 `--prepare-reader`(이번 UPDATE/context 사용), `--review-plan`, 최종 `--reviews/--update-review`
호출은 `--access-history <same-policy> --access-audit <same-audit> --run-context <same-context>`를
요구한다. 누락·판본 불일치·ack 전 요청·HOLD 요청·실제 대상 불일치·실패 후 부적격 요청은
기존 활성 pair 교체 전에 중단한다. 검토 계획의 UPDATE binding은 policy/audit/조사자 집합 SHA를
포함한다. 독립 검토는 추가 checkpoint `pre_request_access_history_and_actor_limits`에서 사유·
범위·실제 요청 순서·남은 HOLD를 확인한다. 이전 영수증은 새 binding에 재사용할 수 없다.

현재 access audit의 기계 검사는 지원 web capture 형식에 한정된다. Drive/Library의 실제
요청·공식 수신 경로·거부 후 중단은 별도 private actor 증거를 실제 독립 검토자가 확인한다.
이 검토를 web capture 형식으로 꾸미거나 native 도구 강제 통제 성공으로 보고하지 않는다.
지원 web 계획/요청이 전혀 없던 connector-only 회차는 가짜 web 대상을 만들지 않는다.
명시 `sessions:[]`, `web_request_inventory_count:0`,
`supported_capture_scope:NO_SUPPORTED_WEB_REQUESTS`, `policy_ack`의 정책 SHA·조사자 ID·시각·
`acknowledged_before_connector_requests:true`, `connector_actor_evidence:{file,sha256}`를 요구한다.
이 예외는 connector 증거 SHA와 접근 checkpoint에 묶이며 실제 요청 전 준수·빈 web 선언의
진실성은 독립 검토 대상이다. 일반 web 회차의 handoff·ack·요청 검사는 그대로 적용한다.

해시와 actor가 입력한 시각/identity/완전성 표시는 인증이나 도구 전체의 로그가 아니다. 누락·허위
신고, 경로 밖 직접 요청, 숨긴 동일 자료 미러, 다른 actor/환경의 요청은 이 코드만으로 예방/증명할 수
없다. 실제 조사자는 외부 도구 호출 전에 handoff를 소비해야 한다. 자동/native 실제 실행에서의
준수는 아직 검증하지 않았다. 이 단계는 공개 쓰기·예약 변경·권한 변경을 포함하지 않는다.

### MODE B의 발견·정확 bytes·판본 계약

주간 또는 `--mode B`의 초안/계획/활성 호출에는 private `--mode-b-evidence <receipt>`를 추가한다.
이 sidecar는 네트워크 실행기가 아니다. `schema_version:1`, frozen context rawSHA,
`observed_from_utc`, `observed_to_utc`, `receipt_time_is_business_cutoff:false`를 기록한다.
수신/읽기 시각은 사업 cutoff나 원 DD 발행일을 갱신하지 않는다.

- `discovery.folder_listings`는 기존 ID를 조회 키로 쓰지 않은 공식 폴더 목록 capture(file/SHA)와
  `include_for_DD`를 담는다. 현재 지원 capture의 arguments는 정확 `url,top_k`이고 상한은1000이다.
  실제 반환 rows와 제공된 pagination 정보만 사용한다. 상한 도달·미확인 다음 페이지는
  `LIST_LIMIT_OR_COMPLETENESS_UNCERTAIN`, 제외 폴더/JSON은 사유와 `EXCLUDED_SCOPE`,
  capture 유실/불확실성은 `CAPTURE_UNCERTAINTY`로 남긴다. 반환하지 않은 cursor를 만들지 않는다.
  `independent_of_known_ids:true`, `global_completeness:false`와 `BOUNDED_DISCOVERY_SCOPE`는
  제한된 발견 범위임을 명시하며 전역 완전성 PASS를 금한다.
- `baseline:{file,sha256}`의 `files:[{drive_id,sha256,bytes}]`와 실제 발견 JSON ID 집합을 대조한다.
  `id_comparison`에 `new_ids`, `not_discovered_ids`, `common_ids`를 정확히 기록한다.
  제외 JSON은 `excluded_json:[{id,reason}]`으로 분리한다. 발견되지 않은 기존 ID는
  `BASELINE_NOT_DISCOVERED`이며 삭제·신규0 확정의 근거가 아니다.
- `files`는 발견 후 제외하지 않은 ID와 정확히 일치해야 한다. 공식 수신의 원 `file_uri`로 얻은
  실제 파일을 `current:{file,sha256,bytes}`로 결속하고 원문·신원·스키마를 검토한다. URL 추정이나
  host 치환은 하지 않는다. metadata 동일만으로 bytes 동일을 확정하지 않는다. 실제 hash/크기
  대조로 `SAME_BYTES|NEW|CHANGED|UNAVAILABLE`을 구분한다. SAME_BYTES는
  `new_original_read:false`, `new_business_evidence:false`다. NEW/CHANGED의 `content_review`가
  REVIEWED가 아니면 `CONTENT_REVIEW_PENDING`, 파일 미수신은 `CONTENT_UNAVAILABLE`이다.
  REVIEWED 문자열만으로 원 DD 통관·내용 진실성이 입증되지는 않는다.
- `library_original_version`은 namespace `LIBRARY_ORIGINAL_VERSION`, status
  `UNKNOWN|HISTORICAL_ONLY|VERIFIED_ORIGINAL`, `derived_from_drive_revision:false`를 담는다.
  VERIFIED_ORIGINAL에는 별도 원본 판본 증거(file/SHA)가 필요하다. 나머지는
  `LIBRARY_ORIGINAL_VERSION_UNVERIFIED`다. `drive_revision`은 namespace `DRIVE_REVISION`과
  before/after를 별도로 담는다. 현재 지원 수신은 `revision_bound_bytes_proved:false`와
  `DRIVE_REVISION_NOT_ATOMIC`이다. before/after 미상·변경은 `DRIVE_REVISION_UNKNOWN_OR_CHANGED`다.
  안정된 revision/metadata도 atomic revision-bound bytes 증명이나 Library 최신 원본 판본이 아니다.

`holds`는 해당 위 코드를 빠짐없이 보존한다. `actor_request_evidence:{file,sha256}`에는 실제
공식 listing·수신·원문 검토·접근 정책 소비·실패/미시도 증거를 연결한다. private IDs, 원문,
계정, 수신 URL, 로컬 경로와 회차별 수치는 공개 문서/PACK에 복사하지 않는다. UPDATE binding에는
sidecar와 actor 증거의 digest만 추가하고 독립 검토 checkpoint
`mode_b_independent_discovery_exact_bytes_and_holds`로 실제 발견 범위·정확 bytes·내용·판본·HOLD를
검토한다. 기존 통관·증권 신원·산업 귀속·전파·원 DD 날짜/밴드 규칙은 그대로 적용한다.

### 고정 입력과 진행 기록

주간 실행자는 시작 시 private `RUN_CONTEXT.json`을 동결한다. 필드는
`schema_version:1`, `kind:weekly|manual`, `run_key`, `base_main`(40자리 commit),
`base_active_pack_raw_sha256`, `rules_sha256`(원6종), `business_cutoff_utc`,
`base_universe:{companies:[ticker...],industries:[id...]}`, `role_keys:{역할:key}`다.
필요하면 별도 `observation_cutoff_utc`와 `price_only:true`를 명시한다.
canonical main과 unpublished active 후보의 계보를 구분한다. 후발 source/독해/사업 closure/
DD admission은 별도 불변 artifact에 보존하고 원 diff·실제 독립 evidence와 결속한다.
`RUN_EVENTS.jsonl`에는 순번·이전eventSHA·contextSHA·실제 stage/result/artifactSHA/시각을
추가한다. 최종PACK rawSHA·commit·배포·전달 결과는 context를 바꾸지 않고 events에만 쓴다.
이 파일들은 기존 private run 디렉터리의 기록이며 자동 실행 서비스가 아니다.

주간 제안의 새/변경 `weekly_*` 레코드, `meta.run_kind:weekly` 또는
`monthly_diff.current_update_refs`는 `--run-context`를 요구한다. 새/변경 weekly 레코드는
current refs도 요구한다. context 호출은 `--mode`와 `--diff`가 필수다.
같은 core의 명시 replay도 context/diff/rules/evidence 판본을 대조한다.
정확한 옛 pair/no-op와 비주간 수동 UPDATE의 기존 인자는 호환된다.

### 역할별 현재 참조

`monthly_diff.current_update_refs`는 `schema_version:1`과 정확히 다음5역할을 담는다:
`business`, `judgment`, `primary_extension`, `gap_completion`, `coverage`.
각 값은 `{status,record_key}`다. status는 `REVIEWED_SCOPED|DATED_RETAINED|NOT_RUN|HOLD`,
record_key는 동일 monthly_diff의 정확한 key 또는 null이다.
새 record는 `update_role`에 해당 역할을 명시한다. 정확한 옛 역할 key는 dated fallback을
유지한다. NOT_RUN의 key는 null이며 null은 NOT_RUN/HOLD에서만 허용된다.
없는key·잘못된역할·current refs 자기참조는 `INVALID_CURRENT_UPDATE_REF`다.
삽입순서·최대날짜로 선택하지 않는다. Drive 수신/coverage가 business cutoff를 대체하지 않는다.
Python/JS는 이 같은 선택 계약을 구현하고 private 공유 fixture로 동등성을 확인한다.

### 변경 근거와 원 규칙 검사

후발 기계 검증 근거는 선택적 private `--change-evidence <JSON>`으로 전달할 수 있다.
이 artifact의 실제 rawSHA와 context rawSHA는 UPDATE target에만 결속된다. private 경로/원문은
public pair에 복사하지 않는다. 이는 reviewer 신원·출처 진실성·경제 판단의 인증 수단이 아니다.
실제 독립 검토는 정규화 core·reader·diff·원6규칙·context/evidence의 정확한 판본을 읽어야 한다.

`dd_admissions[ticker]`는 previous/proposed DD SHA, same_issuer, 원 source_version/source_sha256,
original_rules_reviewed를 기록한다. 밴드 없음 자체로 통관을 막지 않으며 UNKNOWN은 적법하다.
`state_reviews[industry]`는 실제 변경 필드의 previous/proposed SHA, counterevidence, propagation
기록을 갖는다. tier 전이에만 독립 사건2개+actual/independently_verified·D/S/P종류·독립성 검토·
tier_history를 요구한다. balance/cycle 변경이나 유지에 새2신호를 강요하지 않는다.
`security_mappings[ticker]`는 이전/제안 listing·currency·unit, same_security와 public source를
담는다. 코드가 실제 source identity를 스스로 입증하지 않으므로 원문/실제 검토가 필수다.

새 ghost/duplicate edge·신규 membership mismatch·잘못된 candidate·원DD 무근거변경·
cutoff뒤 새 실제 발행/관측은 거절한다. forecast target/horizon의 미래는 허용한다.
기존 정확68 membership 예외는 보존한다. 원DD bands는 새 원본 통관 없이 변경하지 않는다.
가격만 바꿀 때 경제본문/산업/관계/후보 projection은 동일해야 한다. quote까지 포함하는 기존
reader binding은 별개이며 그 보수적 재검토를 약화하지 않는다. 미확인FX/ratio는 UNKNOWN이다.

### 실행 예

아래 경로는 각 회차에서 실제 만든 private 파일을 뜻하며 예시 자체는 receipt가 아니다.
주간이 아닌 MODE A는 `--mode-b-evidence`만 생략할 수 있다. MODE B는 `--mode B`로 바꾼다.

```sh
python tools/build_reader.py --mode A --pack <proposal> --reader <draft> --diff <diff> --run-context <frozen-context> --access-history <private-policy> --access-audit <private-audit> --mode-b-evidence <private-mode-b-receipt> --change-evidence <frozen-domain-evidence> --review-plan <new-plan>
python tools/build_reader.py --mode A --pack <same-proposal> --reader <same-draft> --diff <same-diff> --run-context <same-context> --access-history <same-policy> --access-audit <same-audit> --mode-b-evidence <same-mode-b-receipt> --change-evidence <same-evidence> --reviews <actual-record-reviews> --update-review <actual-UPDATE-review>
```

모든 입력은 build 중 다시 bytes 대조한다. 같은 active 경로의 stable sibling advisory lock을
active 읽기 전부터 검증·최종replace까지 잡는다. 다른 run도 같은 lock이다. BUSY이면 진행하지
않고 현재 기록을 확인한다. lock을 unlink/강제steal하지 않는다. lock/tmp/private state는 공개
패키지 allowlist에서 제외한다. 로컬 lock은 다른 환경을 직렬화하지 않으며 원격 CAS·분산
exactly-once 보장을 대신하지 않는다. 실제 예약의 새 계약 소비와 원격 게시/Library 전송은
별도 실제 실행 증거가 있어야 확인된다.
