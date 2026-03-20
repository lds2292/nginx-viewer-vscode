/**
 * nginx.conf Linter
 * - Feature 1: Directive Context Validator
 * - Feature 3: SSL Security Scorer
 * - Feature 4: Upstream Configuration Linter
 */

// ─────────────────────────────────────────
// Context rules
// ─────────────────────────────────────────

// Which contexts a directive is allowed in
const DIRECTIVE_RULES = {
  // main only
  worker_processes:         { allowed: ['main'] },
  worker_cpu_affinity:      { allowed: ['main'] },
  worker_rlimit_nofile:     { allowed: ['main'] },
  worker_shutdown_timeout:  { allowed: ['main'] },
  user:                     { allowed: ['main'] },
  daemon:                   { allowed: ['main'] },
  pid:                      { allowed: ['main'] },
  load_module:              { allowed: ['main'] },
  master_process:           { allowed: ['main'] },
  timer_resolution:         { allowed: ['main'] },

  // events only
  worker_connections:       { allowed: ['events'] },
  multi_accept:             { allowed: ['events'] },
  accept_mutex:             { allowed: ['events'] },
  accept_mutex_delay:       { allowed: ['events'] },
  use:                      { allowed: ['events'] },

  // server only
  listen:                   { allowed: ['server'] },
  server_name:              { allowed: ['server'] },

  // location only
  proxy_pass:               { allowed: ['location'] },
  alias:                    { allowed: ['location'] },
  internal:                 { allowed: ['location'] },

  // server, location
  try_files:                { allowed: ['server', 'location'] },
  return:                   { allowed: ['server', 'location', 'http'] },
  rewrite:                  { allowed: ['server', 'location', 'http'] },

  // http, server, location
  root:                     { allowed: ['http', 'server', 'location'] },
  index:                    { allowed: ['http', 'server', 'location'] },
  sendfile:                 { allowed: ['http', 'server', 'location'] },
  tcp_nopush:               { allowed: ['http', 'server', 'location'] },
  tcp_nodelay:              { allowed: ['http', 'server', 'location'] },
  keepalive_timeout:        { allowed: ['http', 'server', 'location'] },
  client_max_body_size:     { allowed: ['http', 'server', 'location'] },
  client_body_timeout:      { allowed: ['http', 'server', 'location'] },
  add_header:               { allowed: ['http', 'server', 'location'] },
  gzip:                     { allowed: ['http', 'server', 'location'] },
  gzip_types:               { allowed: ['http', 'server', 'location'] },
  gzip_vary:                { allowed: ['http', 'server', 'location'] },
  expires:                  { allowed: ['http', 'server', 'location'] },
  limit_req:                { allowed: ['http', 'server', 'location'] },
  limit_conn:               { allowed: ['http', 'server', 'location'] },

  // error_log — allowed almost everywhere
  error_log:                { allowed: ['main', 'http', 'server', 'location', 'stream', 'mail'] },
  access_log:               { allowed: ['http', 'server', 'location', 'stream', 'main'] },

  // upstream only
  ip_hash:                  { allowed: ['upstream'] },
  least_conn:               { allowed: ['upstream'] },
  random:                   { allowed: ['upstream'] },
  keepalive:                { allowed: ['upstream'] },
  keepalive_requests:       { allowed: ['upstream'] },
  keepalive_time:           { allowed: ['upstream'] },
  keepalive_timeout_upstream: { allowed: ['upstream'] },
  least_time:               { allowed: ['upstream'], note: 'NGINX Plus 전용 지시자입니다. 오픈소스 nginx에서는 동작하지 않습니다.' },
  zone:                     { allowed: ['upstream'] },
  hash:                     { allowed: ['upstream'] },
}

// Which contexts a block is allowed in
const BLOCK_RULES = {
  events:   { allowed: ['main'] },
  http:     { allowed: ['main'] },
  stream:   { allowed: ['main'] },
  mail:     { allowed: ['main'] },
  upstream: { allowed: ['http', 'stream'] },
  server:   { allowed: ['http', 'stream', 'mail'] },
  location: { allowed: ['server', 'location'] },
  geo:      { allowed: ['http'] },
  map:      { allowed: ['http'] },
  split_clients: { allowed: ['http'] },
  limit_req_zone: { allowed: ['http'] },
  limit_conn_zone: { allowed: ['http'] },
}

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────

function findDirective(children, name) {
  for (const n of children) {
    if (n.type === 'directive' && n.name === name) return n.values.join(' ')
  }
  return null
}

function findAllDirectives(children, name) {
  return children
    .filter(n => n.type === 'directive' && n.name === name)
    .map(n => n.values.join(' '))
}

function walkBlocks(nodes, blockName, cb) {
  for (const n of nodes) {
    if (n.type === 'block') {
      if (n.name === blockName) cb(n)
      walkBlocks(n.children, blockName, cb)
    }
  }
}

// ─────────────────────────────────────────
// Feature 1: Context Validator
// ─────────────────────────────────────────

function validateContext(nodes, context, issues, contextPath) {
  for (const node of nodes) {
    if (node.type === 'directive') {
      const rule = DIRECTIVE_RULES[node.name]
      if (rule) {
        if (!rule.allowed.includes(context)) {
          issues.push({
            severity: 'error',
            category: 'Context',
            message: `'${node.name}'은 '${context}' 블록에서 사용할 수 없습니다. 허용 컨텍스트: ${rule.allowed.join(', ')}`,
            context: contextPath,
          })
        } else if (rule.note) {
          issues.push({
            severity: 'warning',
            category: 'Context',
            message: `'${node.name}': ${rule.note}`,
            context: contextPath,
          })
        }
      }
    }

    if (node.type === 'block') {
      const blockRule = BLOCK_RULES[node.name]
      if (blockRule && !blockRule.allowed.includes(context)) {
        issues.push({
          severity: 'error',
          category: 'Context',
          message: `'${node.name} {}' 블록은 '${context}' 컨텍스트에서 사용할 수 없습니다. 허용: ${blockRule.allowed.join(', ')}`,
          context: contextPath,
        })
      }

      // Special: alias + root in same location
      if (node.name === 'location') {
        const hasRoot  = node.children.some(c => c.type === 'directive' && c.name === 'root')
        const hasAlias = node.children.some(c => c.type === 'directive' && c.name === 'alias')
        if (hasRoot && hasAlias) {
          issues.push({
            severity: 'error',
            category: 'Context',
            message: `같은 location에 root와 alias를 동시에 사용할 수 없습니다. alias 사용 시 root는 무시됩니다.`,
            context: `${contextPath} > location ${node.params.join(' ')}`,
          })
        }
      }

      const childPath = `${contextPath} > ${node.name}${node.params.length ? ' ' + node.params.join(' ') : ''}`
      // `if` 블록은 독립 컨텍스트가 아니라 부모 컨텍스트를 상속
      const childContext = node.name === 'if' ? context : node.name
      validateContext(node.children, childContext, issues, childPath)
    }
  }
}

// ─────────────────────────────────────────
// Feature 3: SSL Security Scorer
// ─────────────────────────────────────────

function isSSLServer(serverChildren) {
  const listens = findAllDirectives(serverChildren, 'listen')
  const hasSslInListen = listens.some(v => /\bssl\b/.test(v) || /\b443\b/.test(v))
  const sslOn = findDirective(serverChildren, 'ssl')
  const hasCert = findDirective(serverChildren, 'ssl_certificate')
  return hasSslInListen || sslOn === 'on' || !!hasCert
}

function scoreSSL(ast, issues) {
  walkBlocks(ast, 'server', (block) => {
    if (!isSSLServer(block.children)) return

    const serverNames = findAllDirectives(block.children, 'server_name')
    const ctx = `server { ${serverNames.join(', ') || '(unnamed)'} }`

    // ssl_protocols — reject TLSv1.0 / TLSv1.1
    const protocols = findDirective(block.children, 'ssl_protocols')
    if (protocols) {
      if (/\bTLSv1\b(?!\.[23])/.test(protocols)) {
        issues.push({ severity: 'error', category: 'SSL', message: 'TLSv1.0은 구식 프로토콜입니다. ssl_protocols에서 제거하세요.', context: ctx })
      }
      if (/TLSv1\.1/.test(protocols)) {
        issues.push({ severity: 'error', category: 'SSL', message: 'TLSv1.1은 구식 프로토콜입니다. ssl_protocols에서 제거하세요.', context: ctx })
      }
    }

    // ssl_ciphers — weak algorithms
    const ciphers = findDirective(block.children, 'ssl_ciphers')
    if (ciphers) {
      const weak = ['MD5', 'RC4', '3DES', 'DES', 'ANULL', 'ENULL', 'aNULL', 'eNULL', 'EXPORT', 'LOW']
      for (const w of weak) {
        if (ciphers.toUpperCase().includes(w.toUpperCase())) {
          issues.push({ severity: 'error', category: 'SSL', message: `ssl_ciphers에 취약한 알고리즘(${w})이 포함되어 있습니다.`, context: ctx })
        }
      }
    }

    // ssl_session_cache
    const sessionCache = findDirective(block.children, 'ssl_session_cache')
    if (!sessionCache || sessionCache === 'none' || sessionCache === 'off') {
      issues.push({ severity: 'warning', category: 'SSL', message: 'ssl_session_cache가 없으면 매 요청마다 풀 핸드셰이크가 발생해 성능이 저하됩니다. 권장: ssl_session_cache shared:SSL:10m;', context: ctx })
    }

    // ssl_stapling + resolver
    const stapling = findDirective(block.children, 'ssl_stapling')
    if (stapling === 'on') {
      const resolver = findDirective(block.children, 'resolver')
      // Also check http-level resolver (simplified: just check server level)
      if (!resolver) {
        issues.push({ severity: 'warning', category: 'SSL', message: 'ssl_stapling on; 설정 시 resolver가 필요합니다. 예: resolver 8.8.8.8 valid=300s;', context: ctx })
      }
    } else {
      issues.push({ severity: 'info', category: 'SSL', message: 'ssl_stapling on; 을 활성화하면 OCSP 응답을 캐시해 핸드셰이크 성능이 향상됩니다.', context: ctx })
    }

    // ssl_prefer_server_ciphers
    const preferServer = findDirective(block.children, 'ssl_prefer_server_ciphers')
    if (!preferServer) {
      issues.push({ severity: 'info', category: 'SSL', message: 'ssl_prefer_server_ciphers on; 을 권장합니다 (TLSv1.2 환경에서 서버 cipher 우선 적용).', context: ctx })
    }

    // ssl_buffer_size
    const bufSize = findDirective(block.children, 'ssl_buffer_size')
    if (!bufSize || bufSize === '16k') {
      issues.push({ severity: 'info', category: 'SSL', message: 'ssl_buffer_size 4k; 로 줄이면 소규모 응답에서 TTFB(첫 바이트 응답 시간)가 개선됩니다.', context: ctx })
    }
  })
}

// ─────────────────────────────────────────
// Feature 4: Upstream Configuration Linter
// ─────────────────────────────────────────

function lintUpstreams(ast, issues) {
  // Collect all upstream names that have keepalive
  const upstreamsWithKeepalive = new Set()

  // Walk only direct http children for upstream blocks
  function walkHttpChildren(nodes) {
    for (const n of nodes) {
      if (n.type !== 'block') continue
      if (n.name === 'http') {
        for (const child of n.children) {
          if (child.type === 'block' && child.name === 'upstream') {
            lintOneUpstream(child, issues, upstreamsWithKeepalive)
          }
        }
      } else if (n.name === 'stream') {
        for (const child of n.children) {
          if (child.type === 'block' && child.name === 'upstream') {
            lintOneUpstream(child, issues, upstreamsWithKeepalive)
          }
        }
      }
    }
  }

  walkHttpChildren(ast)

  // Cross-check: locations using proxy_pass to keepalive upstreams
  if (upstreamsWithKeepalive.size > 0) {
    walkBlocks(ast, 'location', (loc) => {
      const pp = findDirective(loc.children, 'proxy_pass')
      if (!pp) return

      // Extract upstream name from proxy_pass URL
      const upstreamName = pp.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
      if (!upstreamsWithKeepalive.has(upstreamName)) return

      const hasVersion = findDirective(loc.children, 'proxy_http_version') === '1.1'
      const connHeader = findAllDirectives(loc.children, 'proxy_set_header')
        .some(v => /^Connection\s+["']?["']?$/.test(v) || v === 'Connection ""' || v === "Connection ''")

      if (!hasVersion) {
        issues.push({
          severity: 'error',
          category: 'Upstream',
          message: `upstream '${upstreamName}'에 keepalive가 설정되어 있지만, proxy_pass를 사용하는 이 location에 'proxy_http_version 1.1;'이 없습니다. keepalive가 동작하지 않습니다.`,
          context: `location ${loc.params.join(' ')}`,
        })
      }
      if (!connHeader) {
        issues.push({
          severity: 'error',
          category: 'Upstream',
          message: `upstream '${upstreamName}'에 keepalive가 설정되어 있지만, 이 location에 'proxy_set_header Connection "";'가 없습니다. keepalive가 동작하지 않습니다.`,
          context: `location ${loc.params.join(' ')}`,
        })
      }
    })
  }
}

function lintOneUpstream(block, issues, upstreamsWithKeepalive) {
  const name = block.params.join(' ')
  const ctx = `upstream { ${name} }`
  const children = block.children

  const lbDirectives = ['ip_hash', 'least_conn', 'hash', 'random', 'least_time']
  const activeLb = lbDirectives.filter(d => children.some(c => c.type === 'directive' && c.name === d))

  // least_time: NGINX Plus only
  if (activeLb.includes('least_time')) {
    issues.push({ severity: 'warning', category: 'Upstream', message: `'least_time'은 NGINX Plus 전용 지시자입니다. 오픈소스 nginx에서는 동작하지 않습니다.`, context: ctx })
  }

  // Multiple LB methods
  if (activeLb.length > 1) {
    issues.push({ severity: 'error', category: 'Upstream', message: `로드밸런싱 방식(${activeLb.join(', ')})이 중복 선언되어 있습니다. 하나만 사용하세요.`, context: ctx })
  }

  // ip_hash + backup incompatibility
  const hasIpHash = activeLb.includes('ip_hash')
  const servers = children.filter(c => c.type === 'directive' && c.name === 'server')
  const hasBackup = servers.some(s => s.values.includes('backup'))

  if (hasIpHash && hasBackup) {
    issues.push({ severity: 'error', category: 'Upstream', message: `ip_hash와 backup 서버는 함께 사용할 수 없습니다. backup 파라미터를 제거하거나 다른 LB 방식을 사용하세요.`, context: ctx })
  }

  // keepalive tracking for cross-check
  const hasKeepalive = children.some(c => c.type === 'directive' && c.name === 'keepalive')
  if (hasKeepalive) {
    upstreamsWithKeepalive.add(name)
  }

  // Single server — max_fails / fail_timeout are ignored
  if (servers.length === 1) {
    const srv = servers[0]
    const hasMaxFails    = srv.values.some(v => v.startsWith('max_fails='))
    const hasFailTimeout = srv.values.some(v => v.startsWith('fail_timeout='))
    if (hasMaxFails || hasFailTimeout) {
      issues.push({ severity: 'warning', category: 'Upstream', message: `서버가 1개인 upstream에서 max_fails, fail_timeout 설정은 무시됩니다.`, context: ctx })
    }
  }

  // zone not set with state file
  const state = children.find(c => c.type === 'directive' && c.name === 'state')
  const zone  = children.find(c => c.type === 'directive' && c.name === 'zone')
  if (state && !zone) {
    issues.push({ severity: 'error', category: 'Upstream', message: `'state' 사용 시 'zone'이 필요합니다.`, context: ctx })
  }
}

// ─────────────────────────────────────────
// Public API
// ─────────────────────────────────────────

export function lint(ast) {
  const issues = []
  validateContext(ast, 'main', issues, 'main')
  scoreSSL(ast, issues)
  lintUpstreams(ast, issues)
  return issues
}

// Severity order for sorting
const SEV_ORDER = { error: 0, warning: 1, info: 2 }
export function sortedIssues(issues) {
  return [...issues].sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity])
}
