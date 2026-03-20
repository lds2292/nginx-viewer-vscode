<template>
  <MobileBlock v-if="isMobile" />
  <div v-else class="layout">
    <!-- Header -->
    <header class="header">
      <div class="header-left">
        <!-- nginx N + wrench logo -->
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Background -->
          <rect width="28" height="28" rx="6" fill="#0c1e12"/>
          <!-- nginx N -->
          <path d="M4 4L4 20L7 20L7 11L17 20L20 20L20 4L17 4L17 13L7 4Z" fill="#4ade80"/>
          <!-- Dark badge behind wrench -->
          <circle cx="21" cy="21" r="8" fill="#0c1e12"/>
          <!-- Open-end wrench, rotated 45deg -->
          <g transform="translate(21,21) rotate(-45)">
            <rect x="-1" y="1" width="2" height="6" rx="1" fill="#4ade80"/>
            <rect x="-3.5" y="-5.5" width="2.5" height="6" rx="1" fill="#4ade80"/>
            <rect x="1" y="-5.5" width="2.5" height="6" rx="1" fill="#4ade80"/>
          </g>
        </svg>
        <span class="header-title">nginx Configuration Viewer</span>
      </div>
      <button class="help-btn" @click="showHelp = true" title="Help">?</button>
    </header>

    <!-- Help Modal -->
    <Teleport to="body">
      <div v-if="showHelp" class="modal-backdrop" @click.self="showHelp = false">
        <div class="modal">
          <div class="modal-header">
            <h2>nginx Configuration Viewer — Help</h2>
            <button class="modal-close" @click="showHelp = false">✕</button>
          </div>
          <div class="modal-body">
            <section>
              <h3>시작하기</h3>
              <p>왼쪽 에디터에 nginx.conf 내용을 붙여넣고 <code>Parse &amp; Format</code>을 누르세요. 라인 번호가 함께 표시되며 예시 파일로 빠르게 테스트할 수 있습니다.</p>
            </section>

            <section>
              <h3>탭 설명</h3>
              <ul>
                <li><code>Formatted</code> — 구문 하이라이팅 + 라인 번호. 들여쓰기(2/4 spaces, Tab) 선택 및 복사 가능</li>
                <li><code>Tree</code> — 블록 계층 구조 탐색. 노드 클릭 시 원본 위치로 스크롤·선택</li>
                <li><code>Summary</code> — 서버별 Virtual Host 카드. listen·server_name·주요 directive 표시. directive 이름 hover 시 nginx 공식 문서 툴팁</li>
                <li><code>Lint</code> — 오류·경고 목록. 탭 배지로 건수 표시. 항목 클릭 시 해당 라인으로 이동</li>
                <li><code>Locations</code> — location 우선순위 분석, 전역 URL 매칭 테스트, 검색, 삭제</li>
                <li><code>Diagram</code> — 서버 → 백엔드 연결 시각화. proxy_pass(파란색)·alias(초록색)·upstream 자동 구분</li>
              </ul>
            </section>

            <section>
              <h3>Locations 탭</h3>
              <ul>
                <li><strong>전역 URL 테스트</strong> — <code>https://host/path</code> 입력 후 테스트. server_name·포트·location을 nginx 규칙으로 통합 매칭. 결과 클릭 시 해당 location으로 이동</li>
                <li><strong>검색</strong> — path, directive명(예: <code>proxy_pass</code>), 값으로 실시간 필터. 매칭 서버·location만 표시</li>
                <li><strong>상세</strong> — location별 설정된 directive 목록 펼치기. 키 hover 시 공식 문서 툴팁</li>
                <li><strong>삭제</strong> — location 블록을 nginx.conf에서 직접 제거 후 자동 재파싱</li>
                <li>location 행 클릭 → 원본 에디터의 해당 줄로 스크롤·선택</li>
              </ul>
            </section>

            <section>
              <h3>Diagram 탭</h3>
              <ul>
                <li>서버 블록과 proxy_pass·alias 대상을 노드·화살표로 시각화</li>
                <li>upstream 블록은 멤버 서버 목록과 함께 별도 그룹 노드로 표시</li>
                <li>노드 클릭 → 연결된 노드·선 강조, 나머지 흐리게 처리. 배경 클릭으로 초기화</li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Main -->
    <div class="main">
      <!-- Left: Input -->
      <div class="pane pane-left">
        <div class="pane-header">
          <span class="pane-label">nginx.conf</span>
          <div class="sample-dropdown-wrap" ref="sampleWrapRef">
            <button class="btn-ghost sample-btn" @click="toggleSampleMenu">예시 불러오기 ▾</button>
            <div v-if="sampleMenuOpen" class="sample-menu">
              <button
                v-for="s in SAMPLES"
                :key="s.key"
                class="sample-item"
                @click="loadSample(s)"
              >{{ s.label }}</button>
            </div>
          </div>
          <button class="btn-ghost" @click="clearInput" title="지우기">지우기</button>
        </div>
        <div class="input-editor-wrap">
          <div class="line-gutter" ref="lineGutterRef">
            <div v-for="n in lineCount" :key="n" class="ln">{{ n }}</div>
          </div>
          <textarea
            ref="inputRef"
            v-model="input"
            class="input-area"
            placeholder="여기에 nginx.conf 내용을 붙여넣으세요..."
            spellcheck="false"
            @scroll="onInputScroll"
          ></textarea>
        </div>
        <div class="input-footer">
          <button class="btn-primary" @click="run">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            Parse &amp; Format
          </button>
          <span v-if="parsed && !error" class="stat-text">{{ nodeCount }} 노드</span>
        </div>
      </div>

      <!-- Right: Output -->
      <div class="pane pane-right">
        <!-- Error -->
        <div v-if="error" class="error-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>{{ error }}</span>
        </div>

        <!-- Tabs -->
        <div v-if="parsed && !error" class="tabs">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            class="tab"
            :class="{ active: activeTab === tab.key }"
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
            <span v-if="tab.badge" class="tab-badge" :class="`tab-badge-${tab.badgeColor}`">{{ tab.badge }}</span>
          </button>
          <div class="tabs-spacer"></div>
          <template v-if="activeTab === 'formatted'">
            <div class="indent-selector">
              <button
                v-for="opt in indentOptions"
                :key="opt.value"
                class="indent-btn"
                :class="{ active: indentStr === opt.value }"
                @click="indentStr = opt.value"
              >{{ opt.label }}</button>
            </div>
            <button class="btn-ghost copy-btn" @click="copyFormatted">
              {{ copied ? '✓ 복사됨' : '복사' }}
            </button>
          </template>
        </div>

        <!-- Placeholder -->
        <div v-if="!parsed && !error" class="placeholder">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3a3a4f" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="16 18 22 12 16 6"/>
            <polyline points="8 6 2 12 8 18"/>
          </svg>
          <p>nginx.conf를 붙여넣고<br>Parse &amp; Format을 누르세요</p>
        </div>

        <!-- Formatted Tab -->
        <div v-if="parsed && !error && activeTab === 'formatted'" class="output-area formatted-area">
          <div class="code-with-lines">
            <div v-for="(line, i) in highlightedLines" :key="i" class="code-line">
              <span class="line-num">{{ i + 1 }}</span>
              <span class="line-content" v-html="line"></span>
            </div>
          </div>
        </div>

        <!-- Tree Tab -->
        <div v-if="parsed && !error && activeTab === 'tree'" class="output-area tree-area">
          <TreeNode v-for="(node, i) in ast" :key="i" :node="node" :depth="0" />
        </div>

        <!-- Summary Tab -->
        <div v-if="parsed && !error && activeTab === 'summary'" class="output-area summary-area">
          <SummaryView :summary="summaryData" />
        </div>

        <!-- Lint Tab -->
        <div v-if="parsed && !error && activeTab === 'lint'" class="output-area summary-area">
          <LintView :issues="lintIssues" />
        </div>

        <!-- Locations Tab -->
        <div v-if="parsed && !error && activeTab === 'locations'" class="output-area summary-area">
          <LocationAnalyzer :ast="ast" />
        </div>

        <!-- Diagram Tab -->
        <div v-if="parsed && !error && activeTab === 'diagram'" class="output-area summary-area">
          <DiagramView :ast="ast" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, provide } from 'vue'
import MobileBlock from './components/MobileBlock.vue'
import { parse, format, highlight, summarize } from './utils/nginxParser.js'
import { lint } from './utils/nginxLint.js'
import { SAMPLES } from './utils/nginxSamples.js'
import TreeNode from './components/TreeNode.vue'
import SummaryView from './components/SummaryView.vue'
import LintView from './components/LintView.vue'
import LocationAnalyzer from './components/LocationAnalyzer.vue'
import DiagramView from './components/DiagramView.vue'

const isMobile = ref(false)
const showHelp = ref(false)
const sampleMenuOpen = ref(false)
const sampleWrapRef = ref(null)
const inputRef = ref(null)
const lineGutterRef = ref(null)
const lineCount = computed(() => input.value ? input.value.split('\n').length : 1)

function onInputScroll() {
  if (lineGutterRef.value && inputRef.value) {
    lineGutterRef.value.scrollTop = inputRef.value.scrollTop
  }
}
const input = ref('')
const parsed = ref(false)
const error = ref(null)
const ast = ref([])
const summaryData = ref(null)
const lintIssues = ref([])
const activeTab = ref('formatted')
const copied = ref(false)

const indentOptions = [
  { label: '2 spaces', value: '  ' },
  { label: '4 spaces', value: '    ' },
  { label: 'Tab',      value: '\t' },
]
const indentStr = ref('  ')

const formattedCode   = computed(() => ast.value.length ? format(ast.value, indentStr.value) : '')
const highlightedCode = computed(() => ast.value.length ? highlight(ast.value, indentStr.value) : '')
const highlightedLines = computed(() => highlightedCode.value ? highlightedCode.value.split('\n') : [])

function jumpToLine(line) {
  if (!line || !inputRef.value) return
  const textarea = inputRef.value
  const lines = input.value.split('\n')

  // 선택 범위 계산
  let offset = 0
  for (let i = 0; i < line - 1 && i < lines.length; i++) {
    offset += lines[i].length + 1
  }
  const endOffset = offset + (lines[line - 1]?.length || 0)

  // 미러 div로 대상 라인까지의 실제 픽셀 높이를 측정 (line-height 누적 오차 없음)
  const style = window.getComputedStyle(textarea)
  const mirror = document.createElement('div')
  Object.assign(mirror.style, {
    position: 'fixed',
    top: '-9999px',
    left: '-9999px',
    width: textarea.clientWidth + 'px',
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    lineHeight: style.lineHeight,
    paddingTop: style.paddingTop,
    paddingBottom: style.paddingBottom,
    paddingLeft: style.paddingLeft,
    paddingRight: style.paddingRight,
    boxSizing: style.boxSizing,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
    visibility: 'hidden',
  })
  // line-1 줄까지의 텍스트를 넣으면 scrollHeight = 해당 라인 시작 픽셀
  mirror.textContent = lines.slice(0, line - 1).join('\n') + (line > 1 ? '\n' : '')
  document.body.appendChild(mirror)
  const lineTop = mirror.scrollHeight
  document.body.removeChild(mirror)

  const scrollTop = Math.max(0, lineTop - textarea.clientHeight / 3)

  textarea.focus()
  textarea.setSelectionRange(offset, endOffset)
  // RAF: setSelectionRange/focus의 브라우저 자동 스크롤 이후에 덮어씀
  requestAnimationFrame(() => {
    textarea.scrollTop = scrollTop
    if (lineGutterRef.value) lineGutterRef.value.scrollTop = scrollTop
  })
}

provide('jumpToLine', jumpToLine)

function deleteNode(node) {
  if (!node?.line) return
  const lines = input.value.split('\n')
  const startIdx = node.line - 1  // 0-indexed

  // 중괄호 카운팅으로 블록 끝 라인 탐색
  let depth = 0
  let endIdx = startIdx
  let found = false
  for (let i = startIdx; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === '{') depth++
      else if (ch === '}') {
        depth--
        if (depth === 0) { endIdx = i; found = true; break }
      }
    }
    if (found) break
  }
  if (!found) return

  lines.splice(startIdx, endIdx - startIdx + 1)
  input.value = lines.join('\n').replace(/\n{3,}/g, '\n\n')
  run()
}
provide('deleteNode', deleteNode)

const lintErrorCount = computed(() => lintIssues.value.filter(i => i.severity === 'error').length)
const lintWarnCount  = computed(() => lintIssues.value.filter(i => i.severity === 'warning').length)

const tabs = computed(() => [
  { key: 'formatted',  label: 'Formatted' },
  { key: 'tree',       label: 'Tree' },
  { key: 'summary',    label: 'Summary' },
  { key: 'lint',       label: 'Lint', badge: lintErrorCount.value || lintWarnCount.value || null, badgeColor: lintErrorCount.value ? 'error' : 'warning' },
  { key: 'locations',  label: 'Locations' },
  { key: 'diagram',    label: 'Diagram' },
])

const nodeCount = computed(() => {
  let n = 0
  const count = (nodes) => {
    for (const node of nodes) {
      n++
      if (node.children) count(node.children)
    }
  }
  count(ast.value)
  return n
})

function run() {
  error.value = null
  parsed.value = false

  const result = parse(input.value)
  if (!result.ok) {
    error.value = result.error
    return
  }

  ast.value = result.ast
  summaryData.value = summarize(result.ast)
  lintIssues.value = lint(result.ast)
  parsed.value = true
}

function clearInput() {
  input.value = ''
  parsed.value = false
  error.value = null
  ast.value = []
  lintIssues.value = []
}

async function copyFormatted() {
  try {
    await navigator.clipboard.writeText(formattedCode.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {}
}

function toggleSampleMenu() {
  sampleMenuOpen.value = !sampleMenuOpen.value
}

function loadSample(s) {
  input.value = s.conf
  sampleMenuOpen.value = false
  run()
}

onMounted(() => {
  isMobile.value = !window.__vscode_webview__ && window.innerWidth < 768

  document.addEventListener('click', (e) => {
    if (sampleWrapRef.value && !sampleWrapRef.value.contains(e.target)) {
      sampleMenuOpen.value = false
    }
  })

  if (window.__nginx_initial_content__) {
    input.value = window.__nginx_initial_content__
    run()
  }
})
</script>

<style scoped>
.layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #0f0f13;
  overflow: hidden;
}

/* Header */
.header {
  height: 52px;
  background: #16161d;
  border-bottom: 1px solid #2a2a3a;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-link {
  display: flex;
  align-items: center;
  gap: 6px;
  text-decoration: none;
}

.logo-text {
  font-size: 15px;
  font-weight: 700;
  color: #f0f0f5;
  letter-spacing: -0.02em;
}

.header-sep {
  color: #3a3a4f;
  font-size: 16px;
}

.header-title {
  font-size: 15px;
  font-weight: 600;
  color: #4ade80;
}

.help-btn {
  width: 28px;
  height: 28px;
  background: none;
  border: 1px solid #2a2a3a;
  border-radius: 6px;
  color: #6b7280;
  font-size: 14px;
  font-weight: 700;
  padding: 0;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.help-btn:hover { color: #d1d5db; border-color: #3a3a4f; }

/* Main split */
.main {
  display: flex;
  flex: 1;
  overflow: hidden;
  gap: 0;
}

.pane {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.pane-left {
  width: 40%;
  min-width: 280px;
  border-right: 1px solid #2a2a3a;
}

.pane-right {
  flex: 1;
}

/* Pane header */
.pane-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  background: #16161d;
  border-bottom: 1px solid #2a2a3a;
  flex-shrink: 0;
}

.pane-label {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

/* Input */
.input-area {
  flex: 1;
  resize: none;
  background: #0f0f13;
  color: #d1d5db;
  border: none;
  outline: none;
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.7;
  padding: 14px 14px 14px 0;
  overflow: auto;
  min-width: 0;
}

.input-area::placeholder { color: #3a3a4f; }

.input-editor-wrap {
  display: flex;
  flex: 1;
  overflow: hidden;
  background: #0f0f13;
}

.line-gutter {
  flex-shrink: 0;
  width: 44px;
  background: #0f0f13;
  border-right: 1px solid #1e1e2e;
  overflow: hidden;
  padding: 14px 0;
  user-select: none;
}

.ln {
  display: block;
  text-align: right;
  padding-right: 10px;
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.7;
  color: #3a3a4f;
}

.input-footer {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: #16161d;
  border-top: 1px solid #2a2a3a;
  flex-shrink: 0;
}

.stat-text {
  font-size: 12px;
  color: #6b7280;
}

/* Buttons */
.btn-primary {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #16a34a;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  padding: 7px 14px;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-primary:hover { background: #15803d; }

.btn-ghost {
  background: none;
  border: 1px solid #2a2a3a;
  border-radius: 6px;
  color: #6b7280;
  font-size: 12px;
  padding: 4px 10px;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}

.btn-ghost:hover { color: #d1d5db; border-color: #3a3a4f; }

/* Error */
.error-box {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 16px;
  padding: 12px 14px;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  color: #fca5a5;
  font-size: 13px;
  line-height: 1.6;
}

.error-box svg { flex-shrink: 0; margin-top: 1px; color: #ef4444; }

/* Tabs */
.tabs {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 8px 14px 0;
  border-bottom: 1px solid #2a2a3a;
  flex-shrink: 0;
}

.tab {
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: #6b7280;
  font-size: 13px;
  font-weight: 500;
  padding: 6px 12px;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
  margin-bottom: -1px;
}

.tab:hover { color: #d1d5db; }
.tab.active { color: #4ade80; border-bottom-color: #4ade80; }

.tabs-spacer { flex: 1; }

.copy-btn { margin-bottom: 8px; }

.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 700;
  margin-left: 5px;
}

.tab-badge-error   { background: rgba(239,68,68,0.2);  color: #fca5a5; }
.tab-badge-warning { background: rgba(234,179,8,0.2);  color: #fde68a; }

/* Placeholder */
.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 16px;
  color: #3a3a4f;
  font-size: 14px;
  text-align: center;
  line-height: 1.7;
}

/* Output areas */
.output-area {
  flex: 1;
  overflow: auto;
  padding: 14px;
}

.formatted-area {
  padding: 0;
}

.code-with-lines {
  padding: 14px 0;
  min-height: 100%;
}

.code-line {
  display: flex;
  align-items: baseline;
  line-height: 1.7;
  padding: 0 14px 0 0;
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  font-size: 13px;
}

.code-line:hover { background: rgba(255,255,255,0.025); }

.line-num {
  min-width: 42px;
  padding: 0 12px 0 14px;
  text-align: right;
  color: #3a3a4f;
  font-size: 12px;
  user-select: none;
  flex-shrink: 0;
}

.line-content { flex: 1; white-space: pre; }

.tree-area {
  padding: 10px 14px;
}

.summary-area {
  padding: 14px;
}

/* Indent selector */
.indent-selector {
  display: flex;
  align-items: center;
  border: 1px solid #2a2a3a;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 8px;
}

.indent-btn {
  background: none;
  border: none;
  border-right: 1px solid #2a2a3a;
  color: #6b7280;
  font-size: 11px;
  font-weight: 500;
  padding: 4px 9px;
  cursor: pointer;
  transition: background 0.1s, color 0.1s;
  white-space: nowrap;
}

.indent-btn:last-child { border-right: none; }
.indent-btn:hover { color: #d1d5db; background: #1c1c26; }
.indent-btn.active { background: #2a2a3a; color: #4ade80; font-weight: 600; }

/* Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: #1c1c26;
  border: 1px solid #2a2a3a;
  border-radius: 10px;
  width: 580px;
  max-width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0,0,0,0.6);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #2a2a3a;
  flex-shrink: 0;
}

.modal-header h2 {
  font-size: 15px;
  font-weight: 700;
  color: #f0f0f5;
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  color: #6b7280;
  font-size: 16px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: color 0.15s;
}

.modal-close:hover { color: #d1d5db; }

.modal-body {
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  font-size: 13px;
  color: #9ca3af;
  line-height: 1.7;
}

.modal-body section h3 {
  font-size: 12px;
  font-weight: 700;
  color: #4ade80;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 0 0 8px;
}

.modal-body p { margin: 0; }

.modal-body ul {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.modal-body code {
  background: #2a2a3a;
  border-radius: 3px;
  padding: 1px 5px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: #86efac;
}

.modal-body strong {
  color: #d1d5db;
  font-weight: 600;
}

/* Sample dropdown */
.sample-dropdown-wrap {
  position: relative;
}

.sample-btn {
  white-space: nowrap;
}

.sample-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  background: #1c1c26;
  border: 1px solid #2a2a3a;
  border-radius: 7px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  z-index: 100;
  min-width: 160px;
  overflow: hidden;
}

.sample-item {
  display: block;
  width: 100%;
  background: none;
  border: none;
  border-bottom: 1px solid #2a2a3a;
  color: #d1d5db;
  font-size: 13px;
  padding: 9px 14px;
  text-align: left;
  cursor: pointer;
  transition: background 0.1s;
}

.sample-item:last-child { border-bottom: none; }
.sample-item:hover { background: #2a2a3a; color: #4ade80; }
</style>

<style>
/* Syntax highlight classes — unscoped because injected via v-html */
.code-with-lines .hl-block       { color: #4ade80; font-weight: 700; }
.code-with-lines .hl-key         { color: #60a5fa; }
.code-with-lines .hl-value       { color: #d1d5db; }
.code-with-lines .hl-param       { color: #86efac; }
.code-with-lines .hl-punct       { color: #4b5563; }
.code-with-lines .hl-comment     { color: #6b7280; font-style: italic; }
.code-with-lines .hl-include-kw  { color: #f59e0b; font-weight: 700; }
.code-with-lines .hl-include-path{ color: #fcd34d; }
.code-with-lines .hl-warn        { color: #f59e0b; font-size: 11px; }
</style>
