<template>
  <div class="loc-view">

    <!-- Toolbar: URL Test -->
    <div class="global-test-panel">
      <div class="global-test-header">{{ t('global_test_title') }}</div>
      <div class="global-input-wrap">
        <div class="match-input-row">
          <input
            v-model="globalUrl"
            class="match-input"
            :placeholder="t('global_test_placeholder')"
            spellcheck="false"
            @keydown.enter="doGlobalTest"
            @input="globalResult = null"
          />
          <button class="btn-test" @click="doGlobalTest">{{ t('btn_test') }}</button>
          <button v-if="globalResult" class="btn-clear" @click="globalResult = null; globalUrl = ''">✕</button>
        </div>
      </div>
      <div v-if="globalResult" class="global-results">
        <div v-if="globalResult.results.length === 0" class="global-miss">
          {{ t('global_no_match') }}
        </div>
        <div
          v-for="(r, i) in globalResult.results" :key="i"
          class="global-hit"
          :class="{ 'has-line': r.locResult && r.srv.locations[r.locResult.index]?.node?.line }"
          @click="r.locResult && jumpToLine && jumpToLine(r.srv.locations[r.locResult.index]?.node?.line)"
        >
          <div class="global-hit-server">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            server: <span class="hl-server-name">{{ r.srv.serverNames.join(', ') || '(unnamed)' }}</span>
            <span class="hl-listen">(listen {{ r.srv.listens.join(', ') || '-' }})</span>
          </div>
          <div class="global-hit-detail">server_name: {{ r.snResult.reason }}</div>
          <div class="global-hit-detail">
            <template v-if="r.locResult">
              location <span class="hl-loc-path">{{ r.srv.locations[r.locResult.index]?.path }}</span>
              — {{ r.locResult.reason }}
            </template>
            <template v-else>{{ t('loc_no_match') }}</template>
          </div>
        </div>
      </div>
    </div>

    <!-- Search bar (always visible) -->
    <div class="search-bar">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input
        ref="searchInputRef"
        v-model="searchQuery"
        class="search-input"
        :placeholder="t('search_placeholder')"
        spellcheck="false"
        @keydown.escape="clearSearch"
      />
      <span v-if="searchQuery" class="search-count">
        {{ t('search_count', { n: searchMatchCount }) }}
      </span>
      <button v-if="searchQuery" class="btn-clear" @click="searchQuery = ''">✕</button>
    </div>

    <div v-if="servers.length === 0" class="empty">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3a3a4f" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
      <p>{{ t('loc_empty') }}</p>
    </div>

    <div
      v-for="(srv, si) in servers" :key="si"
      v-show="!searchQuery || filteredLocs[si]?.length > 0"
      class="server-block"
    >
      <!-- Server header (clickable to expand/collapse) -->
      <div class="server-header" @click="toggleServer(si)">
        <span class="expand-icon">{{ expandedServers[si] ? '▾' : '▸' }}</span>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        <span class="server-name">{{ srv.serverNames.join(', ') || '(unnamed)' }}</span>
        <span v-if="srv.listens.length" class="server-listen">{{ srv.listens.join(', ') }}</span>
        <span class="loc-count-badge">
          {{ searchQuery ? `${filteredLocs[si]?.length ?? 0} / ` : '' }}{{ t('loc_count', { n: srv.locations.length }) }}
        </span>
      </div>

      <template v-if="expandedServers[si]">
        <!-- Location list -->
        <div v-if="srv.locations.length === 0" class="no-locations">{{ t('no_locations') }}</div>
        <div v-else class="location-list">
          <div
            v-for="(loc, li) in annotated[si]"
            :key="li"
            v-show="!searchQuery || isLocMatch(loc)"
            class="location-row"
            :class="{
              'loc-duplicate': loc.duplicate,
              'has-line': loc.node?.line,
              'loc-expanded': expandedLocs[`${si}-${li}`],
            }"
            @click="jumpToLine && loc.node?.line && jumpToLine(loc.node.line)"
          >
            <div class="loc-main">
              <!-- Modifier badge -->
              <span
                class="modifier-badge"
                :style="{ color: modInfo(loc.modifier).color, borderColor: modInfo(loc.modifier).color + '55' }"
              >{{ modInfo(loc.modifier).symbol || '∅' }}</span>

              <!-- Type icon -->
              <span v-if="locHasDirective(loc.node, 'proxy_pass')" class="loc-type-icon loc-icon-proxy" title="proxy_pass — 다른 서버로 전달">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              </span>
              <span v-else-if="locHasDirective(loc.node, 'alias')" class="loc-type-icon loc-icon-alias" title="alias — 파일시스템 경로로 대체">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
              </span>

              <!-- Path -->
              <span class="loc-path">{{ loc.path }}</span>

              <!-- Duplicate indicator -->
              <span v-if="loc.duplicate" class="dup-tag">{{ t('dup_tag') }}</span>

              <!-- Expand button -->
              <button
                v-if="getLocDetails(loc.node).length"
                class="loc-expand-btn"
                :class="{ active: expandedLocs[`${si}-${li}`] }"
                @click.stop="toggleLoc(si, li)"
              >{{ expandedLocs[`${si}-${li}`] ? t('btn_close') : t('btn_detail') }}</button>

              <!-- Delete button -->
              <button
                v-if="deleteNode && loc.node"
                class="loc-delete-btn"
                @click.stop="confirmDelete(loc.node, loc.path)"
              >{{ t('btn_delete') }}</button>
            </div>
            <div class="loc-meta">
              <span class="eval-note">{{ loc.evalNote }}</span>
              <span class="modifier-label" :style="{ color: modInfo(loc.modifier).color }">{{ modInfo(loc.modifier).label }}</span>
            </div>

            <!-- Inline detail expansion -->
            <div v-if="expandedLocs[`${si}-${li}`]" class="loc-detail" @click.stop>
              <div v-for="(item, di) in getLocDetails(loc.node)" :key="di" class="loc-detail-row">
                <span
                  class="loc-detail-key"
                  :class="{ 'key-has-doc': DIRECTIVE_DOCS[item.name] }"
                  @mouseenter="showTooltip(item.name, $event)"
                  @mouseleave="hideTooltip"
                >{{ item.name }}</span>
                <span class="loc-detail-val">{{ item.value }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Directive Tooltip -->
    <Teleport to="body">
      <div
        v-if="tooltip"
        class="dir-tooltip"
        :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
        @mouseenter="cancelHide"
        @mouseleave="hideTooltip"
      >
        <div class="dir-tooltip-desc">{{ tooltip.desc }}</div>
        <div v-if="tooltip.default" class="dir-tooltip-default">{{ t('default_label') }} <code>{{ tooltip.default }}</code></div>
        <div v-if="!tooltip.doc" class="dir-tooltip-na">{{ t('doc_na') }}</div>
        <a v-else :href="tooltip.doc" target="_blank" class="dir-tooltip-link">{{ t('doc_link') }}</a>
      </div>
    </Teleport>

    <!-- Delete Confirm Modal -->
    <Teleport to="body">
      <div v-if="deleteTarget" class="delete-modal-overlay" @click.self="cancelDelete">
        <div class="delete-modal">
          <div class="delete-modal-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            <span>{{ t('delete_modal_title') }}</span>
          </div>
          <div class="delete-modal-body">
            <p class="delete-modal-desc">{{ t('delete_modal_desc') }}</p>
            <div class="delete-modal-path">{{ deleteTarget?.path }}</div>
            <p class="delete-modal-warn">{{ t('delete_modal_warn') }}</p>
          </div>
          <div class="delete-modal-actions">
            <button class="delete-modal-cancel" @click="cancelDelete">{{ t('btn_cancel') }}</button>
            <button class="delete-modal-confirm" @click="doDelete">{{ t('btn_delete') }}</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Legend -->
    <div class="legend">
      <span class="legend-title">{{ t('legend_priority') }}</span>
      <span v-for="(info, mod) in MODIFIER_LABELS" :key="mod" class="legend-item" :style="{ color: info.color }">
        <code>{{ info.symbol || '∅' }}</code> {{ info.label }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, inject } from 'vue'
import { useI18n } from '../i18n/index.js'
import { analyzeLocations, matchLocation, annotateEvaluationOrder, MODIFIER_LABELS } from '../utils/locationAnalyzer.js'
import { DIRECTIVE_DOCS } from '../utils/directiveDocs.js'

const { t } = useI18n()

const props = defineProps({
  ast: { type: Array, required: true },
})

const jumpToLine = inject('jumpToLine', null)
const deleteNode = inject('deleteNode', null)
const deleteTarget = ref(null)

function confirmDelete(node, path) {
  if (!deleteNode) return
  deleteTarget.value = { node, path }
}

function doDelete() {
  if (!deleteTarget.value) return
  deleteNode(deleteTarget.value.node)
  deleteTarget.value = null
}

function cancelDelete() {
  deleteTarget.value = null
}

const servers    = computed(() => analyzeLocations(props.ast))
const annotated  = computed(() => servers.value.map(srv => annotateEvaluationOrder(srv.locations)))
const expandedServers = ref({})
const expandedLocs = ref({})
const globalUrl = ref('')
const globalResult = ref(null)

// ── Location 검색 ──────────────────────────────────────────
const searchQuery = ref('')
const searchInputRef = ref(null)

function clearSearch() {
  searchQuery.value = ''
  searchInputRef.value?.focus()
}

function locMatchesQuery(loc, q) {
  if (!q) return true
  const lower = q.toLowerCase()
  // path 매칭
  if (loc.path.toLowerCase().includes(lower)) return true
  // directive 값 매칭 (proxy_pass, alias 등)
  if (loc.node?.children) {
    for (const child of loc.node.children) {
      if (child.type === 'directive') {
        if (child.name.toLowerCase().includes(lower)) return true
        if (child.values.some(v => v.toLowerCase().includes(lower))) return true
      }
    }
  }
  return false
}

function isLocMatch(loc) {
  return locMatchesQuery(loc, searchQuery.value)
}

const filteredLocs = computed(() => {
  const q = searchQuery.value
  return servers.value.map(srv =>
    srv.locations.filter(loc => locMatchesQuery(loc, q))
  )
})

const searchMatchCount = computed(() =>
  filteredLocs.value.reduce((sum, locs) => sum + locs.length, 0)
)

// 검색어 입력 시 모든 서버 블록 자동 펼침
watch(searchQuery, (q) => {
  if (q) {
    const next = {}
    servers.value.forEach((_, i) => { next[i] = true })
    expandedServers.value = next
  }
})

const LOC_TRACKED_DIRECTIVES = [
  // 프록시
  'proxy_pass', 'proxy_set_header', 'proxy_hide_header', 'proxy_pass_header',
  'proxy_cookie_path', 'proxy_cookie_domain',
  'proxy_connect_timeout', 'proxy_read_timeout', 'proxy_send_timeout',
  'proxy_buffering', 'proxy_buffer_size', 'proxy_buffers', 'proxy_busy_buffers_size',
  'proxy_cache', 'proxy_cache_valid', 'proxy_cache_bypass', 'proxy_no_cache',
  'proxy_redirect', 'proxy_http_version', 'proxy_intercept_errors',
  'proxy_next_upstream', 'proxy_request_buffering', 'proxy_ignore_headers',
  'proxy_set_body', 'proxy_limit_rate',
  'proxy_ssl_protocols', 'proxy_ssl_verify',
  // 파일 서빙
  'root', 'alias', 'try_files', 'autoindex', 'index', 'expires',
  // 응답 제어
  'return', 'rewrite', 'add_header',
  // FastCGI
  'fastcgi_pass', 'fastcgi_index',
  // 접근 제어
  'limit_req', 'limit_conn', 'deny', 'allow', 'auth_basic', 'auth_basic_user_file',
  // 로그
  'access_log', 'error_log',
]

function locHasDirective(node, name) {
  return node?.children?.some(c => c.type === 'directive' && c.name === name) ?? false
}

function getLocDetails(node) {
  if (!node?.children) return []
  const tracked = new Set(LOC_TRACKED_DIRECTIVES)
  const items = []
  for (const child of node.children) {
    if (child.type === 'directive' && tracked.has(child.name)) {
      items.push({ name: child.name, value: child.values.join(' ') })
    }
  }
  return items
}

function toggleLoc(si, li) {
  const key = `${si}-${li}`
  expandedLocs.value = { ...expandedLocs.value, [key]: !expandedLocs.value[key] }
}

const tooltip = ref(null)
let hideTimer = null

function showTooltip(name, event) {
  const info = DIRECTIVE_DOCS[name]
  const rect = event.currentTarget.getBoundingClientRect()
  cancelHide()
  tooltip.value = {
    desc: info?.desc ?? 'N/A',
    default: info?.default ?? null,
    doc: info?.doc ?? null,
    x: rect.left,
    y: rect.bottom + 6,
  }
}

function hideTooltip() {
  hideTimer = setTimeout(() => { tooltip.value = null }, 100)
}

function cancelHide() {
  if (hideTimer) { clearTimeout(hideTimer); hideTimer = null }
}

function normalizeUrl(raw) {
  if (!/^https?:\/\//i.test(raw)) return 'https://' + raw
  return raw
}

function parseFullUrl(raw) {
  try {
    const u = new URL(normalizeUrl(raw))
    const defaultPort = u.protocol === 'https:' ? '443' : '80'
    return {
      protocol: u.protocol.replace(':', ''),
      hostname: u.hostname,
      port: u.port || defaultPort,
      pathname: u.pathname,
    }
  } catch {
    return { pathname: raw.startsWith('/') ? raw : '/' + raw }
  }
}

function matchServerName(serverNames, hostname) {
  if (!hostname) return { match: true, reason: '호스트 미지정 — 첫 번째 서버 블록 사용' }
  if (serverNames.includes(hostname)) return { match: true, reason: `완전 일치: ${hostname}` }
  for (const name of serverNames) {
    if (name.startsWith('*.') && hostname.endsWith(name.slice(1)))
      return { match: true, reason: `앞 와일드카드: ${name}` }
  }
  for (const name of serverNames) {
    if (name.endsWith('.*') && hostname.startsWith(name.slice(0, -2) + '.'))
      return { match: true, reason: `뒤 와일드카드: ${name}` }
  }
  for (const name of serverNames) {
    if (name.startsWith('~')) {
      try {
        if (new RegExp(name.slice(1)).test(hostname))
          return { match: true, reason: `정규식: ${name}` }
      } catch {}
    }
  }
  return { match: false }
}

function matchListen(listens, protocol, port) {
  if (!protocol) return { match: true, reason: '프로토콜 미지정' }
  for (const listen of listens) {
    const parts = listen.split(/\s+/)
    const addrPart = parts[0]
    const isSSL = parts.some(p => p === 'ssl')
    const listenPort = addrPart.includes(':') ? addrPart.split(':').pop() : addrPart
    if (listenPort === port) {
      if (protocol === 'https' && port === '443' && !isSSL) continue
      return { match: true, reason: `listen ${listen}` }
    }
  }
  return { match: false }
}

function doGlobalTest() {
  if (!globalUrl.value.trim()) return
  globalUrl.value = normalizeUrl(globalUrl.value.trim())
  const parsed = parseFullUrl(globalUrl.value)
  const results = []

  for (let si = 0; si < servers.value.length; si++) {
    const srv = servers.value[si]
    const snResult = matchServerName(srv.serverNames, parsed.hostname)
    if (!snResult.match) continue

    const listenResult = parsed.hostname
      ? matchListen(srv.listens, parsed.protocol, parsed.port)
      : { match: true, reason: '포트 미지정' }
    if (!listenResult.match) continue

    const locResult = matchLocation(srv.locations, parsed.pathname || '/')
    results.push({ si, snResult, listenResult, locResult, srv })
  }

  globalResult.value = { parsed, results }
}

// 서버 목록이 바뀔 때 expandedServers 초기화
watch(servers, (newServers) => {
  const next = {}
  newServers.forEach((_, i) => {
    next[i] = i === 0  // 첫 번째 서버만 펼치고 나머지는 접음
  })
  expandedServers.value = next
  expandedLocs.value = {}
  globalResult.value = null
}, { immediate: true })

function toggleServer(si) {
  expandedServers.value = { ...expandedServers.value, [si]: !expandedServers.value[si] }
}

function modInfo(modifier) {
  return MODIFIER_LABELS[modifier] || { symbol: '?', label: '', color: '#6b7280' }
}

</script>

<style scoped>
.loc-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px 0;
  color: #4b5563;
  font-size: 14px;
  text-align: center;
}

/* Server block */
.server-block {
  background: #16161d;
  border: 1px solid #2a2a3a;
  border-radius: 8px;
  overflow: hidden;
}

.server-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
  background: #1c1c26;
  border-bottom: 1px solid #2a2a3a;
  font-size: 12px;
  color: #9ca3af;
  cursor: pointer;
  user-select: none;
  transition: background 0.1s;
}

.server-header:hover {
  background: #22222e;
}

.expand-icon {
  font-size: 11px;
  color: #6b7280;
  flex-shrink: 0;
  width: 12px;
}

.server-name {
  font-family: monospace;
  font-weight: 700;
  color: #4ade80;
}

.server-listen {
  color: #6b7280;
  font-family: monospace;
  font-size: 11px;
}

.loc-count-badge {
  margin-left: auto;
  background: rgba(74, 222, 128, 0.1);
  color: #16a34a;
  border: 1px solid rgba(74, 222, 128, 0.2);
  border-radius: 10px;
  padding: 1px 8px;
  font-size: 10px;
  font-weight: 600;
  flex-shrink: 0;
}

/* Match tester */
.match-tester {
  padding: 10px 14px;
  border-bottom: 1px solid #2a2a3a;
  background: #0f0f13;
}

.match-input-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.match-prefix {
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  flex-shrink: 0;
}

.match-input {
  flex: 1;
  background: #16161d;
  border: 1px solid #2a2a3a;
  border-radius: 5px;
  color: #d1d5db;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 13px;
  padding: 5px 10px;
  outline: none;
  transition: border-color 0.15s;
}

.match-input:focus { border-color: #4ade80; }

.btn-test {
  background: #16a34a;
  color: #fff;
  border: none;
  border-radius: 5px;
  font-size: 12px;
  font-weight: 600;
  padding: 5px 12px;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s;
}
.btn-test:hover { background: #15803d; }

.btn-clear {
  background: none;
  border: 1px solid #2a2a3a;
  border-radius: 5px;
  color: #6b7280;
  font-size: 13px;
  padding: 4px 8px;
  cursor: pointer;
  flex-shrink: 0;
}

.match-result {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 7px;
  font-size: 12px;
  font-weight: 500;
  padding: 5px 10px;
  border-radius: 5px;
}

.match-hit  { background: rgba(74,222,128,0.1); color: #4ade80; border: 1px solid rgba(74,222,128,0.25); }
.match-miss { background: rgba(239,68,68,0.08); color: #fca5a5; border: 1px solid rgba(239,68,68,0.2); }

.extracted-path {
  margin-left: auto;
  font-size: 11px;
  opacity: 0.7;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}

/* Location list */
.no-locations {
  padding: 12px 14px;
  font-size: 13px;
  color: #4b5563;
}

.location-list {
  display: flex;
  flex-direction: column;
}

.location-row {
  padding: 8px 14px;
  border-bottom: 1px solid #1e1e28;
  transition: background 0.1s;
}
.location-row:last-child { border-bottom: none; }
.location-row:hover { background: rgba(255,255,255,0.025); }
.location-row.has-line { cursor: pointer; }

.location-row.loc-matched {
  background: rgba(74,222,128,0.07);
  border-left: 3px solid #4ade80;
  padding-left: 11px;
}

.location-row.loc-duplicate {
  background: rgba(251,146,60,0.05);
}

.loc-main {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 13px;
}

.modifier-badge {
  display: inline-block;
  min-width: 22px;
  text-align: center;
  padding: 1px 5px;
  border: 1px solid;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}

.loc-path { color: #e5e7eb; word-break: break-all; }

.matched-tag {
  background: rgba(74,222,128,0.15);
  color: #4ade80;
  border-radius: 4px;
  padding: 1px 7px;
  font-size: 11px;
  font-family: sans-serif;
  font-weight: 600;
  margin-left: auto;
  flex-shrink: 0;
}

.dup-tag {
  background: rgba(251,146,60,0.15);
  color: #fb923c;
  border-radius: 4px;
  padding: 1px 7px;
  font-size: 11px;
  font-family: sans-serif;
  font-weight: 600;
  flex-shrink: 0;
}

.loc-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 3px;
  font-size: 11px;
  font-family: sans-serif;
}

.eval-note { color: #6b7280; }
.modifier-label { font-weight: 500; }

/* Type icons */
.loc-type-icon {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.loc-icon-proxy { color: #60a5fa; }
.loc-icon-alias { color: #34d399; }

/* Expand button */
.loc-expand-btn {
  margin-left: auto;
  background: none;
  border: 1px solid rgba(167,139,250,0.25);
  border-radius: 4px;
  color: #4ade80;
  font-size: 11px;
  font-weight: 600;
  padding: 1px 8px;
  cursor: pointer;
  flex-shrink: 0;
  transition: color 0.1s, border-color 0.1s, background 0.1s;
  line-height: 1.6;
}
.loc-expand-btn:hover,
.loc-expand-btn.active {
  color: #86efac;
  border-color: rgba(167,139,250,0.5);
  background: rgba(167,139,250,0.1);
}

/* Delete button */
.loc-delete-btn {
  background: none;
  border: 1px solid rgba(248, 113, 113, 0.25);
  border-radius: 4px;
  color: #f87171;
  font-size: 11px;
  font-weight: 600;
  padding: 1px 8px;
  cursor: pointer;
  flex-shrink: 0;
  transition: color 0.1s, border-color 0.1s, background 0.1s;
  line-height: 1.6;
}
.loc-delete-btn:hover {
  color: #fca5a5;
  border-color: rgba(248, 113, 113, 0.5);
  background: rgba(248, 113, 113, 0.1);
}

/* Inline detail */
.loc-detail {
  margin-top: 8px;
  padding: 8px 10px;
  background: #0f0f13;
  border: 1px solid #2a2a3a;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.loc-detail-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
  font-size: 12px;
  line-height: 1.5;
}

.loc-detail-key {
  color: #60a5fa;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 11px;
  flex-shrink: 0;
  min-width: 140px;
}

.key-has-doc {
  cursor: help;
  border-bottom: 1px dashed #4b5563;
}
.key-has-doc:hover {
  color: #93c5fd;
  border-bottom-color: #60a5fa;
}

.loc-detail-val {
  color: #d1d5db;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 11px;
  word-break: break-all;
}

/* Search bar */
.search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #16161d;
  border: 1px solid #2a2a3a;
  border-radius: 8px;
}

.search-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: #d1d5db;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  min-width: 0;
}
.search-input::placeholder { color: #3a3a4f; }

.search-count {
  font-size: 11px;
  color: #4ade80;
  white-space: nowrap;
  font-family: 'JetBrains Mono', monospace;
}

/* Global test panel */
.global-test-panel {
  background: #16161d;
  border: 1px solid #2a2a3a;
  border-radius: 8px;
  overflow: hidden;
}

.global-input-wrap {
  padding: 10px 14px;
  border-bottom: 1px solid #2a2a3a;
  background: #0f0f13;
}

.global-test-header {
  padding: 8px 14px;
  background: #1c1c26;
  border-bottom: 1px solid #2a2a3a;
  font-size: 11px;
  font-weight: 700;
  color: #4ade80;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.global-results {
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.global-miss {
  font-size: 13px;
  color: #fca5a5;
  padding: 6px 10px;
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.2);
  border-radius: 6px;
}

.global-hit {
  padding: 8px 12px;
  background: rgba(74,222,128,0.07);
  border: 1px solid rgba(74,222,128,0.2);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
}

.global-hit.has-line {
  cursor: pointer;
}

.global-hit.has-line:hover {
  background: rgba(74, 222, 128, 0.05);
  border-color: rgba(74, 222, 128, 0.2);
}

.global-hit-server {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #4ade80;
  font-weight: 600;
}

.hl-server-name {
  font-family: 'JetBrains Mono', monospace;
  color: #4ade80;
}

.hl-listen {
  color: #6b7280;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
}

.global-hit-detail {
  color: #9ca3af;
  padding-left: 18px;
  font-family: sans-serif;
}

.hl-loc-path {
  font-family: 'JetBrains Mono', monospace;
  color: #60a5fa;
}

/* Legend */
.legend {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 16px;
  padding: 10px 14px;
  background: #16161d;
  border: 1px solid #2a2a3a;
  border-radius: 8px;
  font-size: 12px;
}

.legend-title {
  color: #6b7280;
  font-weight: 600;
  flex-shrink: 0;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.legend-item code {
  font-family: monospace;
  font-size: 12px;
  font-weight: 700;
}
</style>

<style>
.dir-tooltip {
  position: fixed;
  z-index: 9999;
  background: #1c1c26;
  border: 1px solid #3a3a4f;
  border-radius: 8px;
  padding: 10px 13px;
  max-width: 300px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}

.dir-tooltip-desc {
  font-size: 12px;
  color: #d1d5db;
  line-height: 1.6;
  margin-bottom: 6px;
}

.dir-tooltip-default {
  font-size: 11px;
  color: #6b7280;
  margin-bottom: 6px;
}

.dir-tooltip-default code {
  background: #2a2a3a;
  border-radius: 3px;
  padding: 1px 5px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: #86efac;
}

.dir-tooltip-na {
  font-size: 11px;
  color: #4b5563;
}

.dir-tooltip-link {
  display: inline-block;
  font-size: 11px;
  color: #4ade80;
  text-decoration: none;
}

.dir-tooltip-link:hover {
  text-decoration: underline;
}

/* Delete confirm modal */
.delete-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(2px);
}

.delete-modal {
  background: #1c1c26;
  border: 1px solid #3a3a4f;
  border-radius: 12px;
  width: 360px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7);
  overflow: hidden;
}

.delete-modal-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 18px;
  background: #16161d;
  border-bottom: 1px solid #2a2a3a;
  font-size: 14px;
  font-weight: 700;
  color: #f87171;
  letter-spacing: 0.02em;
}

.delete-modal-body {
  padding: 18px 18px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.delete-modal-desc {
  font-size: 13px;
  color: #9ca3af;
  margin: 0;
}

.delete-modal-path {
  background: #0f0f13;
  border: 1px solid #2a2a3a;
  border-radius: 6px;
  padding: 8px 12px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 13px;
  color: #60a5fa;
  word-break: break-all;
}

.delete-modal-warn {
  font-size: 11px;
  color: #6b7280;
  margin: 0;
}

.delete-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 18px 16px;
  border-top: 1px solid #2a2a3a;
}

.delete-modal-cancel {
  background: none;
  border: 1px solid #2a2a3a;
  border-radius: 6px;
  color: #9ca3af;
  font-size: 13px;
  font-weight: 600;
  padding: 7px 18px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.delete-modal-cancel:hover {
  background: #2a2a3a;
  color: #d1d5db;
}

.delete-modal-confirm {
  background: rgba(248, 113, 113, 0.15);
  border: 1px solid rgba(248, 113, 113, 0.4);
  border-radius: 6px;
  color: #f87171;
  font-size: 13px;
  font-weight: 700;
  padding: 7px 18px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.delete-modal-confirm:hover {
  background: rgba(248, 113, 113, 0.25);
  border-color: rgba(248, 113, 113, 0.6);
  color: #fca5a5;
}
</style>
