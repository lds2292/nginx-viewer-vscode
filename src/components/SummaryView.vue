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
          <span
            class="key"
            :class="{ 'key-has-doc': DIRECTIVE_DOCS['worker_processes'] }"
            @mouseenter="showTooltip('worker_processes', $event)"
            @mouseleave="hideTooltip"
          >worker_processes</span>
          <span class="val">{{ summary.worker.processes }}</span>
        </div>
        <div v-if="summary.worker.rlimitNofile" class="row">
          <span
            class="key"
            :class="{ 'key-has-doc': DIRECTIVE_DOCS['worker_rlimit_nofile'] }"
            @mouseenter="showTooltip('worker_rlimit_nofile', $event)"
            @mouseleave="hideTooltip"
          >worker_rlimit_nofile</span>
          <span class="val">{{ summary.worker.rlimitNofile }}</span>
        </div>
        <div v-if="summary.worker.connections" class="row">
          <span class="key">worker_connections</span>
          <span class="val">{{ summary.worker.connections }}</span>
        </div>
        <div v-if="summary.worker.eventModel" class="row">
          <span
            class="key"
            :class="{ 'key-has-doc': DIRECTIVE_DOCS['use'] }"
            @mouseenter="showTooltip('use', $event)"
            @mouseleave="hideTooltip"
          >use</span>
          <span class="val">{{ summary.worker.eventModel }}</span>
        </div>
        <div v-if="summary.worker.multiAccept" class="row">
          <span
            class="key"
            :class="{ 'key-has-doc': DIRECTIVE_DOCS['multi_accept'] }"
            @mouseenter="showTooltip('multi_accept', $event)"
            @mouseleave="hideTooltip"
          >multi_accept</span>
          <span class="val" :class="summary.worker.multiAccept === 'on' ? 'val-on' : 'val-off'">{{ summary.worker.multiAccept }}</span>
        </div>
      </div>
    </div>

    <!-- HTTP Global -->
    <div v-if="hasHttpGlobal" class="card">
      <div class="card-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        {{ t('card_http_global') }}
      </div>
      <div class="card-body">
        <template v-if="summary.httpIncludes && summary.httpIncludes.length">
          <div v-for="(pattern, pi) in summary.httpIncludes" :key="'inc'+pi" class="row">
            <span
              class="key"
              :class="{ 'key-has-doc': DIRECTIVE_DOCS['include'] }"
              @mouseenter="showTooltip('include', $event)"
              @mouseleave="hideTooltip"
            >include</span>
            <span class="val mono val-include">{{ pattern }}</span>
          </div>
          <div v-if="Object.keys(summary.httpGlobal).length" class="details-divider"></div>
        </template>
        <div v-for="(val, name) in summary.httpGlobal" :key="name" class="row">
          <span
            class="key"
            :class="{ 'key-has-doc': DIRECTIVE_DOCS[name] }"
            @mouseenter="showTooltip(name, $event)"
            @mouseleave="hideTooltip"
          >{{ name }}</span>
          <span class="val mono" :class="onOffClass(name, val)">{{ val }}</span>
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
          <span
            class="key"
            :class="{ 'key-has-doc': DIRECTIVE_DOCS['gzip'] }"
            @mouseenter="showTooltip('gzip', $event)"
            @mouseleave="hideTooltip"
          >gzip</span>
          <span class="val" :class="summary.gzip === 'on' ? 'val-on' : 'val-off'">{{ summary.gzip }}</span>
        </div>
        <template v-if="Object.keys(summary.gzipDetails).length">
          <div class="details-divider"></div>
          <div v-for="(val, name) in summary.gzipDetails" :key="name" class="row">
            <span
              class="key"
              :class="{ 'key-has-doc': DIRECTIVE_DOCS[name] }"
              @mouseenter="showTooltip(name, $event)"
              @mouseleave="hideTooltip"
            >{{ name }}</span>
            <span class="val mono">{{ val }}</span>
          </div>
        </template>
      </div>
    </div>

    <!-- Rate Limiting -->
    <div v-if="hasRateLimiting" class="card">
      <div class="card-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        {{ t('card_rate_limit') }}
      </div>
      <div class="card-body">
        <template v-if="summary.rateLimiting.reqZones.length">
          <div class="details-label">
            <span
              class="key-has-doc"
              @mouseenter="showTooltip('limit_req_zone', $event)"
              @mouseleave="hideTooltip"
            >limit_req_zone</span>
          </div>
          <div v-for="(zone, i) in summary.rateLimiting.reqZones" :key="'rq'+i" class="row sub">
            <span class="val mono val-zone">{{ zone }}</span>
          </div>
        </template>
        <template v-if="summary.rateLimiting.connZones.length">
          <div v-if="summary.rateLimiting.reqZones.length" class="details-divider"></div>
          <div class="details-label">
            <span
              class="key-has-doc"
              @mouseenter="showTooltip('limit_conn_zone', $event)"
              @mouseleave="hideTooltip"
            >limit_conn_zone</span>
          </div>
          <div v-for="(zone, i) in summary.rateLimiting.connZones" :key="'cc'+i" class="row sub">
            <span class="val mono val-zone">{{ zone }}</span>
          </div>
        </template>
      </div>
    </div>

    <!-- Proxy Cache -->
    <div v-if="hasCache" class="card">
      <div class="card-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
        {{ t('card_proxy_cache') }}
      </div>
      <div class="card-body">
        <div v-if="summary.cache.path" class="row">
          <span
            class="key"
            :class="{ 'key-has-doc': DIRECTIVE_DOCS['proxy_cache_path'] }"
            @mouseenter="showTooltip('proxy_cache_path', $event)"
            @mouseleave="hideTooltip"
          >proxy_cache_path</span>
          <span class="val mono">{{ summary.cache.path }}</span>
        </div>
        <div v-if="summary.cache.key" class="row">
          <span
            class="key"
            :class="{ 'key-has-doc': DIRECTIVE_DOCS['proxy_cache_key'] }"
            @mouseenter="showTooltip('proxy_cache_key', $event)"
            @mouseleave="hideTooltip"
          >proxy_cache_key</span>
          <span class="val mono">{{ summary.cache.key }}</span>
        </div>
      </div>
    </div>

    <!-- Logging -->
    <div v-if="hasLogging" class="card">
      <div class="card-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        {{ t('card_logging') }}
      </div>
      <div class="card-body">
        <div v-if="summary.logging.formats.length" class="row">
          <span
            class="key"
            :class="{ 'key-has-doc': DIRECTIVE_DOCS['log_format'] }"
            @mouseenter="showTooltip('log_format', $event)"
            @mouseleave="hideTooltip"
          >log_format</span>
          <span class="val mono">{{ summary.logging.formats.join(', ') }}</span>
        </div>
        <div v-if="summary.logging.accessLog" class="row">
          <span
            class="key"
            :class="{ 'key-has-doc': DIRECTIVE_DOCS['access_log'] }"
            @mouseenter="showTooltip('access_log', $event)"
            @mouseleave="hideTooltip"
          >access_log</span>
          <span class="val mono">{{ summary.logging.accessLog }}</span>
        </div>
        <div v-if="summary.logging.errorLog" class="row">
          <span
            class="key"
            :class="{ 'key-has-doc': DIRECTIVE_DOCS['error_log'] }"
            @mouseenter="showTooltip('error_log', $event)"
            @mouseleave="hideTooltip"
          >error_log</span>
          <span class="val mono">{{ summary.logging.errorLog }}</span>
        </div>
      </div>
    </div>

    <!-- Map -->
    <div v-if="summary.maps && summary.maps.length" class="card">
      <div class="card-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        Map
      </div>
      <div class="card-body">
        <div v-for="(m, i) in summary.maps" :key="i" class="map-entry">
          <div class="map-header-row">
            <span
              class="map-kw key-has-doc"
              @mouseenter="showTooltip('map', $event)"
              @mouseleave="hideTooltip"
            >map</span>
            <span class="mono map-src">{{ m.source }}</span>
            <span class="mono map-dest">{{ m.variable }}</span>
          </div>
          <div class="map-body">
            <div v-if="m.default !== null" class="map-row">
              <span class="mono map-col-pattern map-col-default">default</span>
              <span class="mono map-col-value">{{ m.default }}</span>
            </div>
            <div v-for="(entry, j) in m.entries" :key="j" class="map-row">
              <span class="mono map-col-pattern">{{ entry.pattern }}</span>
              <span class="mono map-col-value">{{ entry.value }}</span>
            </div>
          </div>
          <div v-if="i < summary.maps.length - 1" class="vhost-divider"></div>
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
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6 C5 3, 9 3, 12 6 C15 9, 19 9, 22 6"/><path d="M2 12 C5 9, 9 9, 12 12 C15 15, 19 15, 22 12"/><path d="M2 18 C5 15, 9 15, 12 18 C15 21, 19 21, 22 18"/></svg>
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
        <span class="vhost-name">{{ vh.serverName[0] || t('no_server_name') }}</span>
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
          <div class="details-label">{{ t('details_label') }}</div>
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
      <p>{{ t('summary_empty') }}</p>
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
        <div v-if="tooltip.default" class="dir-tooltip-default">{{ t('default_label') }} <code>{{ tooltip.default }}</code></div>
        <a :href="tooltip.doc" target="_blank" class="dir-tooltip-link">{{ t('doc_link') }}</a>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from '../i18n/index.js'
import { DIRECTIVE_DOCS } from '../utils/directiveDocs.js'

const { t } = useI18n()

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

function onOffClass(name, val) {
  const ON_OFF_DIRS = new Set([
    'sendfile', 'tcp_nopush', 'tcp_nodelay', 'reset_timedout_connection',
    'gzip', 'gzip_vary', 'server_tokens',
  ])
  if (!ON_OFF_DIRS.has(name)) return ''
  return val === 'on' ? 'val-on' : 'val-off'
}

const hasWorker = computed(() =>
  props.summary.worker.processes ||
  props.summary.worker.connections ||
  props.summary.worker.rlimitNofile ||
  props.summary.worker.eventModel ||
  props.summary.worker.multiAccept
)

const hasHttpGlobal = computed(() =>
  Object.keys(props.summary.httpGlobal ?? {}).length > 0 ||
  (props.summary.httpIncludes?.length ?? 0) > 0
)

const hasRateLimiting = computed(() =>
  props.summary.rateLimiting?.reqZones.length ||
  props.summary.rateLimiting?.connZones.length
)

const hasCache = computed(() =>
  props.summary.cache?.path || props.summary.cache?.key
)

const hasLogging = computed(() =>
  props.summary.logging?.formats.length ||
  props.summary.logging?.accessLog ||
  props.summary.logging?.errorLog
)

const isEmpty = computed(() =>
  !hasWorker.value &&
  !hasHttpGlobal.value &&
  props.summary.gzip === null &&
  !hasRateLimiting.value &&
  !hasCache.value &&
  !hasLogging.value &&
  !(props.summary.maps?.length) &&
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

.map-entry {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.map-header-row {
  display: flex;
  align-items: baseline;
  gap: 16px;
  font-size: 12px;
  margin-bottom: 4px;
}

.map-kw {
  color: #60a5fa;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 12px;
  min-width: 40px;
  flex-shrink: 0;
  cursor: help;
  border-bottom: 1px dashed #4b5563;
}

.map-kw:hover {
  color: #93c5fd;
  border-bottom-color: #60a5fa;
}

.map-src {
  color: #a78bfa;
  font-size: 12px;
}

.map-dest {
  color: #7dd3fc;
  font-size: 12px;
}

.map-body {
  padding-left: 56px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.map-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  font-size: 12px;
}

.map-col-pattern {
  color: #a78bfa;
  min-width: 120px;
  flex-shrink: 0;
}

.map-col-default {
  color: #6b7280;
}

.map-col-value {
  color: #d1d5db;
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
