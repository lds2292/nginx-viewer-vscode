# nginx-viewer VS Code Extension 개발 프롬프트

이 폴더는 Toolzy 웹앱 `nginx-viewer`를 VS Code Extension으로 포팅한 프로젝트입니다.
아래 지시를 따라 Extension을 구현해주세요.

---

## 프로젝트 개요

**목표**: nginx.conf 파일을 VS Code에서 열 때 WebviewPanel로 시각화 도구를 표시한다.

**구현 방식**: 방식 A — WebviewPanel
- Vite로 빌드된 Vue 3 앱(번들)을 WebviewPanel에 그대로 로드
- `.conf`, `.nginx`, `nginx.conf` 파일 우클릭 → "Open in Nginx Viewer" 컨텍스트 메뉴
- 파일 내용을 Extension → Webview로 메시지 전달

---

## 현재 폴더 구조

이 프롬프트 파일과 함께 다음 파일들이 복사되어 있어야 합니다:

```
nginx-viewer-vscode/
├── VSCODE_EXTENSION_PROMPT.md   <- 이 파일
├── webview/                     <- nginx-viewer/dist/ 를 복사한 것
│   ├── index.html
│   └── assets/
│       ├── index-xxx.js
│       └── index-xxx.css
└── utils/                       <- nginx-viewer/src/utils/ 를 복사한 것
    ├── nginxParser.js
    ├── nginxLint.js
    ├── nginxDiagram.js
    ├── nginxSamples.js
    ├── directiveDocs.js
    └── locationAnalyzer.js
```

---

## 구현해야 할 파일

### 1. `package.json` (Extension manifest)

```json
{
  "name": "nginx-viewer",
  "displayName": "Nginx Config Viewer",
  "description": "Visualize nginx.conf with tree, summary, lint, location analyzer, and diagram.",
  "version": "0.0.1",
  "publisher": "YOUR_PUBLISHER_ID",
  "engines": { "vscode": "^1.85.0" },
  "categories": ["Visualization", "Other"],
  "activationEvents": [],
  "main": "./extension.js",
  "contributes": {
    "commands": [
      {
        "command": "nginx-viewer.open",
        "title": "Open in Nginx Viewer"
      }
    ],
    "menus": {
      "editor/context": [
        {
          "command": "nginx-viewer.open",
          "when": "resourceExtname == .conf || resourceFilename =~ /nginx/",
          "group": "navigation"
        }
      ],
      "explorer/context": [
        {
          "command": "nginx-viewer.open",
          "when": "resourceExtname == .conf || resourceFilename =~ /nginx/",
          "group": "navigation"
        }
      ]
    }
  },
  "scripts": {
    "package": "vsce package",
    "publish": "vsce publish"
  },
  "devDependencies": {
    "@vscode/vsce": "^2.24.0"
  }
}
```

### 2. `extension.js` (Extension 진입점)

구현 포인트:
- `vscode.commands.registerCommand('nginx-viewer.open', ...)` 등록
- `vscode.window.createWebviewPanel` 으로 패널 생성
- `webview/index.html` 을 읽어서 로드 (asset 경로를 `webview.asWebviewUri`로 치환)
- 현재 열린 파일 내용을 `webview.postMessage({ type: 'loadFile', content: ... })`로 전송
- Webview 측에서 `window.addEventListener('message', ...)` 로 수신 후 에디터에 내용 주입

### 3. `webview/index.html` 수정 사항

빌드된 `index.html`의 asset 경로(`/assets/...`)를 Extension에서 동적으로 치환.
`extension.js`에서 HTML 문자열 내 `/assets/` 를 `${webview.asWebviewUri(assetUri)}/` 로 치환.

### 4. Webview - Extension 파일 로드 연동

현재 웹앱은 좌측 에디터에 직접 텍스트를 붙여넣는 방식입니다.
Extension에서 파일을 열면 자동으로 에디터에 내용이 채워져야 합니다.

권장 방식: `window.__nginx_initial_content__` 전역 변수 사용.
- `extension.js`에서 파일 내용을 읽어 index.html의 `<head>`에 인라인 스크립트로 주입
- `App.vue`의 `onMounted`에서 이 값이 있으면 `inputText.value`에 설정하고 자동 파싱 실행

App.vue에 추가할 코드:
```js
onMounted(() => {
  if (window.__nginx_initial_content__) {
    inputText.value = window.__nginx_initial_content__
    handleParse()
  }
})
```

extension.js에서 HTML 주입:
```js
const fileContent = fs.readFileSync(filePath, 'utf8').replace(/`/g, '\\`')
html = html.replace('</head>', `<script>window.__nginx_initial_content__ = \`${fileContent}\`</script></head>`)
```

---

## 개발 순서

1. `package.json` 작성
2. `extension.js` 작성
3. `App.vue`에 `window.__nginx_initial_content__` 연동 추가
4. 원본 프로젝트(`nginx-viewer/`)에서 `npm run build` 후 `dist/` 를 이 프로젝트의 `webview/`로 복사
5. VS Code에서 `F5` -> Extension Development Host로 테스트
6. `npm install` 후 `vsce package` -> `.vsix` 생성
7. Marketplace 퍼블리싱

---

## 원본 앱 주요 기능

- **Formatted**: 구문 하이라이팅 + 라인 번호, 들여쓰기 옵션
- **Tree**: 블록 계층 구조 탐색, 노드 클릭 시 원본 라인 이동
- **Summary**: 서버별 Virtual Host 카드, directive 툴팁
- **Lint**: 오류/경고 목록, 항목 클릭 시 해당 라인 이동
- **Locations**: location 우선순위 분석, 전역 URL 매칭 테스트, 검색/삭제
- **Diagram**: 서버 -> 백엔드 연결 시각화 (proxy_pass/alias/upstream 구분)

기술 스택: Vue 3 + Vite, 외부 의존성 없음 (순수 JS 파서/린터)

---

## 주의사항

- Webview CSP 설정 필요: `webview.options = { enableScripts: true }`
- `localResourceRoots`에 `webview/` 폴더 경로 포함 필수
- Marketplace 퍼블리싱 전 `publisher` ID를 실제 값으로 교체
- `vsce package` 시 `webview/` 폴더가 번들에 포함되는지 확인 (`.vscodeignore`에서 제외 처리)
