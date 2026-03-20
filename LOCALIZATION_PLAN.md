# Localization Plan

nginx-viewer VS Code Extension 다국어 지원 구현 계획

---

## 지원 언어

| 코드 | 언어 | 상태 |
|------|------|------|
| `ko` | 한국어 | 기본값 (현재 하드코딩) |
| `en` | English | 구현 예정 |

---

## 구현 방식

### Webview (Vue 앱)
의존성 없는 경량 커스텀 i18n 컴포저블 사용

### Extension 메시지 (`extension.js`)
`@vscode/l10n` 사용

### Marketplace 메타데이터 (`package.json`)
VS Code 공식 NLS 방식 (`package.nls.json` / `package.nls.ko.json`)

---

## Locale 전달 흐름

```
vscode.env.language
    ↓
extension.js (HTML 주입)
    ↓
window.__vscode_locale__ = 'ko' | 'en'
    ↓
src/i18n/index.js (useI18n 컴포저블)
    ↓
Vue 컴포넌트: t('key')
```

---

## 파일 구조

```
nginx-viewer-vscode/
├── src/
│   └── i18n/
│       ├── ko.js          ← 한국어 문자열
│       ├── en.js          ← 영어 문자열
│       └── index.js       ← useI18n() 컴포저블
├── package.nls.json       ← 영어 (기본 NLS)
└── package.nls.ko.json    ← 한국어 NLS
```

---

## 1단계: `src/i18n/index.js` 구현

```js
import ko from './ko.js'
import en from './en.js'

const LOCALES = { ko, en }

function getLocale() {
  const lang = window.__vscode_locale__ || 'ko'
  const code = lang.split('-')[0]  // 'ko-KR' → 'ko'
  return LOCALES[code] ?? LOCALES.en
}

export function useI18n() {
  const locale = getLocale()
  const t = (key) => locale[key] ?? key
  return { t }
}
```

---

## 2단계: 문자열 키 목록

### `App.vue`

| key | ko | en |
|-----|----|----|
| `header_title` | nginx Configuration Viewer | nginx Configuration Viewer |
| `sample_load` | 예시 불러오기 ▾ | Load Sample ▾ |
| `btn_clear` | 지우기 | Clear |
| `btn_parse` | Parse & Format | Parse & Format |
| `stat_nodes` | `{n} 노드` | `{n} nodes` |
| `tab_formatted` | Formatted | Formatted |
| `tab_tree` | Tree | Tree |
| `tab_summary` | Summary | Summary |
| `tab_lint` | Lint | Lint |
| `tab_locations` | Locations | Locations |
| `tab_diagram` | Diagram | Diagram |
| `btn_copy` | 복사 | Copy |
| `btn_copied` | ✓ 복사됨 | ✓ Copied |
| `placeholder_paste` | nginx.conf를 붙여넣고\nParse & Format을 누르세요 | Paste nginx.conf here\nand click Parse & Format |
| `indent_2` | 2 spaces | 2 spaces |
| `indent_4` | 4 spaces | 4 spaces |
| `indent_tab` | Tab | Tab |

### `LocationAnalyzer.vue`

| key | ko | en |
|-----|----|----|
| `global_test_title` | 전역 URL 테스트 | Global URL Test |
| `global_test_placeholder` | https://example.com/api/users | https://example.com/api/users |
| `btn_test` | 테스트 | Test |
| `global_no_match` | 매칭되는 서버 블록이 없습니다. | No matching server block found. |
| `search_placeholder` | path, proxy_pass, alias 등으로 검색... | Search by path, proxy_pass, alias... |
| `search_count` | `{n}개 매칭` | `{n} match(es)` |
| `loc_count` | `{n} locations` | `{n} locations` |
| `no_locations` | location 블록이 없습니다. | No location blocks. |
| `btn_detail` | 상세 | Detail |
| `btn_close` | 닫기 | Close |
| `btn_delete` | 삭제 | Delete |
| `dup_tag` | 중복 패턴 | Duplicate |
| `delete_modal_title` | Location 삭제 | Delete Location |
| `delete_modal_desc` | 다음 location을 nginx.conf에서 삭제합니다. | The following location will be removed from nginx.conf. |
| `delete_modal_warn` | 이 작업은 되돌릴 수 없습니다. | This action cannot be undone. |
| `btn_cancel` | 취소 | Cancel |
| `legend_priority` | 우선순위: | Priority: |

### `SummaryView.vue`

| key | ko | en |
|-----|----|----|
| `summary_empty` | 요약할 설정이 없습니다... | No configuration to summarize. |
| `details_label` | 세부 설정 | Details |
| `no_server_name` | (no server_name) | (no server_name) |

### `DiagramView.vue`

| key | ko | en |
|-----|----|----|
| `diagram_empty` | 서버 블록이 없습니다. | No server blocks found. |
| `diagram_stat` | `{s}개 서버 · {b}개 백엔드` | `{s} server(s) · {b} backend(s)` |
| `col_vhosts` | Virtual Hosts | Virtual Hosts |
| `col_backends` | Backends | Backends |
| `conn_tooltip_title` | `연결된 location ({n}개)` | `Connected locations ({n})` |

### Help Modal (`App.vue`)

| key | ko | en |
|-----|----|----|
| `help_title` | nginx Configuration Viewer — Help | nginx Configuration Viewer — Help |
| `help_start_title` | 시작하기 | Getting Started |
| `help_tabs_title` | 탭 설명 | Tabs |
| (나머지 도움말 문자열) | ... | ... |

---

## 3단계: `extension.js` 수정

```js
// locale 주입 (기존 스크립트 주입 부분 수정)
const locale = vscode.env.language  // 'ko', 'ko-KR', 'en', 'en-US' 등
html = html.replace(
  '</head>',
  `<script>
    window.__vscode_webview__ = true;
    window.__vscode_locale__ = '${locale}';
    window.__nginx_initial_content__ = \`${fileContent}\`;
  </script>\n  </head>`
)
```

---

## 4단계: `package.json` NLS

**`package.nls.json`** (영어 기본)
```json
{
  "command.open.title": "Open in Nginx Viewer"
}
```

**`package.nls.ko.json`** (한국어)
```json
{
  "command.open.title": "Nginx Viewer로 열기"
}
```

**`package.json`** 수정
```json
{
  "contributes": {
    "commands": [
      {
        "command": "nginx-viewer.open",
        "title": "%command.open.title%"
      }
    ]
  }
}
```

---

## 작업 순서

- [ ] 1. `src/i18n/ko.js` 생성 (현재 하드코딩 문자열 추출)
- [ ] 2. `src/i18n/en.js` 생성 (영어 번역)
- [ ] 3. `src/i18n/index.js` 생성 (`useI18n` 컴포저블)
- [ ] 4. `App.vue` 문자열 → `t('key')` 치환
- [ ] 5. `LocationAnalyzer.vue` 문자열 → `t('key')` 치환
- [ ] 6. `SummaryView.vue` 문자열 → `t('key')` 치환
- [ ] 7. `DiagramView.vue` 문자열 → `t('key')` 치환
- [ ] 8. `MobileBlock.vue` 문자열 → `t('key')` 치환 (웹 전용)
- [ ] 9. `extension.js` locale 주입 추가
- [ ] 10. `package.nls.json` / `package.nls.ko.json` 생성
- [ ] 11. `npm run build` 후 동작 확인 (ko/en 전환 테스트)
