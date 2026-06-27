import { getPenetrationTypeLabel, getStageLabel } from './gap-rules.js';

export function renderPanel(container, node, config = {}) {
  if (!node) {
    container.innerHTML = '<div class="detail-panel__empty">点击左侧节点查看详情</div>';
    return;
  }

  container.innerHTML = '';
  const root = document.createElement('div');
  root.className = 'detail';
  root.append(
    titleBlock(node),
    metricsGrid(node),
    gapSection(node, config),
    companiesSection(node),
    techSection(node),
    downstreamAnchorsSection(node),
    footerBlock(node)
  );
  container.append(root);
}

function titleBlock(node) {
  const wrap = document.createElement('div');
  wrap.className = 'detail__header';
  wrap.innerHTML = `
    <div class="detail__title">${escapeHtml(node.name || '')}</div>
  `;
  return wrap;
}

function metricsGrid(node) {
  const grid = document.createElement('div');
  grid.className = 'detail-grid';
  const metrics = node.metrics || {};
  grid.append(
    card('市场规模', describeMarketSize(metrics.market_size, node)),
    card('CAGR', describeCagr(metrics.cagr, node)),
    card('价值量占比', describeValueShare(metrics.value_share, node)),
    card('竞争格局', describeCompetition(node.competition, node))
  );
  return grid;
}

function gapSection(node, config) {
  const sec = document.createElement('section');
  sec.className = 'section';
  sec.innerHTML = '<div class="section__title">供需缺口分析</div>';
  const axes = document.createElement('div');
  axes.className = 'axis-grid';
  axes.append(axisBlock('cycle', node.gap?.cycle_axis, config), axisBlock('penetration', node.gap?.penetration_axis, config));
  sec.append(axes);
  return sec;
}

function axisBlock(kind, axis = {}, config = {}) {
  const title = kind === 'cycle' ? '库存周期' : '渗透率';
  const stageLabel = getStageLabel(kind === 'cycle' ? 'cycle' : 'penetration', axis?.stage);
  const block = document.createElement('div');
  block.className = `axis-block axis-block--${kind}`;
  block.innerHTML = `
    <div class="axis-block__head">
      <span>${escapeHtml(title)}</span>
    </div>
    <div class="axis-stage">${escapeHtml(stageLabel)}</div>
    ${kind === 'penetration' ? `<div class="detail-field">渗透率：${escapeHtml(formatNullable(axis?.rate, '%'))}</div>` : ''}
    ${kind === 'penetration' ? `<div class="detail-field">类型：${escapeHtml(getPenetrationTypeLabel(axis?.type))}</div>` : ''}
    <div class="detail-field detail-field--muted">${escapeHtml(stripSource(axis?.evidence) || '暂无依据')}</div>
  `;
  if (kind === 'cycle') {
    const heatmap = heatmapBlock(axis?.heatmap, config?.heatmap);
    if (heatmap) block.append(heatmap);
  } else {
    const trend = penetrationTrendBlock(axis?.trend, config?.penetration_trend);
    if (trend) block.append(trend);
  }
  const breakdown = Array.isArray(axis?.breakdown) ? axis.breakdown : [];
  if (breakdown.length) {
    const list = document.createElement('div');
    list.className = 'breakdown-list';
    list.innerHTML = breakdown.map(item => `
      <div class="breakdown-row">
        <span>${escapeHtml(dimensionLabel(item.dimension))}</span>
        <span>${escapeHtml(getStageLabel(kind === 'cycle' ? 'cycle' : 'penetration', item.stage))}</span>
      </div>
    `).join('');
    block.append(list);
  }
  return block;
}

function penetrationTrendBlock(trend, config = {}) {
  if (!trend || !Array.isArray(trend.timeline) || !Array.isArray(trend.values) || !trend.values.length) return null;
  const values = trend.values.map(value => Number(value)).map(value => Number.isFinite(value) ? value : null);
  const points = values.map((value, index) => ({ value, label: trend.timeline[index] || `T${index + 1}` })).filter(point => point.value != null);
  if (!points.length) return null;

  const thresholds = normalizeThresholds(trend.thresholds || config?.thresholds);
  const unit = trend.unit || config?.unit || '%';
  const riskLine = Number(config?.risk_line ?? 30);
  const maxThreshold = Math.max(...thresholds.map(item => Number(item.max) || 0), 100);
  const maxValue = Math.max(...points.map(point => point.value), riskLine, 50);
  const yMax = Math.min(100, Math.max(50, Math.ceil(maxValue / 10) * 10, maxThreshold));
  const width = 520;
  const height = 250;
  const pad = { top: 18, right: 44, bottom: 44, left: 42 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const x = index => pad.left + (points.length === 1 ? plotW : (index / (points.length - 1)) * plotW);
  const y = value => pad.top + plotH - (Math.max(0, Math.min(yMax, value)) / yMax) * plotH;
  const linePoints = points.map((point, index) => `${x(index)},${y(point.value)}`).join(' ');
  const current = points[points.length - 1];
  const currentX = x(points.length - 1);
  const currentY = y(current.value);
  const currentStage = thresholdForValue(thresholds, current.value);
  const riskY = y(riskLine);

  const bandRects = [];
  let previousMax = 0;
  thresholds.forEach(item => {
    const max = Math.min(Number(item.max) || yMax, yMax);
    if (max <= previousMax) return;
    const top = y(max);
    const bottom = y(previousMax);
    bandRects.push(`
      <rect class="penetration-trend__band penetration-trend__band--${escapeHtml(item.color || item.stage || 'neutral')}"
        x="${pad.left}" y="${top}" width="${plotW}" height="${Math.max(0, bottom - top)}"></rect>
      <text class="penetration-trend__band-label" x="${pad.left + 8}" y="${top + 15}">${escapeHtml(item.name || item.stage || '')}</text>
    `);
    previousMax = max;
  });

  const tickValues = [0, 10, 30, 50, yMax].filter((value, index, arr) => value <= yMax && arr.indexOf(value) === index);
  const xLabels = trend.timeline.map((label, index) => ({ label, index })).filter((_, index, arr) => index === 0 || index === arr.length - 1 || index === Math.floor((arr.length - 1) / 2));
  const wrap = document.createElement('div');
  wrap.className = 'penetration-trend';
  wrap.innerHTML = `
    <div class="penetration-trend__head">
      <span>渗透率趋势</span>
      <span>${escapeHtml(current.value)}${escapeHtml(unit)} · ${escapeHtml(currentStage?.name || '阶段待判定')}</span>
    </div>
    <svg class="penetration-trend__chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="渗透率阈值带趋势图">
      ${bandRects.join('')}
      ${tickValues.map(value => `
        <line class="penetration-trend__grid" x1="${pad.left}" x2="${pad.left + plotW}" y1="${y(value)}" y2="${y(value)}"></line>
        <text class="penetration-trend__tick" x="${pad.left - 8}" y="${y(value) + 4}">${value}${unit}</text>
      `).join('')}
      <line class="penetration-trend__risk" x1="${pad.left}" x2="${pad.left + plotW}" y1="${riskY}" y2="${riskY}"></line>
      <text class="penetration-trend__risk-label" x="${pad.left + plotW - 86}" y="${riskY - 6}">30%见顶风险线</text>
      <polyline class="penetration-trend__line" points="${linePoints}"></polyline>
      ${points.map((point, index) => `<circle class="penetration-trend__dot" cx="${x(index)}" cy="${y(point.value)}" r="${index === points.length - 1 ? 4 : 2.5}"></circle>`).join('')}
      <g class="penetration-trend__current">
        <circle cx="${currentX}" cy="${currentY}" r="6"></circle>
        <text x="${Math.min(currentX + 10, width - 92)}" y="${currentY - 10}">${escapeHtml(String(current.value))}${escapeHtml(unit)}</text>
      </g>
      ${xLabels.map(item => `<text class="penetration-trend__x" x="${x(item.index)}" y="${height - 16}">${escapeHtml(formatQuarter(item.label))}</text>`).join('')}
    </svg>
    <div class="penetration-trend__note">${escapeHtml(trend.note || '按季度渗透率数值序列定位所处阶段。')}</div>
  `;
  return wrap;
}

function normalizeThresholds(thresholds) {
  const fallback = [
    { max: 10, stage: 'intro', name: '导入期', color: 'neutral' },
    { max: 30, stage: 'golden', name: '黄金爆发期', color: 'highlight' },
    { max: 50, stage: 'mature', name: '成熟分化期', color: 'caution' },
    { max: 100, stage: 'decline', name: '衰退期', color: 'danger' },
  ];
  const source = Array.isArray(thresholds) && thresholds.length ? thresholds : fallback;
  return source
    .map(item => ({ ...item, max: Number(item.max) }))
    .filter(item => Number.isFinite(item.max))
    .sort((a, b) => a.max - b.max);
}

function thresholdForValue(thresholds, value) {
  return thresholds.find(item => value <= item.max) || thresholds[thresholds.length - 1] || null;
}

function formatQuarter(label) {
  return String(label || '').replace(/(\d{4})-Q(\d)/, '$1Q$2');
}

function heatmapBlock(heatmap, config = {}) {
  if (!heatmap || !Array.isArray(heatmap.timeline) || !Array.isArray(heatmap.dimensions) || !heatmap.dimensions.length) return null;
  const wrap = document.createElement('div');
  wrap.className = 'heatmap';
  const palette = config?.palette || {};
  wrap.style.setProperty('--heat-positive', palette.positive || '#b76f22');
  wrap.style.setProperty('--heat-negative', palette.negative || '#5f7f6b');
  wrap.style.setProperty('--heat-flat', palette.flat || '#d8d2c5');
  wrap.style.setProperty('--heat-missing', palette.missing || '#f1ede4');
  const mode = config?.color_mode === 'direction' ? 'direction' : 'sentiment';
  wrap.innerHTML = `
    <div class="heatmap__head">
      <span>景气热力图</span>
      <span>${mode === 'sentiment' ? '景气含义' : '原始方向'}</span>
    </div>
    ${heatmapLegend(mode)}
    <div class="heatmap__grid"></div>
  `;
  const grid = wrap.querySelector('.heatmap__grid');
  grid.style.setProperty('--heat-columns', heatmap.timeline.length);
  grid.append(heatmapCorner(), ...heatmap.timeline.map(month => heatmapMonth(month)), heatmapTailHead());
  heatmap.dimensions.forEach(dimension => {
    grid.append(
      heatmapLabel(dimension.name || dimension.key || '-'),
      ...heatmap.timeline.map((month, index) => heatmapCell(dimension, month, index, mode)),
      heatmapStreak(dimension)
    );
  });
  return wrap;
}

function heatmapLegend(mode) {
  const labels = mode === 'direction'
    ? [
        ['positive', '上行'],
        ['negative', '下行'],
        ['flat', '持平'],
        ['missing', '缺失'],
      ]
    : [
        ['positive', '利好'],
        ['negative', '利空'],
        ['flat', '中性'],
        ['missing', '缺失'],
      ];
  return `
    <div class="heatmap__legend" aria-label="景气热力图图例">
      ${labels.map(([tone, label]) => `
        <span class="heatmap__legend-item">
          <i class="heatmap__legend-chip heatmap__legend-chip--${tone}" aria-hidden="true"></i>
          ${escapeHtml(label)}
        </span>
      `).join('')}
    </div>
  `;
}

function heatmapCorner() {
  const el = document.createElement('div');
  el.className = 'heatmap__corner';
  return el;
}

function heatmapMonth(month) {
  const el = document.createElement('div');
  el.className = 'heatmap__month';
  const parts = formatMonthParts(month);
  el.innerHTML = `
    <span>${escapeHtml(parts.year)}</span>
    <strong>${escapeHtml(parts.month)}</strong>
  `;
  return el;
}

function heatmapTailHead() {
  const el = document.createElement('div');
  el.className = 'heatmap__month heatmap__month--tail';
  el.textContent = '持续';
  return el;
}

function heatmapLabel(label) {
  const el = document.createElement('div');
  el.className = 'heatmap__label';
  el.textContent = label;
  return el;
}

function heatmapCell(dimension, month, index, mode) {
  const value = normalizedDirection(dimension.values?.[index]);
  const tone = heatmapTone(value, dimension.good_direction, mode);
  const note = Array.isArray(dimension.notes) ? dimension.notes[index] : '';
  const el = document.createElement('div');
  el.className = `heatmap__cell heatmap__cell--${tone}`;
  el.title = `${dimension.name || dimension.key || '-'} ${month}：${directionLabel(value)}${note ? `；${note}` : ''}`;
  el.setAttribute('aria-label', el.title);
  return el;
}

function heatmapStreak(dimension) {
  const values = Array.isArray(dimension.values) ? dimension.values.map(normalizedDirection) : [];
  const last = [...values].reverse().find(value => value != null);
  const count = trailingCount(values, last);
  const el = document.createElement('div');
  el.className = 'heatmap__streak';
  el.textContent = last ? `${directionSymbol(last)} 连续${count}月` : '-';
  return el;
}

function heatmapTone(value, goodDirection, mode) {
  if (value == null) return 'missing';
  if (value === 'flat') return 'flat';
  if (mode === 'direction') return value === 'up' ? 'positive' : 'negative';
  if (!goodDirection || goodDirection === 'flat') return 'flat';
  return value === goodDirection ? 'positive' : 'negative';
}

function trailingCount(values, direction) {
  if (!direction) return 0;
  let count = 0;
  for (let index = values.length - 1; index >= 0; index -= 1) {
    if (values[index] !== direction) break;
    count += 1;
  }
  return count;
}

function normalizedDirection(value) {
  return value === 'up' || value === 'down' || value === 'flat' ? value : null;
}

function directionLabel(value) {
  if (value === 'up') return '上行';
  if (value === 'down') return '下行';
  if (value === 'flat') return '持平';
  return '缺失';
}

function directionSymbol(value) {
  if (value === 'up') return '↑';
  if (value === 'down') return '↓';
  if (value === 'flat') return '→';
  return '-';
}

function formatMonth(month) {
  const text = String(month || '');
  const match = text.match(/^\d{4}-(\d{2})$/);
  return match ? `${Number(match[1])}月` : text;
}

function formatMonthParts(month) {
  const text = String(month || '');
  const match = text.match(/^(\d{4})-(\d{2})$/);
  if (!match) return { year: '', month: text };
  return { year: match[1], month: `${Number(match[2])}月` };
}

function companiesSection(node) {
  const sec = document.createElement('section');
  sec.className = 'section';
  const companies = Array.isArray(node.companies) ? node.companies : [];
  const rows = companies.map(company => `
    <tr>
      <td>${escapeHtml(company.name || '')}</td>
      <td>${escapeHtml(company.ticker || '-')}</td>
      <td>${escapeHtml(company.role || '-')}</td>
      <td>${escapeHtml(String(company.purity ?? '-'))}</td>
      <td>${escapeHtml(company.logic || '-')}</td>
    </tr>
  `).join('');
  sec.innerHTML = `
    <div class="section__title">核心上市公司</div>
    <div class="table-wrap">
      <table class="company-table">
        <thead>
          <tr><th>名称</th><th>代码</th><th>角色</th><th>纯度</th><th>受益逻辑</th></tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="5">暂无</td></tr>'}</tbody>
      </table>
    </div>
  `;
  return sec;
}

function techSection(node) {
  if (!node.tech_evolution) return emptySection('技术演进', '暂无');
  const sec = document.createElement('section');
  sec.className = 'section';
  const t = node.tech_evolution;
  const stages = Array.isArray(t.stages) ? t.stages.join(' -> ') : '-';
  sec.innerHTML = `
    <div class="section__title">技术演进</div>
    <div class="detail-field">阶段：${escapeHtml(stages)}</div>
    <div class="detail-field">当前：${escapeHtml(t.current || '-')}，风险：${escapeHtml(t.risk_level || '-')}</div>
    <div class="detail-field detail-field--muted">${escapeHtml(stripSource(t.note) || '')}</div>
  `;
  const bom = bomSection(node);
  if (bom) sec.append(bom);
  return sec;
}

function downstreamAnchorsSection(node) {
  const anchors = Array.isArray(node.downstream_anchors) ? node.downstream_anchors : [];
  if (!anchors.length) return null;
  const sec = document.createElement('section');
  sec.className = 'section';
  sec.innerHTML = `
    <div class="section__title">下游锚点</div>
    <div class="anchor-list">
      ${anchors.map(anchor => `
        <div class="anchor-row">
          <span>${escapeHtml(anchor.name || '-')}</span>
          <span>${escapeHtml(anchor.note || '')}</span>
        </div>
      `).join('')}
    </div>
  `;
  return sec;
}

function bomSection(node) {
  const generations = Array.isArray(node.bom_by_generation) ? node.bom_by_generation : [];
  if (!generations.length) return null;
  const wrap = document.createElement('div');
  wrap.className = 'bom';
  const activeGeneration = generations.some(item => item.generation === node.current_generation)
    ? node.current_generation
    : generations[0]?.generation;
  wrap.innerHTML = `
    <div class="bom__head">
      <div class="bom__title">代际 BOM 拆解</div>
      <div class="bom-tabs" role="tablist" aria-label="代际 BOM"></div>
    </div>
    <div class="bom__summary"></div>
    <div class="bom-trends"></div>
    <div class="bom-table-wrap"></div>
  `;
  const tabs = wrap.querySelector('.bom-tabs');
  const summary = wrap.querySelector('.bom__summary');
  const trends = wrap.querySelector('.bom-trends');
  const tableWrap = wrap.querySelector('.bom-table-wrap');

  generations.forEach(generation => {
    const button = document.createElement('button');
    button.className = 'bom-tab';
    button.type = 'button';
    button.textContent = generation.generation || '-';
    button.setAttribute('role', 'tab');
    button.addEventListener('click', () => renderGeneration(generation.generation));
    tabs.append(button);
  });

  function renderGeneration(generationName) {
    const generation = generations.find(item => item.generation === generationName) || generations[0];
    tabs.querySelectorAll('.bom-tab').forEach(button => {
      const active = button.textContent === generation.generation;
      button.classList.toggle('bom-tab--active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    summary.innerHTML = `
      <span>当前代际：${escapeHtml(generation.generation || '-')}</span>
      <span>Df：${escapeHtml(generation.df || '-')}</span>
      <span>${escapeHtml(generation.application || '-')}</span>
    `;
    trends.innerHTML = trendRows(generations);
    tableWrap.replaceChildren(bomTable(node, generation.items));
  }

  renderGeneration(activeGeneration);
  return wrap;
}

function footerBlock(node) {
  const footer = document.createElement('div');
  footer.className = 'detail__meta';
  footer.textContent = `最后更新：${node.layer_updated || '-'}`;
  return footer;
}

function card(label, value) {
  const el = document.createElement('div');
  el.className = 'card';
  el.innerHTML = `<div class="card__label">${escapeHtml(label)}</div><div class="card__value">${escapeHtml(value)}</div>`;
  return el;
}

function emptySection(title, text) {
  const sec = document.createElement('section');
  sec.className = 'section';
  sec.innerHTML = `<div class="section__title">${escapeHtml(title)}</div><div class="section__body">${escapeHtml(text)}</div>`;
  return sec;
}

function formatMetric(metric) {
  if (!metric) return '-';
  const parts = [];
  if (metric.value != null) {
    parts.push(metric.value);
    if (metric.unit) parts.push(metric.unit);
  }
  if (metric.year) parts.push(metric.year);
  if (metric.period) parts.push(metric.period);
  return parts.join(' ');
}

function describeMarketSize(metric, node) {
  const value = formatMetric(metric);
  if (value === '-') return `${node.name || '该环节'}暂未录入明确市场规模，后续需要补充统一口径。`;
  const year = metric?.year ? `${metric.year} 年` : '当前口径下';
  return `${node.name || '该环节'}在${year}对应市场规模约为 ${value}，可用于判断赛道容量和产业链权重。`;
}

function describeCagr(metric, node) {
  const value = formatMetric(metric);
  if (value === '-') return `${node.name || '该环节'}暂未录入可比增速，增长弹性需结合订单、价格和产能变化判断。`;
  const period = metric?.period ? `${metric.period} 期间` : '当前预测周期内';
  return `${node.name || '该环节'}在${period}的复合增速约为 ${value}，反映需求扩张和技术升级带来的成长强度。`;
}

function describeValueShare(metric, node) {
  const value = formatMetric(metric);
  if (value === '-') return `${node.name || '该环节'}暂未录入明确价值量占比，需结合下游 BOM 口径继续拆分。`;
  const relative = metric?.relative_to ? `相对 ${metric.relative_to}` : '在对应下游 BOM 中';
  return `${node.name || '该环节'}${relative}的价值量占比约为 ${value}，代表其在成本结构中的影响力。`;
}

function describeCompetition(competition, node) {
  const value = formatCompetition(competition);
  if (value === '-') return `${node.name || '该环节'}暂未形成明确竞争格局描述，需继续补充龙头份额和梯队信息。`;
  return `${node.name || '该环节'}的竞争格局可概括为：${value}。`;
}

function formatCompetition(competition) {
  if (!competition) return '-';
  const parts = [];
  const concentration = competition.concentration;
  const leaderShare = competition.leader_share;
  if (concentration?.value != null) {
    parts.push(`${concentration.label || 'CR'} ${concentration.value}${concentration.unit || '%'}`);
  }
  if (leaderShare?.value != null) {
    const leader = leaderShare.company ? `${leaderShare.company} ` : '';
    parts.push(`龙头 ${leader}${leaderShare.value}${leaderShare.unit || '%'}`);
  }
  if (competition.tiers) parts.push(competition.tiers);
  return parts.join('；') || '-';
}

function dimensionLabel(dimension) {
  const labels = {
    inventory: '库存',
    capex: '资本开支',
    demand: '需求',
    price: '价格',
    utilization: '开工率',
    rate: '渗透率',
    qualitative: '定性描述',
  };
  return labels[dimension] || dimension || '-';
}

function formatNullable(value, suffix = '') {
  return value == null || value === '' ? '-' : `${value}${suffix}`;
}

function bomTable(node, items = []) {
  const table = document.createElement('table');
  table.className = 'bom-table';
  table.innerHTML = '<thead><tr><th>材料</th><th>占比</th><th>标记</th></tr></thead>';
  const tbody = document.createElement('tbody');
  const rows = Array.isArray(items) ? items : [];
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="3">暂无</td></tr>';
    table.append(tbody);
    return table;
  }

  rows.forEach(item => {
    const row = document.createElement('tr');
    row.className = item?.is_new ? 'bom-table__row--new bom-table__row--interactive' : 'bom-table__row--interactive';
    row.tabIndex = 0;
    row.setAttribute('role', 'button');
    row.setAttribute('aria-expanded', 'false');
    row.innerHTML = `
      <td>
        <div class="bom-material">${escapeHtml(item?.material || item?.material_id || '-')}</div>
      </td>
      <td>${escapeHtml(formatNullable(item?.share, '%'))}</td>
      <td>${item?.is_new ? '<span class="bom-new">新增</span>' : '<span class="bom-existing">延续</span>'}</td>
    `;
    const detailRow = document.createElement('tr');
    detailRow.className = 'bom-leaders-row';
    detailRow.hidden = true;
    const cell = document.createElement('td');
    cell.colSpan = 3;
    cell.append(leaderCards(node, item));
    detailRow.append(cell);

    function toggle() {
      const next = detailRow.hidden;
      detailRow.hidden = !next;
      row.classList.toggle('bom-table__row--open', next);
      row.setAttribute('aria-expanded', next ? 'true' : 'false');
    }

    row.addEventListener('click', toggle);
    row.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      toggle();
    });

    tbody.append(row, detailRow);
  });
  table.append(tbody);
  return table;
}

function trendRows(generations) {
  const map = new Map();
  generations.forEach(generation => {
    const items = Array.isArray(generation.items) ? generation.items : [];
    items.forEach(item => {
      if (!item?.material_id) return;
      if (!map.has(item.material_id)) {
        map.set(item.material_id, {
          material_id: item.material_id,
          material: item.material || item.material_id,
          shares: new Map(),
          firstNew: Boolean(item.is_new),
        });
      }
      const entry = map.get(item.material_id);
      entry.material = item.material || entry.material;
      entry.shares.set(generation.generation, item.share);
      if (item.is_new) entry.firstNew = true;
    });
  });

  return [...map.values()].map(entry => {
    const values = generations.map(generation => entry.shares.get(generation.generation));
    const numeric = values.filter(value => value != null);
    const trend = trendLabel(values);
    const sequence = values.map(value => value == null ? '-' : `${value}%`).join(' → ');
    const width = numeric.length ? Math.min(100, Math.max(...numeric)) : 0;
    return `
      <div class="trend-row">
        <div class="trend-row__name">${escapeHtml(entry.material)}</div>
        <div class="trend-row__track"><span style="width:${escapeHtml(width)}%"></span></div>
        <div class="trend-row__values">${escapeHtml(sequence)}</div>
        <div class="trend-row__tag trend-row__tag--${escapeHtml(trend.type)}">${escapeHtml(trend.label)}</div>
      </div>
    `;
  }).join('');
}

function trendLabel(values) {
  const indexed = values
    .map((value, index) => ({ value, index }))
    .filter(item => item.value != null);
  if (!indexed.length) return { type: 'flat', label: '-' };
  if (indexed[0].index > 0) return { type: 'new', label: '新增' };
  const first = indexed[0].value;
  const last = indexed[indexed.length - 1].value;
  if (last > first) return { type: 'up', label: '上升' };
  if (last < first) return { type: 'down', label: '下降' };
  return { type: 'flat', label: '平稳' };
}

function leaderCards(node, bomItem) {
  const materialNode = findMaterialNode(node, bomItem);
  const wrap = document.createElement('div');
  wrap.className = 'leader-panel';
  if (!materialNode) {
    wrap.innerHTML = `
      <div class="leader-panel__note">暂无对应材料节点，后续可补充 ${escapeHtml(bomItem?.material_id || '-')} 的供应商数据。</div>
    `;
    return wrap;
  }

  const { precise, fallback } = matchCompanies(materialNode, bomItem);
  const title = precise.length
    ? `牌号龙头：${precise.length} 家`
    : '暂无牌号级龙头数据，以下为该材料大类公司';
  const cards = (precise.length ? precise : fallback).map(item => leaderCard(item.company, item.status, item.precise)).join('');
  wrap.innerHTML = `
    <div class="leader-panel__head">
      <span>${escapeHtml(title)}</span>
      <span>${escapeHtml(materialNode.name || materialNode.id || '-')}</span>
    </div>
    <div class="leader-grid">${cards || '<div class="leader-panel__note">暂无公司数据</div>'}</div>
  `;
  return wrap;
}

function findMaterialNode(node, bomItem) {
  const upstream = Array.isArray(node.upstream) ? node.upstream : [];
  const nodeId = bomItem?.node_id;
  if (nodeId) return upstream.find(item => item.id === nodeId) || null;
  return upstream.find(item => {
    if (item.id === bomItem?.material_id) return true;
    const grades = Array.isArray(item.grades) ? item.grades : [];
    return grades.some(grade => grade.grade_id === bomItem?.material_id);
  }) || null;
}

function matchCompanies(materialNode, bomItem) {
  const companies = Array.isArray(materialNode.companies) ? materialNode.companies : [];
  const precise = [];
  const fallback = [];
  companies.forEach(company => {
    const capability = company.capability;
    if (Array.isArray(capability?.materials)) {
      if (capability.materials.includes(bomItem?.material_id)) {
        precise.push({ company, status: capability.verification_status === '待核实' ? '待核实' : '可供', precise: true });
      }
      return;
    }
    fallback.push({ company, status: '牌号待核实', precise: false });
  });
  precise.sort((a, b) => Number(b.company.purity || 0) - Number(a.company.purity || 0));
  fallback.sort((a, b) => Number(b.company.purity || 0) - Number(a.company.purity || 0));
  return { precise, fallback };
}

function leaderCard(company, status, precise) {
  const capability = company.capability || {};
  const ticker = company.ticker || capability.verification_status || '待核实';
  return `
    <div class="leader-card ${precise ? 'leader-card--precise' : 'leader-card--fallback'}">
      <div class="leader-card__top">
        <div>
          <div class="leader-card__name">${escapeHtml(company.name || '-')}</div>
          <div class="leader-card__ticker">${escapeHtml(ticker)}</div>
        </div>
        <span class="leader-card__tag">${escapeHtml(status)}</span>
      </div>
      <div class="leader-card__meta">
        <span>${escapeHtml(company.role || '-')}</span>
        <span>纯度 ${escapeHtml(company.purity ?? '-')}</span>
        <span>${escapeHtml(capability.highest_grade || '大类供应商')}</span>
      </div>
      <div class="leader-card__logic">${escapeHtml(capability.note || company.logic || '-')}</div>
    </div>
  `;
}

function stripSource(value) {
  return String(value || '').replace(/来源[:：].*$/u, '').trim();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
