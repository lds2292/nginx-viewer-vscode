<template>
  <!-- Comment -->
  <div
    v-if="node.type === 'comment'"
    class="tree-node tree-comment"
    :style="{ paddingLeft: indent }"
    :class="{ 'has-line': node.line }"
    @click="() => jumpToLine && node.line && jumpToLine(node.line)"
  >
    <span class="comment-text"># {{ node.text }}</span>
  </div>

  <!-- Include -->
  <div
    v-else-if="node.type === 'include'"
    class="tree-node tree-include"
    :style="{ paddingLeft: indent }"
    :class="{ 'has-line': node.line }"
    @click="() => jumpToLine && node.line && jumpToLine(node.line)"
  >
    <span class="include-icon">📎</span>
    <span class="include-kw">include</span>
    <span class="include-pattern">{{ node.pattern }}</span>
  </div>

  <!-- Directive -->
  <div
    v-else-if="node.type === 'directive'"
    class="tree-node tree-directive"
    :style="{ paddingLeft: indent }"
    :class="{ 'has-line': node.line }"
    @click="() => jumpToLine && node.line && jumpToLine(node.line)"
  >
    <span class="directive-name">{{ node.name }}</span>
    <span v-if="node.values.length" class="directive-value">{{ node.values.join(' ') }}</span>
    <span v-if="node.missingSemi" class="missing-semi" title="세미콜론 누락">⚠</span>
  </div>

  <!-- Block -->
  <div v-else-if="node.type === 'block'" class="tree-block">
    <div class="tree-node tree-block-header" :style="{ paddingLeft: indent }" @click="handleBlockClick">
      <span class="toggle-icon">{{ open ? '▾' : '▸' }}</span>
      <span class="block-name">{{ node.name }}</span>
      <span v-if="node.params.length" class="block-params">{{ node.params.join(' ') }}</span>
      <span class="block-brace">{ {{ open ? '' : `…}` }}</span>
    </div>
    <div v-if="open" class="block-children">
      <TreeNode
        v-for="(child, i) in node.children"
        :key="i"
        :node="child"
        :depth="depth + 1"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject } from 'vue'

const props = defineProps({
  node:  { type: Object, required: true },
  depth: { type: Number, default: 0 },
})

// Blocks start open at depth 0, closed at deeper levels
const open = ref(props.depth < 2)

const indent = computed(() => `${props.depth * 20}px`)

const jumpToLine = inject('jumpToLine', null)

function handleBlockClick() {
  open.value = !open.value
  if (jumpToLine && props.node.line) jumpToLine(props.node.line)
}
</script>

<style scoped>
.tree-node {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 3px 4px;
  border-radius: 4px;
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tree-node:hover {
  background: rgba(255,255,255,0.04);
}

.tree-node.has-line { cursor: pointer; }

/* Comment */
.comment-text {
  color: #6b7280;
  font-style: italic;
}

/* Include */
.tree-include {
  gap: 6px;
}
.include-icon { font-size: 12px; }
.include-kw   { color: #f59e0b; font-weight: 600; }
.include-pattern { color: #fcd34d; }

/* Directive */
.directive-name  { color: #60a5fa; font-weight: 600; }
.directive-value { color: #d1d5db; }
.missing-semi    { color: #f59e0b; font-size: 12px; }

/* Block */
.tree-block-header {
  display: flex;
  align-items: baseline;
  gap: 6px;
  cursor: pointer;
  user-select: none;
}

.toggle-icon {
  color: #4b5563;
  font-size: 11px;
  width: 12px;
  flex-shrink: 0;
}

.block-name   { color: #4ade80; font-weight: 700; }
.block-params { color: #86efac; }
.block-brace  { color: #4b5563; }

.block-children {
  /* children indented by TreeNode's own padding */
}
</style>
