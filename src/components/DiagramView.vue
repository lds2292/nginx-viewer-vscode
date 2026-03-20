<template>
  <div class="diagram-wrap">

    <!-- Empty state -->
    <div v-if="!data.servers.length" class="empty">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3a3a4f" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="3" width="8" height="10" rx="1"/>
        <rect x="14" y="11" width="8" height="10" rx="1"/>
        <path d="M10 8h2a1 1 0 0 1 1 1v5"/>
      </svg>
      <p>{{ t('diagram_empty') }}</p>
    </div>

    <template v-else>
      <!-- Toolbar -->
      <div class="diagram-toolbar">
        <span class="toolbar-stat">
          {{ t('diagram_stat', { s: data.servers.length, b: data.backends.length }) }}
        </span>
        <div class="toolbar-zoom">
          <button class="zoom-btn" @click="zoomOut" title="Zoom out">−</button>
          <span class="zoom-pct">{{ Math.round(vpScale * 100) }}%</span>
          <button class="zoom-btn" @click="zoomIn" title="Zoom in">+</button>
          <button class="zoom-btn zoom-reset" @click="resetView" title="Reset view">↺</button>
        </div>
        <div class="toolbar-legend">
          <span class="leg"><span class="leg-dot" style="background:#f59e0b"></span>HTTPS</span>
          <span class="leg"><span class="leg-dot" style="background:#4ade80"></span>HTTP</span>
          <span class="leg">📁 Static &nbsp;|&nbsp; 📋 include</span>
        </div>
      </div>

      <!-- Diagram viewport with zoom/pan -->
      <div
        ref="viewportRef"
        class="diagram-viewport"
        :class="{ 'is-panning': panning }"
        @wheel.prevent="onViewportWheel"
        @mousedown="onViewportMouseDown"
        @mousemove="onViewportMouseMove"
        @mouseup="onViewportMouseUp"
        @mouseleave="onViewportMouseUp"
      >
        <div :style="transformStyle">
          <div class="diagram-stage" :style="{ width: CANVAS_W + 'px', height: layout.h + 'px' }" @click="selectedId = null">

          <!-- Column headers -->
          <div class="col-hdr" :style="{ left: SRV_X + 'px', width: SRV_W + 'px' }">{{ t('col_vhosts') }}</div>
          <div class="col-hdr" :style="{ left: BK_X + 'px',  width: BK_W + 'px'  }">{{ t('col_backends') }}</div>

          <!-- SVG: connection lines (below HTML nodes) -->
          <svg class="stage-svg" :width="CANVAS_W" :height="layout.h">
            <defs>
              <marker
                v-for="(c, ci) in COLORS" :key="ci"
                :id="`darr-${ci}`"
                markerWidth="7" markerHeight="7"
                refX="6" refY="3.5" orient="auto"
              >
                <path d="M0,0 L7,3.5 L0,7 Z" :fill="c"/>
              </marker>
            </defs>

            <!-- Pass 1: dimmed / normal connections (rendered first = below) -->
            <g
              v-for="(conn, ci) in inactiveConns" :key="`bg-${ci}`"
              class="conn-g"
              :class="connHighlight(conn)"
              @mouseenter="onConnEnter(conn, $event)"
              @mousemove="onConnMove($event)"
              @mouseleave="onConnLeave"
            >
              <path :d="conn.d" fill="none" stroke="transparent" stroke-width="16"/>
              <path
                :d="conn.d"
                fill="none"
                :stroke="conn.color"
                :stroke-width="1.5"
                :stroke-opacity="connHighlight(conn) === 'dimmed' ? 0.1 : 0.55"
                :marker-end="`url(#darr-${conn.colorIdx})`"
              />
              <circle :cx="conn.mx" :cy="conn.my" r="11" fill="#16161d" :stroke="conn.color" stroke-width="1.5"
                :stroke-opacity="connHighlight(conn) === 'dimmed' ? 0.15 : 0.7"/>
              <text
                :x="conn.mx" :y="conn.my + 4"
                text-anchor="middle"
                :fill="conn.color"
                :fill-opacity="connHighlight(conn) === 'dimmed' ? 0.2 : 1"
                font-size="10"
                font-family="'JetBrains Mono', monospace"
                font-weight="700"
              >{{ conn.paths.length }}</text>
            </g>

            <!-- Pass 2: active connections (rendered last = always on top) -->
            <g
              v-for="(conn, ci) in activeConns" :key="`fg-${ci}`"
              class="conn-g active"
              @mouseenter="onConnEnter(conn, $event)"
              @mousemove="onConnMove($event)"
              @mouseleave="onConnLeave"
            >
              <path :d="conn.d" fill="none" stroke="transparent" stroke-width="16"/>
              <path
                :d="conn.d"
                fill="none"
                :stroke="conn.color"
                stroke-width="2.5"
                stroke-opacity="0.9"
                :marker-end="`url(#darr-${conn.colorIdx})`"
              />
              <circle :cx="conn.mx" :cy="conn.my" r="11" fill="#16161d" :stroke="conn.color" stroke-width="1.5" stroke-opacity="0.9"/>
              <text
                :x="conn.mx" :y="conn.my + 4"
                text-anchor="middle"
                :fill="conn.color"
                font-size="10"
                font-family="'JetBrains Mono', monospace"
                font-weight="700"
              >{{ conn.paths.length }}</text>
            </g>
          </svg>

          <!-- Server (Virtual Host) nodes -->
          <div
            v-for="srv in layout.servers" :key="srv.id"
            class="dg-node srv-node"
            :class="[{ 'is-ssl': srv.isSSL, 'has-no-conn': !srv.connections.length }, nodeClass(srv)]"
            :style="nodeStyle(srv)"
            @click.stop="selectNode(srv.id)"
          >
            <div class="node-ports">
              <span
                v-for="p in srv.listens" :key="p"
                class="port-tag"
                :class="{ ssl: isSslPort(p) }"
              >{{ p }}</span>
            </div>
            <div class="node-names">
              <div v-for="name in srv.serverNames" :key="name" class="srv-name">{{ name }}</div>
            </div>
            <div class="node-badges">
              <span v-if="srv.hasStatic"  class="nbadge">📁 static</span>
              <span v-if="srv.hasInclude" class="nbadge">📋 include</span>
              <span v-if="!srv.connections.length" class="nbadge nbadge-standalone">standalone</span>
            </div>
          </div>

          <!-- Backend nodes -->
          <div
            v-for="bk in layout.backends" :key="bk.id"
            class="dg-node bk-node"
            :class="nodeClass(bk)"
            :style="{ ...nodeStyle(bk), borderLeftColor: bk.color }"
            @click.stop="selectNode(bk.id)"
          >
            <div class="bk-type" :style="{ color: bk.color }">
              <template v-if="bk.type === 'alias'">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                alias
              </template>
              <template v-else>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                {{ bk.isUpstream ? 'upstream' : 'backend' }}
              </template>
            </div>
            <div class="bk-host">{{ bk.host }}</div>
            <div v-if="bk.isUpstream" class="bk-upstream-toggle" @click.stop="toggleUpstream(bk.id)">
              <span>{{ bk.upstreamServers.length }} servers</span>
              <span class="toggle-icon">{{ expandedUpstreams.has(bk.id) ? '▲' : '▼' }}</span>
            </div>
            <div v-if="bk.isUpstream && expandedUpstreams.has(bk.id)" class="bk-members">
              <div v-for="s in bk.upstreamServers" :key="s" class="bk-member">{{ s }}</div>
            </div>
          </div>

          </div>
        </div>
      </div>

      <!-- Detail panel -->
      <transition name="dp-fade">
        <div v-if="selectedNode" class="detail-panel">
          <button class="dp-close" @click="selectedId = null">✕</button>

          <!-- Server detail -->
          <template v-if="selectedNode.kind === 'server'">
            <div class="dp-head">
              <div class="dp-names">
                <span v-for="n in selectedNode.node.serverNames" :key="n" class="dp-name">{{ n }}</span>
              </div>
              <div class="dp-ports">
                <span v-for="p in selectedNode.node.listens" :key="p" class="port-tag" :class="{ ssl: isSslPort(p) }">{{ p }}</span>
              </div>
            </div>
            <div v-if="selectedNode.node.locations && selectedNode.node.locations.length" class="dp-section">
              <div class="dp-section-title">Locations ({{ selectedNode.node.locations.length }})</div>
              <div v-for="loc in selectedNode.node.locations" :key="loc.path" class="dp-loc-row">
                <span class="dp-loc-modifier" :class="`mod-${loc.modifier ?? 'prefix'}`">
                  <span class="mod-sym">{{ modInfo(loc.modifier).symbol || '∅' }}</span>
                  <span class="mod-lbl">{{ modInfo(loc.modifier).label }}</span>
                </span>
                <span class="dp-loc-path">{{ loc.cleanPath ?? loc.path }}</span>
                <span class="dp-loc-badge" :class="`loc-${loc.type}`">{{ loc.type }}</span>
                <span v-if="loc.target" class="dp-loc-target">{{ loc.target }}</span>
              </div>
            </div>
          </template>

          <!-- Backend detail -->
          <template v-else-if="selectedNode.kind === 'backend'">
            <div class="dp-head">
              <span class="dp-bk-badge">{{ selectedNode.node.isUpstream ? 'upstream' : selectedNode.node.type }}</span>
              <span class="dp-bk-host">{{ selectedNode.node.host }}</span>
            </div>
            <div v-if="selectedNode.node.isUpstream && selectedNode.node.upstreamServers.length" class="dp-section">
              <div class="dp-section-title">Members ({{ selectedNode.node.upstreamServers.length }})</div>
              <div v-for="s in selectedNode.node.upstreamServers" :key="s" class="dp-member">{{ s }}</div>
            </div>
            <div v-if="selectedNode.usedBy.length" class="dp-section">
              <div class="dp-section-title">Used by</div>
              <div v-for="s in selectedNode.usedBy" :key="s.id" class="dp-usedby-row">
                <span class="dp-usedby-name">{{ s.serverNames[0] }}</span>
                <div class="dp-ports">
                  <span v-for="p in s.listens" :key="p" class="port-tag" :class="{ ssl: isSslPort(p) }">{{ p }}</span>
                </div>
              </div>
            </div>
          </template>
        </div>
      </transition>
    </template>

    <!-- Connection tooltip -->
    <Teleport to="body">
      <div
        v-if="connTooltip"
        class="conn-tooltip"
        :style="{ left: connTooltip.x + 'px', top: connTooltip.y + 'px' }"
      >
        <div class="ct-title">{{ t('conn_tooltip_title', { n: connTooltip.paths.length }) }}</div>
        <div v-for="p in connTooltip.paths" :key="p" class="ct-path">{{ p }}</div>
      </div>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { useI18n } from '../i18n/index.js'
import { extractDiagramData } from '../utils/nginxDiagram.js'
import { MODIFIER_LABELS } from '../utils/locationAnalyzer.js'

const { t } = useI18n()

const props = defineProps({ ast: { type: Array, required: true } })

const data = computed(() => extractDiagramData(props.ast))

// ── Layout constants ────────────────────────────────────────
const CANVAS_W = 860
const SRV_X    = 16
const SRV_W    = 238
const BK_X     = 606
const BK_W     = 238
const HDR_H    = 34
const SRV_GAP  = 10
const BK_GAP   = 10

const PROXY_COLORS = [
  '#4ade80', '#2563eb', '#d97706',
  '#dc2626', '#0891b2', '#c026d3',
]
const ALIAS_COLORS = [
  '#059669', '#10b981', '#34d399', '#6ee7b7',
]
// SVG marker용 flat 배열 (proxy + alias 순서)
const COLORS = [...PROXY_COLORS, ...ALIAS_COLORS]

function bkColor(bk, idx) {
  if (bk.type === 'alias') return ALIAS_COLORS[idx % ALIAS_COLORS.length]
  return PROXY_COLORS[idx % PROXY_COLORS.length]
}

function isSslPort(p) {
  return /\bssl\b/.test(p) || /\b443\b/.test(p)
}

function srvHeight(srv) {
  const portsH  = 26
  const namesH  = srv.serverNames.length * 18
  const badgesH = (srv.hasStatic || srv.hasInclude) ? 20 : 0
  return Math.max(70, portsH + namesH + badgesH + 16)
}

function bkHeight(bk) {
  const expanded = expandedUpstreams.has(bk.id)
  return 60 + (bk.isUpstream && bk.upstreamServers.length && expanded
    ? bk.upstreamServers.length * 16 + 6
    : 0)
}

const layout = computed(() => {
  const { servers, backends } = data.value
  if (!servers.length) return { servers: [], backends: [], connections: [], h: 0 }

  // Server positions
  const srvL = []
  let sy = HDR_H + 8
  for (const srv of servers) {
    const h = srvHeight(srv)
    srvL.push({ ...srv, x: SRV_X, y: sy, w: SRV_W, h })
    sy += h + SRV_GAP
  }

  // Backend positions — proxy/alias별 색상 인덱스 분리
  const bkL = []
  let by = HDR_H + 8
  let proxyIdx = 0, aliasIdx = 0
  for (const bk of backends) {
    const h = bkHeight(bk)
    const typeIdx = bk.type === 'alias' ? aliasIdx++ : proxyIdx++
    const color = bkColor(bk, typeIdx)
    const colorIdx = COLORS.indexOf(color) !== -1 ? COLORS.indexOf(color) : 0
    bkL.push({ ...bk, x: BK_X, y: by, w: BK_W, h, color, colorIdx })
    by += h + BK_GAP
  }

  // Connections (bezier curves)
  const connections = []
  for (const srv of srvL) {
    const total = srv.connections.length
    srv.connections.forEach((conn, ci) => {
      const bk = bkL.find(b => b.id === conn.backendId)
      if (!bk) return

      // Offset connection points vertically when multiple conns from same server
      const step = total > 1 ? Math.min(14, (srv.h - 32) / (total + 1)) : 0
      const oy = (ci - (total - 1) / 2) * step

      const x1 = SRV_X + SRV_W
      const y1 = srv.y + srv.h / 2 + oy
      const x2 = BK_X
      const y2 = bk.y + bk.h / 2
      const cp = 110

      const d = `M ${x1} ${y1} C ${x1 + cp} ${y1}, ${x2 - cp} ${y2}, ${x2} ${y2}`

      connections.push({
        d,
        paths: conn.paths,
        mx: (x1 + x2) / 2,
        my: (y1 + y2) / 2,
        color: bk.color,
        colorIdx: bk.colorIdx,
        serverId: srv.id,
        backendId: bk.id,
      })
    })
  }

  return {
    servers: srvL,
    backends: bkL,
    connections,
    h: Math.max(sy, by) + 20,
  }
})

function nodeStyle(node) {
  return {
    position: 'absolute',
    left: node.x + 'px',
    top:  node.y + 'px',
    width:  node.w + 'px',
    height: node.h + 'px',
  }
}

// ── Zoom / Pan ──────────────────────────────────────────────
const viewportRef = ref(null)
const vpScale     = ref(1)
const vpX         = ref(0)
const vpY         = ref(0)
const panning     = ref(false)
const panOrigin   = ref({ x: 0, y: 0 })

const transformStyle = computed(() => ({
  transform: `translate(${vpX.value}px, ${vpY.value}px) scale(${vpScale.value})`,
  transformOrigin: '0 0',
  willChange: 'transform',
}))

function onViewportWheel(e) {
  const rect = viewportRef.value.getBoundingClientRect()
  const mx = e.clientX - rect.left
  const my = e.clientY - rect.top
  const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
  const newScale = Math.min(2.5, Math.max(0.25, vpScale.value * factor))
  const ratio = newScale / vpScale.value
  vpX.value = mx - (mx - vpX.value) * ratio
  vpY.value = my - (my - vpY.value) * ratio
  vpScale.value = newScale
}

function onViewportMouseDown(e) {
  if (e.button !== 0) return
  if (e.target.closest('.dg-node')) return
  panning.value = true
  panOrigin.value = { x: e.clientX - vpX.value, y: e.clientY - vpY.value }
  e.preventDefault()
}

function onViewportMouseMove(e) {
  if (!panning.value) return
  vpX.value = e.clientX - panOrigin.value.x
  vpY.value = e.clientY - panOrigin.value.y
}

function onViewportMouseUp() {
  panning.value = false
}

function zoomIn() {
  const vp = viewportRef.value
  const cx = vp ? vp.clientWidth / 2 : 0
  const cy = vp ? vp.clientHeight / 2 : 0
  const newScale = Math.min(2.5, vpScale.value * 1.2)
  const ratio = newScale / vpScale.value
  vpX.value = cx - (cx - vpX.value) * ratio
  vpY.value = cy - (cy - vpY.value) * ratio
  vpScale.value = newScale
}

function zoomOut() {
  const vp = viewportRef.value
  const cx = vp ? vp.clientWidth / 2 : 0
  const cy = vp ? vp.clientHeight / 2 : 0
  const newScale = Math.max(0.25, vpScale.value / 1.2)
  const ratio = newScale / vpScale.value
  vpX.value = cx - (cx - vpX.value) * ratio
  vpY.value = cy - (cy - vpY.value) * ratio
  vpScale.value = newScale
}

function resetView() {
  vpScale.value = 1
  vpX.value = 0
  vpY.value = 0
}

// ── Node selection / highlight ──────────────────────────────
const selectedId = ref(null)

const highlightState = computed(() => {
  const id = selectedId.value
  if (!id) return null

  const { connections } = layout.value
  const srvIds = new Set()
  const bkIds  = new Set()

  for (const conn of connections) {
    if (conn.serverId === id || conn.backendId === id) {
      srvIds.add(conn.serverId)
      bkIds.add(conn.backendId)
    }
  }

  return { srvIds, bkIds }
})

function selectNode(id) {
  selectedId.value = selectedId.value === id ? null : id
}

function connHighlight(conn) {
  const hs = highlightState.value
  if (!hs) return 'normal'
  return (hs.srvIds.has(conn.serverId) && hs.bkIds.has(conn.backendId)) ? 'active' : 'dimmed'
}

const activeConns   = computed(() => layout.value.connections.filter(c => connHighlight(c) === 'active'))
const inactiveConns = computed(() => layout.value.connections.filter(c => connHighlight(c) !== 'active'))

function nodeClass(node) {
  const hs = highlightState.value
  if (!hs) return ''
  const inSet = hs.srvIds.has(node.id) || hs.bkIds.has(node.id)
  return inSet ? 'is-active' : 'is-dimmed'
}

// ── Selected node detail ─────────────────────────────────────
const selectedNode = computed(() => {
  const id = selectedId.value
  if (!id) return null

  const srv = layout.value.servers.find(s => s.id === id)
  if (srv) return { kind: 'server', node: srv }

  const bk = layout.value.backends.find(b => b.id === id)
  if (bk) {
    const usedBy = layout.value.servers.filter(s =>
      s.connections.some(c => c.backendId === id)
    )
    return { kind: 'backend', node: bk, usedBy }
  }

  return null
})

// ── Connection tooltip ──────────────────────────────────────
const connTooltip = ref(null)

function onConnEnter(conn, event) {
  connTooltip.value = { paths: conn.paths, x: event.clientX + 14, y: event.clientY + 8 }
}
function onConnMove(event) {
  if (connTooltip.value) {
    connTooltip.value = { ...connTooltip.value, x: event.clientX + 14, y: event.clientY + 8 }
  }
}
function onConnLeave() {
  connTooltip.value = null
}

// ── Upstream toggle ──────────────────────────────────────────
const expandedUpstreams = reactive(new Set())

function toggleUpstream(id) {
  expandedUpstreams.has(id) ? expandedUpstreams.delete(id) : expandedUpstreams.add(id)
}

// ── Location modifier helpers ────────────────────────────────
function modInfo(modifier) {
  return MODIFIER_LABELS[modifier] ?? { symbol: '∅', label: '접두사', color: '#60a5fa' }
}
</script>

<style scoped>
.diagram-wrap {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  padding: 14px;
  box-sizing: border-box;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px 0;
  color: #4b5563;
  font-size: 14px;
}

/* Toolbar */
.diagram-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #16161d;
  border: 1px solid #2a2a3a;
  border-radius: 8px;
  font-size: 12px;
  flex-shrink: 0;
}

.toolbar-stat { color: #6b7280; }

.toolbar-legend {
  display: flex;
  align-items: center;
  gap: 14px;
  color: #6b7280;
}

.leg {
  display: flex;
  align-items: center;
  gap: 5px;
}

.leg-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* Canvas */
.diagram-viewport {
  overflow: hidden;
  position: relative;
  flex: 1;
  min-height: 0;
  border: 1px solid #2a2a3a;
  border-radius: 8px;
  background: #0f0f17;
  cursor: grab;
  user-select: none;
}

.diagram-viewport.is-panning {
  cursor: grabbing;
}

/* Toolbar zoom controls */
.toolbar-zoom {
  display: flex;
  align-items: center;
  gap: 4px;
}

.zoom-btn {
  background: #2a2a3a;
  border: 1px solid #3a3a4f;
  border-radius: 4px;
  color: #9ca3af;
  font-size: 14px;
  line-height: 1;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
}

.zoom-btn:hover {
  background: #3a3a4f;
  color: #d1d5db;
}

.zoom-reset {
  font-size: 13px;
}

.zoom-pct {
  font-size: 11px;
  color: #6b7280;
  min-width: 36px;
  text-align: center;
  font-family: 'JetBrains Mono', monospace;
}

.diagram-stage {
  position: relative;
  flex-shrink: 0;
}

.stage-svg {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
  overflow: visible;
}

.conn-g { cursor: default; }
.conn-g.dimmed { pointer-events: none; }

.col-hdr {
  position: absolute;
  top: 4px;
  font-size: 11px;
  font-weight: 700;
  color: #4b5563;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  text-align: center;
  z-index: 3;
}

/* Nodes */
.dg-node {
  box-sizing: border-box;
  background: #16161d;
  border: 1px solid #2a2a3a;
  border-radius: 8px;
  padding: 8px 10px;
  overflow: hidden;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 4px;
  cursor: pointer;
  transition: opacity 0.15s, box-shadow 0.15s;
}

.dg-node.is-active {
  box-shadow: 0 0 0 2px rgba(74,222,128,0.6);
  opacity: 1;
}

.dg-node.is-dimmed {
  opacity: 0.2;
}

/* Server node */
.srv-node {
  border-left: 3px solid #4ade80;
}
.srv-node.is-ssl {
  border-left-color: #f59e0b;
}

.node-ports {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.port-tag {
  background: #2a2a3a;
  border: 1px solid #3a3a4f;
  border-radius: 4px;
  padding: 1px 5px;
  font-size: 10px;
  font-family: 'JetBrains Mono', monospace;
  color: #4ade80;
  font-weight: 600;
}
.port-tag.ssl {
  color: #f59e0b;
  border-color: rgba(245,158,11,0.4);
  background: rgba(245,158,11,0.08);
}

.node-names {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.srv-name {
  font-size: 12px;
  color: #d1d5db;
  font-family: 'JetBrains Mono', monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.node-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 2px;
}

.nbadge {
  font-size: 10px;
  color: #6b7280;
}

/* Backend node */
.bk-node {
  border-left: 3px solid;
}

.bk-type {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.bk-host {
  font-size: 12px;
  font-family: 'JetBrains Mono', monospace;
  color: #d1d5db;
  word-break: break-all;
}

.bk-members {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px solid #2a2a3a;
}

.bk-member {
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  color: #6b7280;
}

/* Detail panel */
.detail-panel {
  position: relative;
  background: #16161d;
  border: 1px solid #2a2a3a;
  border-radius: 8px;
  padding: 14px 16px;
  font-size: 12px;
}

.dp-close {
  position: absolute;
  top: 10px;
  right: 12px;
  background: none;
  border: none;
  color: #4b5563;
  font-size: 13px;
  cursor: pointer;
  padding: 2px 4px;
  line-height: 1;
}

.dp-close:hover { color: #9ca3af; }

.dp-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 12px;
  padding-right: 24px;
}

.dp-names {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.dp-name {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  font-weight: 700;
  color: #d1d5db;
}

.dp-ports {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.dp-bk-badge {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #4ade80;
  background: rgba(74,222,128,0.1);
  border: 1px solid rgba(74,222,128,0.25);
  border-radius: 4px;
  padding: 2px 7px;
}

.dp-bk-host {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  font-weight: 700;
  color: #d1d5db;
}

.dp-section {
  margin-top: 4px;
}

.dp-section + .dp-section {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #2a2a3a;
}

.dp-section-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #4b5563;
  margin-bottom: 6px;
}

.dp-loc-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 0;
  border-bottom: 1px solid #1e1e2a;
}

.dp-loc-row:last-child { border-bottom: none; }

.dp-loc-path {
  font-family: 'JetBrains Mono', monospace;
  color: #93c5fd;
  min-width: 120px;
  flex-shrink: 0;
}

.dp-loc-badge {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-radius: 3px;
  padding: 1px 5px;
  flex-shrink: 0;
}

.loc-proxy  { background: rgba(74,222,128,0.1);  color: #4ade80; border: 1px solid rgba(74,222,128,0.2); }
.loc-alias  { background: rgba(167,139,250,0.1); color: #a78bfa; border: 1px solid rgba(167,139,250,0.2); }
.loc-static { background: rgba(251,191,36,0.1);  color: #fbbf24; border: 1px solid rgba(251,191,36,0.2); }
.loc-return { background: rgba(248,113,113,0.1); color: #f87171; border: 1px solid rgba(248,113,113,0.2); }
.loc-other  { background: #2a2a3a; color: #6b7280; border: 1px solid #3a3a4f; }

.dp-loc-target {
  font-family: 'JetBrains Mono', monospace;
  color: #6b7280;
  font-size: 11px;
  word-break: break-all;
}

.dp-member {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: #6b7280;
  padding: 2px 0;
}

.dp-usedby-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 0;
}

.dp-usedby-name {
  font-family: 'JetBrains Mono', monospace;
  color: #d1d5db;
  font-size: 12px;
}

/* Feature 5 — static-only server */
.srv-node.has-no-conn {
  border-left-color: #4b5563;
  opacity: 0.75;
}
.nbadge-standalone {
  color: #4b5563;
  font-style: italic;
}

/* Feature 6 — upstream toggle */
.bk-upstream-toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  font-size: 11px;
  color: #6b7280;
  padding: 2px 0;
}
.bk-upstream-toggle:hover { color: #9ca3af; }
.toggle-icon { font-size: 9px; }

/* Location modifier badges */
.dp-loc-modifier {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: 4px;
  padding: 2px 6px;
  flex-shrink: 0;
  min-width: 96px;
  font-size: 10px;
  line-height: 1.4;
}
.mod-sym {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  font-size: 11px;
  min-width: 14px;
  text-align: center;
  flex-shrink: 0;
}
.mod-lbl {
  font-weight: 600;
  letter-spacing: 0.01em;
}
.mod-exact           { background: rgba(248,113,113,0.1); color: #f87171; border: 1px solid rgba(248,113,113,0.25); }
.mod-prefix_priority { background: rgba(251,146,60,0.1);  color: #fb923c; border: 1px solid rgba(251,146,60,0.25); }
.mod-regex_cs        { background: rgba(250,204,21,0.1);  color: #facc15; border: 1px solid rgba(250,204,21,0.3); }
.mod-regex_ci        { background: rgba(250,204,21,0.07); color: #fde047; border: 1px solid rgba(250,204,21,0.2); }
.mod-prefix          { background: rgba(96,165,250,0.1);  color: #60a5fa; border: 1px solid rgba(96,165,250,0.2); }
.mod-named           { background: rgba(107,114,128,0.1); color: #9ca3af; border: 1px solid rgba(107,114,128,0.2); }
</style>

<style>
/* Detail panel transition */
.dp-fade-enter-active,
.dp-fade-leave-active {
  transition: opacity 0.18s, transform 0.18s;
}
.dp-fade-enter-from,
.dp-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* Connection tooltip — unscoped (Teleport to body) */
.conn-tooltip {
  position: fixed;
  z-index: 9999;
  background: #1c1c26;
  border: 1px solid #3a3a4f;
  border-radius: 8px;
  padding: 10px 13px;
  max-width: 320px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
  pointer-events: none;
}

.ct-title {
  font-size: 11px;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 6px;
}

.ct-path {
  font-size: 12px;
  font-family: 'JetBrains Mono', monospace;
  color: #d1d5db;
  line-height: 1.7;
}
</style>
