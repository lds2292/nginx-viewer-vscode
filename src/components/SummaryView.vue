<template>
  <div class="summary">
    <!-- Worker -->
    <div v-if="hasWorker" class="card">
      <div class="card-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
        Worker
      </div>
      <div class="card-body">
        <div v-if="summary.worker.processes" class="row">
          <span class="key">worker_processes</span>
          <span class="val">{{ summary.worker.processes }}</span>
        </div>
        <div v-if="summary.worker.connections" class="row">
          <span class="key">worker_connections</span>
          <span class="val">{{ summary.worker.connections }}</span>
        </div>
      </div>
    </div>

    <!-- Gzip -->
    <div v-if="summary.gzip !== null" class="card">
      <div class="card-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
        Gzip
      </div>
      <div class="card-body">
        <div class="row">
          <span class="key">gzip</span>
          <span class="val" :class="summary.gzip === 'on' ? 'val-on' : 'val-off'">{{ summary.gzip }}</span>
        </div>
      </div>
    </div>

    <!-- SSL -->
    <div v-if="summary.ssl.length" class="card card-ssl">
      <div class="card-title card-title-ssl">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        SSL Certificates
      </div>
      <div class="card-body">
        <div v-for="(cert, i) in summary.ssl" :key="i" class="row">
          <span class="val mono val-ssl">{{ cert }}</span>
        </div>
      </div>
    </div>

    <!-- Upstreams -->
    <div v-if="summary.upstreams.length" class="card">
      <div class="card-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="3"/><line x1="12" y1="8" x2="12" y2="12"/><polyline points="7 17 12 12 17 17"/><line x1="7" y1="21" x2="7" y2="17"/><line x1="17" y1="21" x2="17" y2="17"/></svg>
        Upstreams
      </div>
      <div class="card-body">
        <div v-for="(up, i) in summary.upstreams" :key="i" class="upstream">
          <div class="upstream-name">{{ up.name }}</div>
          <div v-for="(srv, j) in up.servers" :key="j" class="row sub">
            <span class="key">server</span>
            <span class="val mono">{{ srv }}</span>
          </div>
          <template v-if="up.details && Object.keys(up.details).length">
            <div class="details-divider"></div>
            <div v-for="(val, name) in up.details" :key="name" class="row sub">
              <span
                class="key"
                :class="{ 'key-has-doc': DIRECTIVE_DOCS[name] }"
                @mouseenter="showTooltip(name, $event)"
                @mouseleave="hideTooltip"
              >{{ name }}</span>
              <span class="val mono">{{ val }}</span>
            </div>
          </template>
          <div v-if="i < summary.upstreams.length - 1" class="vhost-divider"></div>
        </div>
      </div>
    </div>

    <!-- Virtual Hosts — one card per server -->
    <div v-for="(vh, i) in summary.virtualHosts" :key="i" class="card">
      <div class="card-title vhost-header">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        <span class="vhost-name">{{ vh.serverName[0] || '(no server_name)' }}</span>
        <div class="port-badges">
          <span v-for="(p, pi) in vh.listen" :key="pi" class="port-badge" :class="{ 'port-badge-ssl': isSslPort(p) }">{{ p }}</span>
        </div>
      </div>
      <div class="card-body">
        <!-- Basic info -->
        <div v-if="vh.serverName.length" class="row">
          <span class="key">server_name</span>
          <span class="val mono">{{ vh.serverName.join(' ') }}</span>
        </div>
        <div v-if="vh.listen.length" class="row">
          <span class="key">listen</span>
          <span class="val mono">{{ vh.listen.join(', ') }}</span>
        </div>

        <!-- Details section -->
        <template v-if="hasDetails(vh)">
          <div class="details-divider"></div>
          <div class="details-label">세부 설정</div>
          <div v-for="(val, name) in vh.details" :key="name" class="row">
            <span
              class="key"
              :class="{ 'key-has-doc': DIRECTIVE_DOCS[name] }"
              @mouseenter="showTooltip(name, $event)"
              @mouseleave="hideTooltip"
            >{{ name }}</span>
            <span class="val mono">{{ val }}</span>
          </div>
        </template>

        <!-- Includes section -->
        <template v-if="vh.includes && vh.includes.length">
          <div class="details-divider"></div>
          <div class="details-label">include</div>
          <div v-for="(pattern, pi) in vh.includes" :key="pi" class="row">
            <span class="inc-icon">📋</span>
            <span class="val mono val-include">{{ pattern }}</span>
          </div>
        </template>
      </div>
    </div>

    <!-- Empty -->
    <div v-if="isEmpty" class="empty">
      <p>요약할 설정이 없습니다.<br>server {}, upstream {}, gzip, worker_processes 등을 확인하세요.</p>
    </div>

    <!-- Tooltip -->
    <Teleport to="body">
      <div
        v-if="tooltip"
        class="dir-tooltip"
        :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
        @mouseenter="cancelHide"
        @mouseleave="hideTooltip"
      >
        <div class="dir-tooltip-desc">{{ tooltip.desc }}</div>
        <div v-if="tooltip.default" class="dir-tooltip-default">기본값: <code>{{ tooltip.default }}</code></div>
        <a :href="tooltip.doc" target="_blank" class="dir-tooltip-link">공식 문서 ↗</a>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { DIRECTIVE_DOCS } from '../utils/directiveDocs.js'

const props = defineProps({
  summary: { type: Object, required: true },
})

const tooltip = ref(null)
let hideTimer = null

function showTooltip(name, event) {
  const info = DIRECTIVE_DOCS[name]
  if (!info) return
  cancelHide()
  const rect = event.currentTarget.getBoundingClientRect()
  tooltip.value = { ...info, x: rect.left, y: rect.bottom + 6 }
}

function hideTooltip() {
  hideTimer = setTimeout(() => { tooltip.value = null }, 100)
}

function cancelHide() {
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
}

function isSslPort(p) {
  return /\bssl\b/.test(p) || /\b443\b/.test(p)
}

function hasDetails(vh) {
  return vh.details && Object.keys(vh.details).length > 0
}

const hasWorker = computed(() =>
  props.summary.worker.processes || props.summary.worker.connections
)

const isEmpty = computed(() =>
  !hasWorker.value &&
  props.summary.gzip === null &&
  !props.summary.ssl.length &&
  !props.summary.upstreams.length &&
  !props.summary.virtualHosts.length
)
</script>

<style scoped>
.summary {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.card {
  background: #16161d;
  border: 1px solid #2a2a3a;
  border-radius: 8px;
  overflow: hidden;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 14px;
  background: #1c1c26;
  border-bottom: 1px solid #2a2a3a;
  font-size: 12px;
  font-weight: 700;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.vhost-header {
  gap: 8px;
}

.vhost-name {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 12px;
  color: #d1d5db;
  text-transform: none;
  letter-spacing: 0;
}

.port-badges {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-left: 2px;
}

.port-badge {
  background: #2a2a3a;
  border: 1px solid #3a3a4f;
  border-radius: 4px;
  padding: 1px 6px;
  font-size: 11px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  color: #4ade80;
  text-transform: none;
  letter-spacing: 0;
  font-weight: 600;
}

.port-badge-ssl {
  background: rgba(245, 158, 11, 0.1);
  border-color: rgba(245, 158, 11, 0.4);
  color: #f59e0b;
}

.card-body {
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.row {
  display: flex;
  align-items: baseline;
  gap: 10px;
  font-size: 13px;
  line-height: 1.5;
}

.row.sub {
  padding-left: 14px;
}

.key {
  color: #60a5fa;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 12px;
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

.val {
  color: #d1d5db;
  word-break: break-all;
}

.val.mono {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 12px;
}

.val.muted {
  color: #4b5563;
}

.val-on  { color: #4ade80; }
.val-off { color: #f87171; }
.val-ssl { color: #f59e0b; }

.card-ssl {
  border-color: rgba(245, 158, 11, 0.3);
}

.card-title-ssl {
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.08);
  border-bottom-color: rgba(245, 158, 11, 0.2);
}

.upstream {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.upstream-name {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 13px;
  font-weight: 700;
  color: #4ade80;
  margin-bottom: 2px;
}

.details-divider {
  height: 1px;
  background: #2a2a3a;
  margin: 4px 0;
}

.details-label {
  font-size: 11px;
  font-weight: 600;
  color: #4b5563;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 2px;
}

.inc-icon {
  flex-shrink: 0;
  font-size: 12px;
}

.val-include {
  color: #7dd3fc;
}

.empty {
  text-align: center;
  color: #4b5563;
  font-size: 14px;
  line-height: 1.8;
  padding: 40px 0;
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

.dir-tooltip-link {
  display: inline-block;
  font-size: 11px;
  color: #4ade80;
  text-decoration: none;
}

.dir-tooltip-link:hover {
  text-decoration: underline;
}
</style>
