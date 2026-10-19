# Atlas 읽기 자료 계약

읽기 계층은 `data/ATLAS_PACK.json`의 판단·증권·가격·DD 계약을 수정하지 않는다.
`ATLAS_READER_ADAPTER.js`가 저장 형식의 차이를 정규화하고, 네 화면이 같은
`ATLAS_READING.js`를 사용한다. 티커별 조건 분기는 두지 않는다.

## 입력과 우선순위

| 입력 | 읽기 요소 | 보존 경계 |
|---|---|---|
| `deep_dive_ref` | 날짜가 붙은 원 논제·해자·KPI·평가 | 당시 기준이며 현재 실적·가격이 아님 |
| `company_signal_review` | 사실·범위·한계·다음 질문·개별 KPI 관찰 | 111 신호 조사와 55 서술 교체/56 이력·후속 구분 |
| `weekly_business_review` | 실제 서술 문단·HOLD·발행일·읽은 깊이 | 68의 changed/stale/unavailable/follow-up을 유지 |
| `reused_business_coverage` | 재사용 사실·남은 조건 | 52는 회사 전체 무변화·전면 검증이 아님 |
| `supplemental_research[]` | 날짜별 과학·투자·거래 보완 | 역사적 미확인과 나중 완료를 분리, DD 재설정 없음 |
| `business_relationship_observations[]` | 관측 단계·전달 보류·사건 계보 | 자동 새 엣지·수혜·상태 전파 없음 |
| 산업 카드·원장 | 산업별 역할과 진입 맥락 | 법적 실체·복수 산업·카드 누락 이력을 유지 |
| `triggers_watchlist` | 산업별 실제 다음 감시 조건 | 56산업/219조건, 다른 이름 `triggers`도 호환 |

다음 확인은 문자열, 객체의 question/focus/reason, 배열을 받는다. KPI 제목은
original_kpi/original_tripwire_verbatim/original_tripwire/unchanged_dd_tripwire를
받고 observation_note와 assessment를 함께 보존한다. 임계값은 새로 계산하지 않는다.
주간 문단의 Markdown 링크는 출처와 분리해 읽고 원래 상세 문단도 보존한다.
구조화된 후보 trigger는 모든 키·값·날짜와 후보 상태를 표시한다. 긴 원문은
추가 근거로 접고 같은 긴 문단의 섹션 간 중복을 피하되 내용을 버리지 않는다.
회사 역할에 산업 전체의 정의를 붙이지 않는다. 별도 66개 역할 표현은 원 회사
카드·수신 연구의 사업 범위와 원 레코드 해시에 연결하며 신규 검증으로 세지 않는다.

## 별도 읽기 자료

`data/ATLAS_READER.json`은 공개 가능한 한국어 요약·번역·공개 URL만 포함한다.
235 회사의 보완 기록은 받은 연구·감사 내용을 재사용한 것으로, 이번 통합에서
공개 원문 235개를 새로 재열람하거나 전면 운영 검증한 기록이 아니다.
각 기록은 원 연구 문서 해시, 날짜, 한계, 공개 출처를 갖는다. 사적 원문·계정·경로는
이 파일에 넣지 않는다. 전체 원 연구와 작성·독립 검수는 별도 비공개 QA에 보존한다.

번역은 정확한 원문 문자열에 대응한다. 새 주간 문구에 옛 번역을 자동 적용하지 않는다.
수정된 PACK에는 읽기 자료를 다시 대조해야 한다. 아래 갱신 명령은 원래 빌더 경로를
사용하지만, 이제 PACK과 별도 JS를 차례로 덮어쓰지 않는다. 활성 파일은 여전히
`data/ATLAS_PACK.json` 하나이며 선택 필드 `_reader_pair`에 검증된 읽기 자료를 함께 담는다.
네 화면은 같은 파일에서 읽은 쌍을 소비한다. 별도 `ATLAS_READER_DATA.js`는 정확한
이전 5G의 호환 경로에만 쓰며, `_reader_pair`가 손상되면 옛 JS로 우회하지 않는다.
판본 지문은 키·문자열·숫자·불리언·null의 갱신 누락 감지용이며 보안 인증이 아니다.

원 자료를 고쳤다면 먼저 원래 MODE A/B·UPDATE 검토와 DD 계약 검증을 수행한 뒤,
해당 읽기 기록의 내용·시점·번역을 검토하고 PACK 해시를 갱신하여 재생성한다.
읽기 빌드는 산업 재판정·DD 승인·가격 밴드 변경을 대신하지 않는다.

## 변경 검토와 단일 파일 활성화

활성 PACK을 먼저 덮어쓰지 않는다. 제안 PACK과 reader는 활성 경로 밖에서 준비한다.

```
python tools/build_reader.py --pack <제안PACK> --prepare-reader <새초안reader.json>
python tools/build_reader.py --mode A --pack <제안PACK> --reader <검토할reader> --diff <UPDATEdiff.md> --review-plan <새계획.json>
python tools/build_reader.py --mode A --pack <같은제안PACK> --reader <같은reader> --diff <같은UPDATEdiff.md> --reviews <record검토.json> --update-review <UPDATE독립검토.json>
```

첫 명령은 검증된 활성 reader의 날짜 있는 내용을 그대로 복사하고 제안 content 해시만 연결한
**미검토 초안**이다. 초안 생성이 내용 갱신·승인은 아니다. 이미 존재하는 파일은 덮어쓰지 않는다.
둘째 명령은 필요한 record_id와 변경 전후 input/summary SHA256 및 전체 UPDATE 검토 판본을
반환한다. 승인이나 검토 완료를 만들지 않으며 활성 파일을 바꾸지 않는다. 마지막 명령은 필요한 모든 검토 기록과
근거 파일의 실제 SHA256을 대조하고, 완성된 PACK+reader 쌍을 임시 파일에 기록·검산한 뒤
`os.replace` 한 번으로 활성 파일을 교체한다. 입력·검토·임시 기록 실패는 기존 쌍을 남긴다.
빌드 중 활성 파일이 바뀌면 거절한다. 다른 도구가 활성 PACK을 먼저 덮어쓰는 경로는 보호하지
못하므로 사용하지 않는다. 동시 비협조적 파일 작성자에 대한 분산 잠금·운영 배포 기능은 아니다.

`--mode A/B`는 원래 UPDATE 전면 스캔/딥다이브 통합의 범위를 기록하며 판단을 실행하지 않는다.
전체 PACK 본문이 바뀌면 reader binding 밖의 themes·edges·회사·meta·monthly_diff 변경도
실제 독립 UPDATE 검토를 요구한다. 판본은 이전 core SHA, 제출 core SHA, 가격 정규화 후 core
SHA, 제안 reader SHA, 실제 UPDATE diff SHA, 원 지침 6종 SHA에 묶는다. 독립 검토자가
원래 기준·반대근거·기간·티어의 실제 독립 신호 2개·전파/부채·DD 통관·밴드 소유권·가격 방화벽·
스키마/관계·내용 시점·비공개 정보·잔여 HOLD를 실제 확인한 근거 파일과 판본별 검토 기록을 준다.
필수 checkpoint 문자열 검사는 그 경제 판단의 진실성을 자동 입증하지 않는다. `SCOPED_HOLD`는
미확인 범위를 기록하는 값이며 원 규칙을 완화해도 된다는 허가가 아니다.

UPDATE 검토 JSON은 schema_version=1, 계획의 update_binding 전체, independent_reviewer 역할,
review_id, reviewed_at_utc, decision=ACCEPT_WITH_SCOPED_HOLDS, reason, 계획의 9 checkpoint별
status(REVIEWED/SCOPED_HOLD/NOT_APPLICABLE)와 실제 설명, evidence_file/evidence_sha256,
current_operations_verified=false, automatic_weekly_integration_complete=false를 가진다.
빌더는 이 문서를 발급·승인하지 않는다. 외부 검토자의 신원 확인은 실제 세션 절차의 책임이다.
활성 PACK에는 경로·checkpoint 설명·근거 원문 대신 판본/근거 digest와 검토 metadata만 보존한다.

성공한 입력의 재실행은 이미 활성화된 같은 판본이면 새 경제 승인을 만들지 않는다. 변경된
제안·diff·규칙은 다시 검토해야 한다. 교체 전 중단은 기존 활성 파일로, 교체 후 중단은 이미
검증된 새 pair로 재개한다. 명시적으로 제출한 오래된 reader는 기존 해시 gate에서 거절된다.
`--reader` 생략 시에는 검증된 현재 reader를 쓰므로 옛 authoring JSON이 기본값으로 돌아오지 않는다.

해시 방식 `atlas-pack-core-json-v1`은 **최상위 `_reader_pair`만 제외한 PACK**을 UTF-8,
키 정렬, compact JSON, finite 숫자로 직렬화한 SHA256이다. 제안 reader의 `pack_sha256`은
제안 PACK의 이 content hash와 맞아야 한다. 최종 활성 파일의 raw bytes SHA256과 다르다.
부적격 호가 정규화 뒤의 최종 input digest가 검토 대상이며, 계획 이후 입력이 바뀌면 기록이
맞지 않아 거절된다. 빌더는 최종 content hash와 최종 파일 raw SHA256을 따로 출력한다.

editorial·66 역할·235 연구의 입력 해시는 해당 회사 전체, 소속 산업 전체와 관련 후보·판단
필드에 보수적으로 묶는다. 산업 editorial은 해당 산업과 관련 판단에 묶는다. 호가를 인용하는
문구의 누락을 피하기 위해 회사 호가 변경도 포함한다. 83 번역은 정확한 원문 key와 번역 값에
묶이며 reader 날짜·범위 메타데이터도 별도 검사한다. 수정·추가·삭제는 모두 검토 대상이다.
가격만 바뀐 자료를 `RETAIN_DATED`로 이월해도 회사 사업 확인일을 앞으로 옮기지 않는다.
원 5G/FIX3 기준 editorial은 19개이며, 2026-10-18 부분 리허설 제안은 MP·ODFL을 추가한
21개다. 이는 전체 회사의 현재성 검증 건수가 아니며 실제 개수는 해당 판본의 자료에서 센다.

검토 기록 배열의 각 행은 계획의 다섯 digest 필드와 record_id, review_id, reviewer_role,
reviewed_at_utc, decision(REVISED/RETAIN_DATED/REMOVE), reason, evidence_file,
evidence_sha256, current_operations_verified=false를 갖는다. 검토자는 독립 또는 지정
검토자의 실제 역할이며, evidence_file은 실제 검토 문서다. **검토자 문자열과 해시 형식만으로
검토 내용의 진실성·사람의 신원을 인증하지 않는다.** 실제 검토자는 세션의 독립 검토 절차에서
확인해야 한다. 빌더는 기록을 발급하거나 `approved`를 만들지 않는다.
공개 쌍에는 근거의 경로·본문·계정을 넣지 않고 receipt ID·역할·시각·결정·digest만 남긴다.

첫 이행은 고정된 원 5G PACK/reader bytes 해시 쌍에만 허용한다. 그 기록은
`RETAINED_5G_BASELINE_UNVERIFIED`이며 새 독립 원문 검토·현재 운영 승인으로 세지 않는다.
다음 갱신부터 검증 기준은 제안 파일이 아니라 기존 활성 쌍의 record bindings다.

## 호가 실패와 과거 관측

현재 quote의 값·관측일·공개 출처·통화·증권 단위가 누락/부적격이면 현재 zone=UNKNOWN,
현재 gap=null, comparison_basis=null, 강조 억제로 정규화한다. 원 입력의 실패 흔적은 남긴다.
직전 활성 쌍의 정상 quote와 당시 zone/gap/판단은 `stance_state.price_observation_history`에
날짜·출처와 함께 보존하고, 화면에서는 ‘과거 정상 호가·당시 판단’ 접기로 구분한다.
기존 이력은 다음 정상 quote가 와도 보존하며 같은 실패의 재실행으로 중복하지 않는다.
화면 formatter도 이 경로 밖에서 받은 부적격 quote를 현재 UNKNOWN으로 억제한다.
정상 quote의 저장 zone을 다시 계산하지 않고, 원 DD·ladder·src·strict 경계·공백·중첩의
해석을 변경하지 않는다. 가격 관측일과 회사 사업 확인일은 계속 별개다.

## 운영 통합 상태

이 경로는 로컬 갱신·소비 경계까지 연결한 수정 후보다. 실제 예약/주간 운영이 이 명령을
호출하고 검토자를 연결한다는 증거는 없다. 따라서 `_reader_pair`의
`automatic_weekly_integration_complete=false`를 유지한다. 원래 MODE A/B 판단,
실제 원문·반대근거 조사, DD 계약·품질 게이트, 운영 배포·복구 검증을 대신하지 않는다.
수동 경로의 정확한 호출과 SOP/03/README 변경안은 `docs/manual-update-proposal.md`에 있다.
이 로컬 후보의 기존 진입점에 연결한 것이며 원격 SOP·Knowledge·예약 동기화는 하지 않았다.

## 표현과 검수

HEAT는 원 규칙의 수급 균형 이탈·트리거 작동 확인에 따른 ‘우선 조사’이며
투기적 과열이나 매수 신호가 아니다. Graph는 설명 선택 중 자동 힘 배치를 멈추되
수동 이동과 닫기 후 탐색을 유지한다. 상세 접기 안 본문은 14px 이상이다.

전량 기계 계약은 표시·내용 접근·변이 방지를 검증한다. 355 회사의 인간 독해나
사업 현재성 검증으로 확대하지 않는다. 무작위·계층 독립 표본의 실제 읽기와
데스크톱·모바일 조작·픽셀 증거를 별도로 기록한다.


## 회차/변경 입력 계약 추가

주간 context·역할별 current refs·private change-evidence·동일active writer잠금의 정확한
형식과 명령은 `weekly-operating-contract.md`의 P01–P06 계약을 따른다. 새/변경 주간
레코드는 context와 refs 없이 활성화하지 않는다. 정확한 legacy와 dated reader는 유지한다.
실제 독립 검토를 생략하거나 TEST_ONLY fixture를 연구에 재사용하지 않는다.
