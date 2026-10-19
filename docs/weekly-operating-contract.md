# 기존 수동 UPDATE와 주간 운영의 연결

원 00/01/02의 수급·사이클·변화율 판단과 03의 진입/통관/전파/부채/가격 순서를 유지한다.
기존 예약은 이 문서의 사람/대화 판단 경로를 호출하는 주체이며 코드는 조사·경제 판단을 대신하지 않는다.
실제 주간 판단의 진입은 예약 메시지/UPDATE 대화다. 로컬 PACK/reader의 검증·활성화 진입점은
기존 `tools/build_reader.py`다. 새 범용 runner, 모델 호출, 인증 기능은 없다.

1. **판본 확인:** 현재 canonical main·PACK·지침6종·직전 cutoff·기존 성공/실패 기록·중복 run key를 확인한다.
   로컬 private 후보를 이미 게시된 canonical 상태로 취급하지 않는다.
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

```sh
python tools/build_reader.py --mode A --pack <proposal> --reader <draft> --diff <diff> --run-context <frozen-context> --change-evidence <frozen-domain-evidence> --review-plan <new-plan>
python tools/build_reader.py --mode A --pack <same-proposal> --reader <same-draft> --diff <same-diff> --run-context <same-context> --change-evidence <same-evidence> --reviews <actual-record-reviews> --update-review <actual-UPDATE-review>
```

모든 입력은 build 중 다시 bytes 대조한다. 같은 active 경로의 stable sibling advisory lock을
active 읽기 전부터 검증·최종replace까지 잡는다. 다른 run도 같은 lock이다. BUSY이면 진행하지
않고 현재 기록을 확인한다. lock을 unlink/강제steal하지 않는다. lock/tmp/private state는 공개
패키지 allowlist에서 제외한다. 로컬 lock은 다른 환경을 직렬화하지 않으며 원격 CAS·분산
exactly-once 보장을 대신하지 않는다. P07 실제 예약과 P08 원격 게시/Library 전송은 미실행이다.
