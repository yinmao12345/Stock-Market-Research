export async function loadProjectData(baseUrl) {
  const index = await readJson(new URL('data/index.json', baseUrl));
  const config = await readJson(new URL('data/config.json', baseUrl));
  const rawChains = new Map();
  for (const entry of index.chains || []) {
    await loadChain(entry.id, baseUrl, rawChains);
  }

  const resolvedChains = new Map();
  for (const entry of index.chains || []) {
    resolvedChains.set(entry.id, resolveNode(rawChains.get(entry.id), rawChains, new Set([entry.id])));
  }

  return { index, config, rawChains, resolvedChains };
}

function resolveNode(node, rawChains, stack) {
  if (Array.isArray(node)) return node.map(item => resolveNode(item, rawChains, stack));
  if (!node || typeof node !== 'object') return node;

  if (node.ref) {
    const refId = node.ref;
    if (!rawChains.has(refId)) throw new Error(`Unknown ref: ${refId}`);
    if (stack.has(refId)) throw new Error(`Circular ref detected: ${[...stack, refId].join(' -> ')}`);
    const merged = structuredClone(rawChains.get(refId));
    const overlays = { ...node };
    delete overlays.ref;
    return mergeNode(merged, overlays, rawChains, new Set([...stack, refId]));
  }

  return mergeNode(structuredClone(node), {}, rawChains, stack);
}

function mergeNode(base, overlays, rawChains, stack) {
  const out = {};
  const source = { ...base, ...overlays };
  for (const [key, value] of Object.entries(source)) {
    if (key === 'upstream' || key === 'children') {
      const list = Array.isArray(value) ? value : [];
      out[key] = list.map(item => resolveNode(item, rawChains, stack));
      continue;
    }
    if (key === 'ref') continue;
    out[key] = resolveNode(value, rawChains, stack);
  }
  if (out.id && !Array.isArray(out.upstream)) out.upstream = [];
  return out;
}

async function loadChain(id, baseUrl, rawChains) {
  if (rawChains.has(id)) return rawChains.get(id);
  const data = await readJson(new URL(`data/${id}.json`, baseUrl));
  rawChains.set(id, data);
  for (const refId of collectRefs(data)) {
    await loadChain(refId, baseUrl, rawChains);
  }
  return data;
}

function collectRefs(value, refs = new Set()) {
  if (Array.isArray(value)) {
    value.forEach(item => collectRefs(item, refs));
    return refs;
  }
  if (!value || typeof value !== 'object') return refs;
  if (value.ref) refs.add(value.ref);
  Object.values(value).forEach(item => collectRefs(item, refs));
  return refs;
}

async function readJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url.pathname}: ${res.status}`);
  return await res.json();
}
