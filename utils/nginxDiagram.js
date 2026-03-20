/**
 * nginx AST → diagram data extractor
 * 서버 블록, 백엔드(proxy_pass/alias 대상), upstream, 연결 관계 추출
 */

export function extractDiagramData(ast) {
  const upstreamMap = new Map() // name → string[]
  const backendMap  = new Map() // key → backend node  (proxy: host, alias: path)
  const servers     = []

  // Pass 1: upstream 블록 수집
  function collectUpstreams(nodes) {
    for (const n of nodes) {
      if (n.type !== 'block') continue
      if (n.name === 'http' || n.name === 'stream') { collectUpstreams(n.children); continue }
      if (n.name === 'upstream') {
        const members = n.children
          .filter(c => c.type === 'directive' && c.name === 'server')
          .map(c => c.values.join(' '))
        upstreamMap.set(n.params[0], members)
      }
    }
  }

  function normalizeHost(target) {
    if (!target || target.startsWith('$')) return null
    try { return new URL(target).host } catch {
      return target.replace(/^https?:\/\//, '').split('/')[0] || null
    }
  }

  function getBackend(key, type) {
    if (backendMap.has(key)) return backendMap.get(key)
    const isUpstream = type === 'proxy' && upstreamMap.has(key)
    const bk = {
      id: `bk-${backendMap.size}`,
      host: key,
      type,           // 'proxy' | 'alias'
      isUpstream,
      upstreamServers: isUpstream ? upstreamMap.get(key) : [],
    }
    backendMap.set(key, bk)
    return bk
  }

  // Pass 2: server 블록 처리
  function processServer(node) {
    const serverNames = node.children
      .filter(c => c.type === 'directive' && c.name === 'server_name')
      .flatMap(c => c.values)
    const listens = node.children
      .filter(c => c.type === 'directive' && c.name === 'listen')
      .map(c => c.values.join(' '))
    const isSSL = listens.some(l => /\bssl\b/.test(l) || /\b443\b/.test(l))
    const hasInclude = node.children.some(c => c.type === 'include')

    const connMap  = new Map() // backendId → { backendId, paths[] }
    let hasStatic  = false

    for (const child of node.children) {
      if (child.type !== 'block' || child.name !== 'location') continue
      const path = child.params.join(' ')

      const proxyDir = child.children.find(c => c.type === 'directive' && c.name === 'proxy_pass')
      const aliasDir = child.children.find(c => c.type === 'directive' && c.name === 'alias')

      if (proxyDir) {
        const host = normalizeHost(proxyDir.values.join(' '))
        if (host) {
          const bk = getBackend(host, 'proxy')
          if (!connMap.has(bk.id)) connMap.set(bk.id, { backendId: bk.id, paths: [] })
          connMap.get(bk.id).paths.push(path)
        }
      } else if (aliasDir) {
        const aliasPath = aliasDir.values.join(' ')
        if (aliasPath) {
          const bk = getBackend(aliasPath, 'alias')
          if (!connMap.has(bk.id)) connMap.set(bk.id, { backendId: bk.id, paths: [] })
          connMap.get(bk.id).paths.push(path)
        }
      } else {
        if (child.children.some(c => c.type === 'directive' && c.name === 'root')) {
          hasStatic = true
        }
      }
    }

    servers.push({
      id: `srv-${servers.length}`,
      serverNames: serverNames.length ? serverNames : ['(unnamed)'],
      listens,
      isSSL,
      hasStatic,
      hasInclude,
      connections: [...connMap.values()],
    })
  }

  function walk(nodes) {
    for (const n of nodes) {
      if (n.type !== 'block') continue
      if (n.name === 'http' || n.name === 'stream') walk(n.children)
      else if (n.name === 'server') processServer(n)
    }
  }

  collectUpstreams(ast)
  walk(ast)
  return { servers, backends: [...backendMap.values()] }
}
