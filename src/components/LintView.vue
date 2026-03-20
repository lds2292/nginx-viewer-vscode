<template>
  <div class="lint-view">
    <!-- Summary bar -->
    <div class="summary-bar">
      <span class="badge badge-error">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        오류 {{ counts.error }}
      </span>
      <span class="badge badge-warning">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        경고 {{ counts.warning }}
      </span>
      <span class="badge badge-info">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        권고 {{ counts.info }}
      </span>
      <span v-if="counts.error === 0 && counts.warning === 0" class="all-good">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        주요 오류 없음
      </span>
    </div>

    <!-- No issues -->
    <div v-if="issues.length === 0" class="empty">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      <p>오류 및 경고가 없습니다.</p>
    </div>

    <!-- Grouped by category -->
    <div v-for="cat in categories" :key="cat" class="group">
      <div class="group-title">
        <span class="group-icon">{{ categoryIcon(cat) }}</span>
        {{ cat }}
        <span class="group-count">{{ groupedIssues[cat].length }}</span>
      </div>
      <div class="issue-list">
        <div
          v-for="(issue, i) in groupedIssues[cat]"
          :key="i"
          class="issue"
          :class="`issue-${issue.severity}`"
        >
          <div class="issue-icon">
            <!-- error -->
            <svg v-if="issue.severity === 'error'" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <!-- warning -->
            <svg v-else-if="issue.severity === 'warning'" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <!-- info -->
            <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          </div>
          <div class="issue-body">
            <div class="issue-message">{{ issue.message }}</div>
            <div class="issue-context">{{ issue.context }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { sortedIssues } from '../utils/nginxLint.js'

const props = defineProps({
  issues: { type: Array, required: true },
})

const sorted = computed(() => sortedIssues(props.issues))

const counts = computed(() => ({
  error:   props.issues.filter(i => i.severity === 'error').length,
  warning: props.issues.filter(i => i.severity === 'warning').length,
  info:    props.issues.filter(i => i.severity === 'info').length,
}))

const groupedIssues = computed(() => {
  const g = {}
  for (const issue of sorted.value) {
    ;(g[issue.category] ||= []).push(issue)
  }
  return g
})

const categories = computed(() => Object.keys(groupedIssues.value))

function categoryIcon(cat) {
  return { Context: '⬡', SSL: '🔒', Upstream: '⇅' }[cat] ?? '•'
}
</script>

<style scoped>
.lint-view {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* Summary bar */
.summary-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.badge-error   { background: rgba(239, 68, 68, 0.12);  color: #fca5a5; border: 1px solid rgba(239,68,68,0.25); }
.badge-warning { background: rgba(234,179,8,0.12);     color: #fde68a; border: 1px solid rgba(234,179,8,0.25); }
.badge-info    { background: rgba(96,165,250,0.12);    color: #93c5fd; border: 1px solid rgba(96,165,250,0.25); }

.all-good {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #4ade80;
  font-weight: 600;
}

/* Empty */
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

/* Group */
.group {
  background: #16161d;
  border: 1px solid #2a2a3a;
  border-radius: 8px;
  overflow: hidden;
}

.group-title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: #1c1c26;
  border-bottom: 1px solid #2a2a3a;
  font-size: 12px;
  font-weight: 700;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.group-icon {
  font-size: 14px;
}

.group-count {
  margin-left: auto;
  background: #2a2a3a;
  border-radius: 10px;
  padding: 1px 7px;
  font-size: 11px;
  color: #6b7280;
}

.issue-list {
  display: flex;
  flex-direction: column;
}

/* Issue row */
.issue {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid #1e1e28;
  font-size: 13px;
  line-height: 1.5;
}

.issue:last-child { border-bottom: none; }

.issue-icon { flex-shrink: 0; margin-top: 1px; }

.issue-error   .issue-icon { color: #ef4444; }
.issue-warning .issue-icon { color: #eab308; }
.issue-info    .issue-icon { color: #60a5fa; }

.issue-body { flex: 1; min-width: 0; }

.issue-message {
  color: #e5e7eb;
  word-break: break-word;
}

.issue-context {
  margin-top: 3px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 11px;
  color: #6b7280;
}
</style>
