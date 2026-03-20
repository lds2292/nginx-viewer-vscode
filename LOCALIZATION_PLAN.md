# Localization Plan

nginx-viewer VS Code Extension 다국어 지원 구현 계획

---

## 지원 언어

| 코드 | 언어 | 상태 |
|------|------|------|
| `ko` | 한국어 | 기본값 (현재 하드코딩) |
| `en` | English | 구현 예정 |
| `ja` | 日本語 | 구현 예정 |
| `zh-cn` | 中文 (简体) | 구현 예정 |
| `zh-tw` | 中文 (繁體) | 구현 예정 |

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
window.__vscode_locale__ = 'ko' | 'en' | 'ja' | 'zh-cn' | 'zh-tw'
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
│       ├── ja.js          ← 일본어 문자열
│       ├── zh-cn.js       ← 중국어 간체 문자열
│       ├── zh-tw.js       ← 중국어 번체 문자열
│       └── index.js       ← useI18n() 컴포저블
├── package.nls.json       ← 영어 (기본 NLS)
├── package.nls.ko.json    ← 한국어 NLS
├── package.nls.ja.json    ← 일본어 NLS
├── package.nls.zh-cn.json ← 중국어 간체 NLS
└── package.nls.zh-tw.json ← 중국어 번체 NLS
```

---

## 1단계: `src/i18n/index.js` 구현

```js
import ko from './ko.js'
import en from './en.js'
import ja from './ja.js'
import zhCN from './zh-cn.js'
import zhTW from './zh-tw.js'

const LOCALES = { ko, en, ja, 'zh-cn': zhCN, 'zh-tw': zhTW }

function getLocale() {
  const lang = (window.__vscode_locale__ || 'ko').toLowerCase()
  // zh-tw / zh-cn 처럼 하이픈 포함 코드 먼저 매칭
  if (LOCALES[lang]) return LOCALES[lang]
  // 'ko-KR' → 'ko' 처럼 앞부분만 매칭
  const code = lang.split('-')[0]
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

| key | ko | en | ja | zh-cn | zh-tw |
|-----|----|----|----|----|-----|
| `header_title` | nginx Configuration Viewer | nginx Configuration Viewer | nginx Configuration Viewer | nginx Configuration Viewer | nginx Configuration Viewer |
| `sample_load` | 예시 불러오기 ▾ | Load Sample ▾ | サンプルを読込 ▾ | 加载示例 ▾ | 載入範例 ▾ |
| `btn_clear` | 지우기 | Clear | クリア | 清除 | 清除 |
| `btn_parse` | Parse & Format | Parse & Format | Parse & Format | Parse & Format | Parse & Format |
| `stat_nodes` | `{n} 노드` | `{n} nodes` | `{n} ノード` | `{n} 个节点` | `{n} 個節點` |
| `tab_formatted` | Formatted | Formatted | Formatted | Formatted | Formatted |
| `tab_tree` | Tree | Tree | Tree | Tree | Tree |
| `tab_summary` | Summary | Summary | Summary | Summary | Summary |
| `tab_lint` | Lint | Lint | Lint | Lint | Lint |
| `tab_locations` | Locations | Locations | Locations | Locations | Locations |
| `tab_diagram` | Diagram | Diagram | Diagram | Diagram | Diagram |
| `btn_copy` | 복사 | Copy | コピー | 复制 | 複製 |
| `btn_copied` | ✓ 복사됨 | ✓ Copied | ✓ コピー済み | ✓ 已复制 | ✓ 已複製 |
| `placeholder_paste` | nginx.conf를 붙여넣고\nParse & Format을 누르세요 | Paste nginx.conf here\nand click Parse & Format | nginx.conf を貼り付けて\nParse & Format を押してください | 将 nginx.conf 粘贴于此\n点击 Parse & Format | 將 nginx.conf 貼上\n點擊 Parse & Format |
| `indent_2` | 2 spaces | 2 spaces | 2 spaces | 2 spaces | 2 spaces |
| `indent_4` | 4 spaces | 4 spaces | 4 spaces | 4 spaces | 4 spaces |
| `indent_tab` | Tab | Tab | Tab | Tab | Tab |

### `LocationAnalyzer.vue`

| key | ko | en | ja | zh-cn | zh-tw |
|-----|----|----|----|----|-----|
| `global_test_title` | 전역 URL 테스트 | Global URL Test | グローバル URL テスト | 全局 URL 测试 | 全域 URL 測試 |
| `global_test_placeholder` | https://example.com/api/users | https://example.com/api/users | https://example.com/api/users | https://example.com/api/users | https://example.com/api/users |
| `btn_test` | 테스트 | Test | テスト | 测试 | 測試 |
| `global_no_match` | 매칭되는 서버 블록이 없습니다. | No matching server block found. | 一致するサーバーブロックがありません。 | 未找到匹配的服务器块。 | 找不到匹配的伺服器區塊。 |
| `search_placeholder` | path, proxy_pass, alias 등으로 검색... | Search by path, proxy_pass, alias... | path, proxy_pass, alias などで検索... | 按 path, proxy_pass, alias 等搜索... | 以 path, proxy_pass, alias 等搜尋... |
| `search_count` | `{n}개 매칭` | `{n} match(es)` | `{n} 件一致` | `{n} 个匹配` | `{n} 個匹配` |
| `loc_count` | `{n} locations` | `{n} locations` | `{n} locations` | `{n} 个 location` | `{n} 個 location` |
| `no_locations` | location 블록이 없습니다. | No location blocks. | location ブロックがありません。 | 没有 location 块。 | 沒有 location 區塊。 |
| `btn_detail` | 상세 | Detail | 詳細 | 详情 | 詳情 |
| `btn_close` | 닫기 | Close | 閉じる | 关闭 | 關閉 |
| `btn_delete` | 삭제 | Delete | 削除 | 删除 | 刪除 |
| `dup_tag` | 중복 패턴 | Duplicate | 重複パターン | 重复模式 | 重複模式 |
| `delete_modal_title` | Location 삭제 | Delete Location | Location を削除 | 删除 Location | 刪除 Location |
| `delete_modal_desc` | 다음 location을 nginx.conf에서 삭제합니다. | The following location will be removed from nginx.conf. | 次の location を nginx.conf から削除します。 | 将从 nginx.conf 中删除以下 location。 | 將從 nginx.conf 中刪除以下 location。 |
| `delete_modal_warn` | 이 작업은 되돌릴 수 없습니다. | This action cannot be undone. | この操作は元に戻せません。 | 此操作无法撤销。 | 此操作無法復原。 |
| `btn_cancel` | 취소 | Cancel | キャンセル | 取消 | 取消 |
| `legend_priority` | 우선순위: | Priority: | 優先度: | 优先级: | 優先級: |

### `SummaryView.vue`

| key | ko | en | ja | zh-cn | zh-tw |
|-----|----|----|----|----|-----|
| `summary_empty` | 요약할 설정이 없습니다... | No configuration to summarize. | 要約する設定がありません... | 没有可汇总的配置... | 沒有可摘要的設定... |
| `details_label` | 세부 설정 | Details | 詳細設定 | 详细配置 | 詳細設定 |
| `no_server_name` | (no server_name) | (no server_name) | (no server_name) | (no server_name) | (no server_name) |

### `DiagramView.vue`

| key | ko | en | ja | zh-cn | zh-tw |
|-----|----|----|----|----|-----|
| `diagram_empty` | 서버 블록이 없습니다. | No server blocks found. | サーバーブロックがありません。 | 没有服务器块。 | 沒有伺服器區塊。 |
| `diagram_stat` | `{s}개 서버 · {b}개 백엔드` | `{s} server(s) · {b} backend(s)` | `{s} サーバー · {b} バックエンド` | `{s} 个服务器 · {b} 个后端` | `{s} 個伺服器 · {b} 個後端` |
| `col_vhosts` | Virtual Hosts | Virtual Hosts | Virtual Hosts | Virtual Hosts | Virtual Hosts |
| `col_backends` | Backends | Backends | Backends | Backends | Backends |
| `conn_tooltip_title` | `연결된 location ({n}개)` | `Connected locations ({n})` | `接続された location ({n}件)` | `关联的 location ({n} 个)` | `關聯的 location ({n} 個)` |

### Help Modal (`App.vue`)

| key | ko | en | ja | zh-cn | zh-tw |
|-----|----|----|----|----|-----|
| `help_title` | nginx Configuration Viewer — Help | nginx Configuration Viewer — Help | nginx Configuration Viewer — ヘルプ | nginx Configuration Viewer — 帮助 | nginx Configuration Viewer — 說明 |
| `help_start_title` | 시작하기 | Getting Started | はじめに | 开始使用 | 開始使用 |
| `help_tabs_title` | 탭 설명 | Tabs | タブの説明 | 标签说明 | 標籤說明 |
| (나머지 도움말 문자열) | ... | ... | ... | ... | ... |

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

**`package.nls.ja.json`** (일본어)
```json
{
  "command.open.title": "Nginx Viewer で開く"
}
```

**`package.nls.zh-cn.json`** (중국어 간체)
```json
{
  "command.open.title": "在 Nginx Viewer 中打开"
}
```

**`package.nls.zh-tw.json`** (중국어 번체)
```json
{
  "command.open.title": "在 Nginx Viewer 中開啟"
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

- [x] 1. `src/i18n/ko.js` 생성 (현재 하드코딩 문자열 추출)
- [x] 2. `src/i18n/en.js` 생성 (영어 번역)
- [x] 3. `src/i18n/ja.js` 생성 (일본어 번역)
- [x] 4. `src/i18n/zh-cn.js` 생성 (중국어 간체 번역)
- [x] 5. `src/i18n/zh-tw.js` 생성 (중국어 번체 번역)
- [x] 6. `src/i18n/index.js` 생성 (`useI18n` 컴포저블, 5개 언어 포함)
- [x] 7. `App.vue` 문자열 → `t('key')` 치환
- [x] 8. `LocationAnalyzer.vue` 문자열 → `t('key')` 치환
- [x] 9. `SummaryView.vue` 문자열 → `t('key')` 치환
- [x] 10. `DiagramView.vue` 문자열 → `t('key')` 치환
- [x] 11. `MobileBlock.vue` 문자열 → `t('key')` 치환 (웹 전용)
- [x] 12. `extension.js` locale 주입 추가
- [x] 13. `package.nls.json` / `package.nls.ko.json` / `package.nls.ja.json` / `package.nls.zh-cn.json` / `package.nls.zh-tw.json` 생성
- [x] 14. `npm run build` 후 동작 확인 (5개 언어 전환 테스트)
