# GitHub Pages 화면 배포

사이트 주소: https://zeres-kor.github.io/MWH-Armorset-Talisman-Simulator/

## 최초 설정

1. 저장소의 **Settings → Pages**를 연다.
2. **Build and deployment → Source**를 **GitHub Actions**로 선택한다.
3. **Actions → Deploy inventory to GitHub Pages → Run workflow**에서 `main`을 실행한다. 이전 실행이 실패했다면 설정 변경 후 다시 실행한다.
4. `build`와 `deploy`가 성공하면 위 주소를 연다. 비공개 저장소에서 Pages 메뉴가 제한되면 해당 계정의 Pages 지원 요금제/권한이 필요하다.

설정 위치: https://github.com/Zeres-kor/MWH-Armorset-Talisman-Simulator/settings/pages

실행 위치: https://github.com/Zeres-kor/MWH-Armorset-Talisman-Simulator/actions/workflows/pages.yml

## 이후 업데이트

`main`의 화면 코드·테스트·배포 설정이 변경되면 자동 실행한다. JavaScript 구문 검사와 단위 테스트를 통과한 `prototype/` 폴더를 사이트 루트에 배포한다. 개인 첨부 파일, `inputs/`, 개발 문서와 스킬 파일은 배포 대상에 포함되지 않는다.

저장소 반영 직후 즉시 바뀌는 방식은 아니며 GitHub Actions 배포가 완료된 뒤 새로고침하면 변경 사항을 볼 수 있다. 테스트나 배포에 실패하면 기존 사이트가 유지된다.

호석과 태그 기준은 접속한 브라우저의 localStorage에 저장된다. 업로드 파일은 브라우저에서 읽고 서버로 전송하지 않는다. 로컬 실행 주소와 Pages 주소는 저장소가 다르므로 기존 데이터를 옮길 때는 JSON 백업·복원을 사용한다.

프로그램/프로젝트 표시 명칭은 MHWids 세팅노트다. 사용자가 제공한 저장소 URL은 위 기존 주소와 일치하므로 연결과 링크는 유지한다.
