# Monster Hunter Wilds 아이콘 재생성 묶음

클라우드 채팅의 생성 절차를 로컬에서 재실행한 결과입니다. 원본 DDS와 UV 좌표로부터 구성했습니다.

- `decorations_framed`: 장식주 361개 기본 조합
- `slot_combinations_preview`: 장식주 레벨과 슬롯 크기의 유효 조합
- `equipment_framed`: 무기 14종, 방어구 5종, 호석 1종
- `equipment_rarity`: 무기 14종과 방어구 5종 × 레어도 1~12. 각 레어도는 팔레트 22~33에 대응합니다.
- `rarity-comparison.png`: 레어도별 아이콘 비교
- `equipment`, `skills`, `badges`, `components`, `frames`: 원본 텍스처 크롭
- `index.html`: 오프라인 검색과 슬롯 크기 선택
- `metadata`: 좌표, 색상표, 조합 목록, 검증 결과
- `metadata/skill_color_summary.csv`: 스킬별 장식주 색상 요약. 한 스킬에 여러 색이 있을 수 있습니다.
- `metadata/skill_decoration_colors.csv`: 장식주별 스킬과 색상 상세표
- `metadata/skill_icon_mapping.csv`: 스킬 179개와 `symbol_00`~`symbol_13`의 대응표
- `metadata/skill_symbol_summary.csv`: 심볼별 전체 스킬 목록

3슬롯의 삼각형은 사용자 인게임 관찰에 따라 1레벨: 가운데, 2레벨: 왼쪽과 오른쪽, 3레벨: 모두 채웁니다. 나머지 최종 배치와 명암은 게임 런타임의 픽셀 결과와 대조되지 않은 시안입니다. 레어도 1~12와 팔레트 22~33의 대응은 kvasszn/mhwilds-data의 wilds/colors.py에 기록된 게임 열거형 표를 사용했고, 색상값은 사용자가 제공한 게임 파일에서 읽었습니다. 호석에는 레어도 색상을 적용하지 않았습니다. 스킬명과 심볼 대응은 mhdb-wilds-data의 Skill.json에 있는 게임 원본 _SkillIconType 번호를 사용합니다. 아이콘 번호 1~14가 텍스처의 연속된 14칸과 대응한다고 해석했으며, 스킬 예시와 모양은 대조했지만 모든 게임 화면에서 픽셀 검증한 것은 아닙니다. 장식주 이름과 ID, 스킬 연결은 공개 mhdb-wilds-data의 Accessory.json과 Skill.json입니다.
