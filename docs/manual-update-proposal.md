# 수동 UPDATE 연결안 — LOCAL DRAFT, 원격/Knowledge 미적용

이 문서는 이전 manual-path 단계의 역사적 제안이다. 2026-10-18 로컬 후보에서는
SOP/03/README에 연결 절차를 적용했다. 현재 로컬 절차는 해당 문서와
`docs/weekly-operating-contract.md`를 따른다. 아래 ‘6종 그대로 보존’은 이전 단계의
기록이며, 현재 원격 Knowledge·예약·게시까지 적용되었다는 뜻은 아니다.

원 00/01/02/03/SOP/USAGE 6종은 그대로 보존했다. 아래는 SOP §3, 03 부록,
README 월간 갱신 절차에 함께 반영할 로컬 변경안이다. 실제 Knowledge 동기화·배포는
이번 작업에 포함하지 않는다. 기존의 수동 파일 교체를 우회하는 원격 경로도 만들지 않는다.

## 유지하는 원공정

사용자는 최신 활성 PACK을 첨부하고 ‘아틀라스 업데이트’ 또는 ‘딥다이브 통합’을 요청한다.
원 UPDATE 진입 게이트에서 실물·직전 부채를 확인한다. MODE A는 전면 스캔, MODE B는
첨부 DD 전량 통관과 산업 되먹임 및 하지 않은 전면 스캔 부채를 기록한다. 경제적 티어·후보·
전파는 원 기준의 실제 근거와 반대근거로 사람이/대화 검토자가 판단한다. 티어 판단 뒤에
관측 가격·UNKNOWN·원 DD 밴드의 고정 소유권을 확인한다. 코드는 이 조사를 실행하지 않는다.

새 PACK과 UPDATE diff를 수령하고 최종 파일 한 개를 `data/ATLAS_PACK.json`에 반영하는
사용자 동작은 유지한다. 추가되는 단계는 **최종 교체 전**의 별도 제안 파일 준비와 실제
UPDATE/reader 독립 검토 및 검증 호출이다. 검증 전 제안 파일로 활성 경로를 덮어쓰지 않는다.

## SOP §3 / 03 부록 / README에 공통으로 넣을 대체 절차

1. 활성 PACK을 읽고 새 연구 제안 PACK·원 UPDATE diff를 활성 경로 밖의 비공개 작업 위치에 둔다.
   DD가 있으면 원래 §7A/7B와 원문 아카이브 규율을 그대로 수행한다. 신규 생산 경로는 만들지 않는다.
2. 기존 `tools/build_reader.py --pack <제안> --prepare-reader <새초안reader>`로 날짜 있는
   활성 내용을 미검토 초안으로 복사한다. 관련 요약·번역·시점·한계를 실제 제안과 대조한다.
3. `python tools/build_reader.py --mode A --pack <제안> --reader <제안reader> --diff <원UPDATEdiff> --review-plan <새계획>`.
   딥다이브 통합은 `--mode B`. 이 호출은 승인하지 않으며 활성 PACK을 바꾸지 않는다.
4. 실제 독립 검토자가 제안/정규화 후 변경과 diff·원 지침·원자료·반대근거를 검토한다.
   전체 UPDATE 판본 검토와 변경된 reader record별 검토 기록을 실제 근거 파일에 묶어 작성한다.
   작성자/빌더가 영수증을 자체 발급하지 않는다. 미확인 경제 판단은 HOLD로 남기며 원 기준을
   통과하지 못한 변경은 활성화하지 않는다. 합성 QA의 TEST_ONLY 기록은 실제 연구에 재사용하지 않는다.
5. `python tools/build_reader.py --mode A --pack <같은제안> --reader <같은reader> --diff <같은diff> --reviews <record검토> --update-review <UPDATE독립검토>`.
   정확한 판본과 실제 근거 digest가 맞아야 한 파일 교체가 일어난다. 검토 실패·오래된 reader·
   입력 변경이면 기존 활성 PACK을 보존한다. 가격 누락은 UNKNOWN/null로 정규화한 결과를 검토한다.
6. 로컬 검증 후 소비 화면이 읽는 것은 기존 경로의 PACK 한 개다. 같은 입력의 반복은 새 승인이나
   이력을 중복하지 않는다. 교체 전 중단은 옛 pair, 교체 후 중단은 이미 활성화된 새 pair로 재개한다.
7. 원격 커밋·Pages·Knowledge·예약 연결은 별도 단계이며 현재 보류다. 향후 승인된 수동 업로드에도
   **최종 검증 PACK**만 사용한다. 이 후보를 최초 도입하려면 변경된 빌더 코드와 FIX3 소비 코드가
   함께 있어야 한다. 기존 5G 코드에 PACK만 넣는 호환성을 주장하지 않는다.

## 검토 보장 범위

계획/해시/필수 checkpoint는 판본 누락을 막는 검사이며 출처 진실성·기간 비교·정성 티어 판단을
대신하지 않는다. 검토자 문자열과 evidence SHA는 신원을 인증하지 않는다. 인증 인프라·새 보안
기능·범용 실행기·예약을 추가하지 않았다. 전량 현재 운영 검증과 무인 주간 조사는 계속 미완료다.

원본 5G·FIX3 동결본 및 과거 게시 거절 기록은 보존한다. 로컬 검토용 결과와 실제 원 연구,
게시·예약 운영 증거를 구분한다. `automatic_weekly_integration_complete=false`를 유지한다.


## 회차/변경 입력 계약 추가

주간 context·역할별 current refs·private change-evidence·동일active writer잠금의 정확한
형식과 명령은 `weekly-operating-contract.md`의 P01–P06 계약을 따른다. 새/변경 주간
레코드는 context와 refs 없이 활성화하지 않는다. 정확한 legacy와 dated reader는 유지한다.
실제 독립 검토를 생략하거나 TEST_ONLY fixture를 연구에 재사용하지 않는다.
