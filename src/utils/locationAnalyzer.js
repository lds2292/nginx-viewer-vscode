/**
 * nginx Location Priority Analyzer + URL Match Tester
 * Feature 2: Location Conflict & Priority Analyzer
 */

export const MODIFIER = {
  EXACT:            'exact',            // =
  PREFIX_PRIORITY:  'prefix_priority',  // ^~
  REGEX_CS:         'regex_cs',         // ~
  REGEX_CI:         'regex_ci',         // ~*
  PREFIX:           'prefix',           // (no modifier)
  NAMED:            'named',            // @name
}

export const MODIFIER_LABELS = {
  exact:           { symbol: '=',  label: '완전 일치',         color: '#f87171', priority: 1 },
  prefix_priority: { symbol: '^~', label: '접두사 우선',       color: '#fb923c', priority: 2 },
  regex_cs:        { symbol: '~',  label: '정규식 (대소문자)', color: '#facc15', priority: 3 },
  regex_ci:        { symbol: '~*', label: '정규식 (무시)',     color: '#facc15', priority: 3 },
  prefix:          { symbol: '',   label: '접두사',            color: '#60a5fa', priority: 4 },
  named:           { symbol: '@',  label: 'Named (내부용)',    color: '#6b7280', priority: 5 },
}

function parseModifier(params) {
  if (!params || !params.length) return { modifier: MODIFIER.PREFIX, path: '' }
  const first = params[0]
  if (first === '=')          return { modifier: MODIFIER.EXACT,           path: params.slice(1).join(' ') }
  if (first === '^~')         return { modifier: MODIFIER.PREFIX_PRIORITY, path: params.slice(1).join(' ') }
  if (first === '~')          return { modifier: MODIFIER.REGEX_CS,        path: params.slice(1).join(' ') }
  if (first === '~*')         return { modifier: MODIFIER.REGEX_CI,        path: params.slice(1).join(' ') }
  if (first.startsWith('@'))  return { modifier: MODIFIER.NAMED,           path: first }
  return { modifier: MODIFIER.PREFIX, path: params.join(' ') }
}

// ─────────────────────────────────────────
// Collect server blocks with their locations
// ─────────────────────────────────────────

function collectDirectLocations(serverChildren) {
  return serverChildren
    .filter(n => n.type === 'block' && n.name === 'location')
    .map((n, idx) => {
      const { modifier, path } = parseModifier(n.params)
      return { modifier, path, declarationOrder: idx, node: n }
    })
}

export function analyzeLocations(ast) {
  const results = []

  function walk(nodes) {
    for (const n of nodes) {
      if (n.type !== 'block') continue
      if (n.name === 'http' || n.name === 'stream') {
        walk(n.children)
      } else if (n.name === 'server') {
        const serverNames = n.children
          .filter(c => c.type === 'directive' && c.name === 'server_name')
          .flatMap(c => c.values)
        const listens = n.children
          .filter(c => c.type === 'directive' && c.name === 'listen')
          .map(c => c.values.join(' '))

        const locations = collectDirectLocations(n.children)

        // Detect duplicate patterns
        const seen = new Map()
        for (const loc of locations) {
          const key = `${loc.modifier}:${loc.path}`
          if (seen.has(key)) {
            loc.duplicate = true
            seen.get(key).duplicate = true
          } else {
            seen.set(key, loc)
          }
        }

        results.push({ serverNames, listens, locations })
      }
    }
  }

  walk(ast)
  return results
}

// ─────────────────────────────────────────
// URL Match Simulation
// ─────────────────────────────────────────

export function matchLocation(locations, uri) {
  if (!uri) return null

  // Step 1: exact match (= /path)
  for (let i = 0; i < locations.length; i++) {
    const loc = locations[i]
    if (loc.modifier === MODIFIER.EXACT && loc.path === uri) {
      return { index: i, reason: `완전 일치 (=) → 즉시 종료` }
    }
  }

  // Step 2: find longest prefix match (both prefix and ^~)
  let longestIdx = -1
  let longestLen = -1
  for (let i = 0; i < locations.length; i++) {
    const loc = locations[i]
    if (loc.modifier !== MODIFIER.PREFIX && loc.modifier !== MODIFIER.PREFIX_PRIORITY) continue
    if (uri.startsWith(loc.path) && loc.path.length > longestLen) {
      longestLen = loc.path.length
      longestIdx = i
    }
  }

  // Step 3: if longest prefix is ^~, skip regex
  if (longestIdx !== -1 && locations[longestIdx].modifier === MODIFIER.PREFIX_PRIORITY) {
    return { index: longestIdx, reason: `가장 긴 접두사 우선 (^~) → 정규식 검사 건너뜀` }
  }

  // Step 4: regex in declaration order
  for (let i = 0; i < locations.length; i++) {
    const loc = locations[i]
    if (loc.modifier !== MODIFIER.REGEX_CS && loc.modifier !== MODIFIER.REGEX_CI) continue
    try {
      const flags = loc.modifier === MODIFIER.REGEX_CI ? 'i' : ''
      const re = new RegExp(loc.path, flags)
      if (re.test(uri)) {
        const label = loc.modifier === MODIFIER.REGEX_CI ? '정규식 ~* (대소문자 무시)' : '정규식 ~ (대소문자 구분)'
        return { index: i, reason: `${label} 매칭 (선언 순서 #${i + 1})` }
      }
    } catch {
      // invalid regex — skip
    }
  }

  // Step 5: use longest prefix
  if (longestIdx !== -1) {
    return { index: longestIdx, reason: `가장 긴 접두사 매칭` }
  }

  return null
}

// ─────────────────────────────────────────
// Evaluation order annotation
// ─────────────────────────────────────────

// Returns locations annotated with their nginx evaluation step label
export function annotateEvaluationOrder(locations) {
  // nginx evaluates: exact first, then all prefixes (keeping longest),
  // then regex in order, then longest prefix fallback.
  // We show this as "evaluation steps" for each type.
  let regexStep = 1
  return locations.map((loc, i) => {
    let evalNote = ''
    if (loc.modifier === MODIFIER.EXACT) {
      evalNote = '① 완전 일치 검사'
    } else if (loc.modifier === MODIFIER.PREFIX_PRIORITY) {
      evalNote = '② 접두사 검사 (매칭 시 정규식 생략)'
    } else if (loc.modifier === MODIFIER.PREFIX) {
      evalNote = '② 접두사 검사 (가장 긴 것 선택)'
    } else if (loc.modifier === MODIFIER.REGEX_CS || loc.modifier === MODIFIER.REGEX_CI) {
      evalNote = `③ 정규식 검사 (선언 순서 ${regexStep++}번째)`
    } else if (loc.modifier === MODIFIER.NAMED) {
      evalNote = '내부 리다이렉트 전용'
    }
    return { ...loc, evalNote }
  })
}
