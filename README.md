# 와일즈 호석 관리·세팅 검색

Windows PC에서 로컬로 사용하는 프로그램을 만드는 프로젝트입니다. 현재는 설계 문서와 보유 호석 화면 초안이 있습니다. 완성된 시뮬레이터가 아닙니다.

## Windows에서 이어가기
1. 전달받은 ZIP을 `C:\Projects` 등 원하는 위치에 압축 해제합니다. 숨김 폴더 `.agents`도 유지하세요.
2. 로컬 Codex에서 압축 해제된 `mhwilds` 폴더를 프로젝트로 엽니다.
3. 아래 내용을 새 대화에 붙여넣습니다.

> HANDOFF.md와 AGENTS.md를 읽고 이 프로젝트를 이어서 진행해줘. 지금까지 합의된 요구사항을 유지하고, 먼저 보유 호석 화면 초안을 실제 브라우저에서 검증한 다음 남은 구현을 진행해줘.

## 화면 초안 실행
`prototype/index.html`을 Edge 또는 Chrome으로 엽니다. 외부 서비스나 npm 설치는 필요하지 않습니다. 파일 실행에서 브라우저 저장이 제한되면 아래 HTTP 실행을 사용하세요.

Python이 설치된 PC에서는 프로젝트 폴더에서 다음을 실행할 수 있습니다.

```powershell
python -m http.server 8000 --bind 127.0.0.1 --directory prototype
```

브라우저에서 `http://localhost:8000`을 엽니다. 종료는 터미널에서 Ctrl+C입니다. 파일 실행과 HTTP 실행의 저장소는 서로 다를 수 있으므로 이동 전에 JSON 백업을 저장하세요.

## 파일 구성
- `HANDOFF.md`: 합의 사항, 작업 상태, 검증 상태, 다음 작업
- `docs/`: PRD, 기능명세, 사용자 흐름, 화면 초안, 태그 규칙
- `prototype/`: HTML/CSS/JS 화면 초안
- `templates/`: 태그 기준 빈 엑셀·비활성 작성 예시
- `inputs/`: 사용자 첨부 원본과 게시물 캡처
- `.agents/skills/`: 프로젝트용 agent-skills 25개
- `.agents/references/`: 스킬 공통 참고 문서
- `scripts/create_tag_templates.py`: 엑셀 양식 재생성 스크립트

엑셀 양식을 재생성할 때만 Python 패키지 `openpyxl`이 필요합니다. 기존 엑셀을 사용하거나 화면 초안을 여는 데는 설치할 필요가 없습니다.

Git 저장소는 초기화하지 않았습니다. 필요하면 프로젝트 폴더에서 `git init`으로 시작하세요. 보유 호석 등 개인 백업은 기본적으로 Git에 포함하지 않습니다.
