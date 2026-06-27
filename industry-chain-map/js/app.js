import { loadProjectData } from './loader.js';
import { createGapRules } from './gap-rules.js';
import { createTreeRenderer } from './tree.js';
import { renderPanel } from './panel.js';

const host = document.getElementById('treeHost');
const panel = document.getElementById('detailPanel');
const workspace = document.getElementById('workspace');
const industryBar = document.getElementById('industryBar');
const panelResizer = document.getElementById('panelResizer');
const searchInput = document.getElementById('searchInput');
const fitBtn = document.getElementById('fitBtn');
const resetBtn = document.getElementById('resetBtn');

bootstrap().catch(error => {
  console.error(error);
  renderStartupError(error);
});

async function bootstrap() {
  const baseUrl = new URL('../', import.meta.url);
  const { index, config, resolvedChains } = await loadProjectData(baseUrl);
  const gapRules = createGapRules(config);

  const renderer = createTreeRenderer({
    host,
    onSelect: node => renderPanel(panel, node, config),
  });

  const majorChains = getMajorChains(index);
  const entryId = majorChains.find(item => item.id === index.default_chain)?.id || majorChains[0]?.id || index.default_chain || index.chains?.[0]?.id;

  function loadChain(chainId) {
    const entry = cloneChain(resolvedChains.get(chainId));
    if (!entry) throw new Error(`找不到产业链数据: ${chainId || '-'}`);
    annotateTree(entry, gapRules);
    renderer.setData(entry);
    searchInput.value = '';
    searchInput.closest('.search')?.classList.remove('search--miss');
    setActiveIndustry(chainId);
    requestAnimationFrame(() => renderer.fit());
  }

  renderIndustryBar(majorChains, entryId, loadChain);
  loadChain(entryId);

  fitBtn.addEventListener('click', () => renderer.fit());
  resetBtn.addEventListener('click', () => renderer.reset());
  searchInput.addEventListener('keydown', event => {
    if (event.key !== 'Enter') return;
    const match = renderer.findAndReveal(searchInput.value);
    searchInput.closest('.search')?.classList.toggle('search--miss', !match);
  });
  searchInput.addEventListener('input', () => {
    searchInput.closest('.search')?.classList.remove('search--miss');
  });
  setupResizablePanel(renderer);
  window.addEventListener('resize', () => renderer.update());
}

function getMajorChains(index) {
  return Array.isArray(index.chains) ? index.chains : [];
}

function renderIndustryBar(chains, activeId, onSelect) {
  if (!industryBar) return;
  industryBar.innerHTML = '';
  const label = document.createElement('span');
  label.className = 'industry-bar__label';
  label.textContent = '行业';
  industryBar.append(label);
  chains.forEach(chain => {
    const button = document.createElement('button');
    button.className = 'industry-tab';
    button.type = 'button';
    button.dataset.chainId = chain.id;
    button.textContent = chain.name || chain.id;
    button.setAttribute('aria-pressed', chain.id === activeId ? 'true' : 'false');
    button.addEventListener('click', () => onSelect(chain.id));
    industryBar.append(button);
  });
}

function setActiveIndustry(chainId) {
  if (!industryBar) return;
  industryBar.querySelectorAll('.industry-tab').forEach(button => {
    const active = button.dataset.chainId === chainId;
    button.classList.toggle('industry-tab--active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

function setupResizablePanel(renderer) {
  let frame = 0;
  let resizing = false;

  function applyWidth(clientX) {
    const rect = workspace.getBoundingClientRect();
    const width = clamp(rect.right - clientX, 360, Math.max(360, rect.width - 380));
    workspace.style.setProperty('--detail-width', `${width}px`);
    if (!frame) {
      frame = requestAnimationFrame(() => {
        frame = 0;
        renderer.update();
      });
    }
  }

  panelResizer.addEventListener('pointerdown', event => {
    resizing = true;
    workspace.classList.add('is-resizing');
    panelResizer.setPointerCapture(event.pointerId);
    applyWidth(event.clientX);
  });

  panelResizer.addEventListener('pointermove', event => {
    if (resizing) applyWidth(event.clientX);
  });

  panelResizer.addEventListener('pointerup', event => {
    resizing = false;
    workspace.classList.remove('is-resizing');
    panelResizer.releasePointerCapture(event.pointerId);
  });

  panelResizer.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const current = parseFloat(getComputedStyle(workspace).getPropertyValue('--detail-width')) || 380;
    const next = current + (event.key === 'ArrowLeft' ? 24 : -24);
    const rect = workspace.getBoundingClientRect();
    const width = clamp(next, 360, Math.max(360, rect.width - 380));
    workspace.style.setProperty('--detail-width', `${width}px`);
    renderer.update();
  });
}

function cloneChain(chain) {
  return structuredClone(chain);
}

function annotateTree(node, gapRules, visited = new Set()) {
  if (!node || typeof node !== 'object') return node;
  if (node.id && visited.has(node.id)) return node;
  if (node.id) visited.add(node.id);

  node.gap = node.gap || {};
  node.gap = gapRules.classify(node.gap);

  const upstream = Array.isArray(node.upstream) ? node.upstream : [];
  node.upstream = upstream;
  upstream.forEach(child => annotateTree(child, gapRules, visited));
  return node;
}

function renderStartupError(error) {
  host.innerHTML = `
    <div class="startup-error">
      <strong>页面初始化失败</strong>
      <div class="startup-error__message">${escapeHtml(error.message || String(error))}</div>
    </div>
  `;
  panel.innerHTML = `
    <div class="section">
      <div class="section__title">错误信息</div>
      <div class="error-text">${escapeHtml(error.stack || error.message || String(error))}</div>
    </div>
  `;
}

function clamp(value, min, max) {
  if (max < min) return min;
  return Math.max(min, Math.min(max, value));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
