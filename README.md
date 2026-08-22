# ATLAS · Global Sector Ontology

전 산업의 수요·공급 균형과 사이클 위치를 추적하는 살아있는 투자 리서치 지도.
데워지는 산업을 포착하고, 그 산업에서 지금 봐야 할 기업을 계층(대장·국면 주도주·고베타 유망주)으로
좁혀 하류 공정(스크리닝→딥다이브)으로 넘긴다.

> 티어·role은 **조사 우선순위**이며 매매 신호가 아니다. 기업은 미검증(SHALLOW) 후보 분류이며,
> 진위(해자·재무·경영진)는 딥다이브에서 검증한다.

---

## 구조 — 데이터 하나, 뷰 넷

```
atlas_site/
  index.html            ← 콘솔로 자동 이동
  ATLAS_CONSOLE.html    ← 메인. 섹터 브라우저 + 필터 + 드릴다운
  ATLAS_GRAPH.html      ← 관계망 탐색 (엣지 따라 꼬리 물기)
  ATLAS_MAP.html        ← 인쇄·공유용 히트맵 (보조)
  ATLAS_GUIDE.html      ← 사용 가이드
  data/
    ATLAS_PACK.json     ← ★ 지도의 원본 데이터 (유일한 원본)
```

**콘솔과 관계망은 열릴 때 `data/ATLAS_PACK.json`을 읽어 그 자리에서 화면을 만든다.**
그래서 매달 갱신할 때 **이 파일 하나만 교체**하면 두 메인 뷰가 동시에 새 데이터로 갱신된다.
(히트맵은 인쇄용 보조라 갱신 때 함께 재생성해 올리면 되고, 매달 꼭 갱신할 필요는 없다.)

---

## GitHub Pages로 올리기

아래 별도 안내(`GITHUB_안내`)를 따르면 된다. 요약:

1. GitHub에 새 저장소 생성
2. 이 폴더 전체를 업로드 (`index.html`, 4개 HTML, `data/` 폴더, `README.md`)
3. Settings → Pages → Source: `main` 브랜치 저장
4. `https://<아이디>.github.io/<저장소>/` 로 접속

정적 사이트라 서버·빌드가 필요 없다.

### 로컬에서 미리 볼 때
콘솔·관계망은 데이터를 `fetch` 로 읽으므로, `file://` 로 더블클릭하면 브라우저 보안 정책 때문에
데이터를 못 읽는다. 로컬 확인이 필요하면 폴더에서 아래를 실행하고 `localhost:8000` 으로 접속한다:
```bash
python3 -m http.server 8000
```
히트맵(`ATLAS_MAP.html`)과 가이드는 데이터를 안 읽으므로 `file://` 로도 바로 열린다.
어차피 GitHub Pages(https)에 올리면 전부 정상 작동한다.

---

## 월간 갱신 워크플로우

1. 최신 `ATLAS_PACK.json`을 첨부하고 `아틀라스 업데이트` 트리거
2. 변화 신호가 있는 산업만 심층 확인 → 새 `ATLAS_PACK.json` + diff 리포트 생성
3. 저장소의 **`data/ATLAS_PACK.json` 하나만** 새 파일로 교체
4. GitHub Pages가 자동 반영 → 콘솔·관계망이 새 데이터로 갱신

지도의 원본은 항상 `data/ATLAS_PACK.json`. 갱신은 직전 PACK 기반의 diff로만 이루어진다.

---

*Global Sector Atlas OS v1.3 · 온톨로지 레이어*
