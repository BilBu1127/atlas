# 딥다이브 보고서 아카이브

딥다이브 엔진이 산출한 `REPORT_DATA_PACK.json`을 여기 보관한다.

- 파일명 규칙: `REPORT_<티커>_<YYYY-MM>.json`  (예: REPORT_EL_2026-09.json)
- 이 폴더는 **보관·버전관리용**이다. 화면은 이 폴더를 직접 읽지 않는다.
- 지도 반영: 다음 `아틀라스 업데이트` 대화에 최신 `ATLAS_PACK.json`과 여기 보관된
  REPORT PACK(들)을 함께 첨부 → 병합된 새 ATLAS_PACK.json을 받아
  `data/ATLAS_PACK.json` 하나만 교체하면 콘솔·관계망에 ✓ 검증 노드가 뜬다.
- 분기 업데이트에서 스탠스가 바뀌면 새 날짜의 REPORT를 추가로 쌓는다(덮어쓰지 않음).
