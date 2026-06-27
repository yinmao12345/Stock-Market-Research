const CYCLE_STAGES = {
  bottom: { label: '底部', tone: 'cycle-bottom' },
  uptrend: { label: '上行', tone: 'cycle-uptrend' },
  peak: { label: '顶峰', tone: 'cycle-peak' },
  downtrend: { label: '下行', tone: 'cycle-downtrend' },
};

const PENETRATION_STAGES = {
  intro: { label: '导入期', tone: 'penetration-intro' },
  golden: { label: '黄金爆发期', tone: 'penetration-golden' },
  mature: { label: '成熟分化期', tone: 'penetration-mature' },
  decline: { label: '出清/衰退期', tone: 'penetration-decline' },
};

const PENETRATION_TYPES = {
  structural: '结构替代型',
  space_creating: '空间创造型',
  supply_chain: '供应链自主型',
  scenario: '场景跨界型',
};

const CYCLE_DIMENSIONS = ['inventory', 'capex', 'demand', 'price', 'utilization'];

const CYCLE_KEYWORDS = {
  inventory: {
    bottom: ['被动去库', '去库', '库存消费比下行', '出清'],
    uptrend: ['去库尾声', '底部回补', '主动补库', '拐点向上', '订单能见度', '交货周期延长'],
    peak: ['补库到极致', '库存消费比上行', '订单饱满'],
    downtrend: ['被动累库', '库存走高', '主动补库终结'],
  },
  capex: {
    bottom: ['停扩产', '项目延期', '资本开支负增'],
    uptrend: ['新增投产极少', '扩产释放滞后', '供给释放滞后'],
    peak: ['扎堆扩产', '大幅放量', '资本开支高增'],
    downtrend: ['产能集中投产', 'CAPEX砍缩', '扩产砍缩'],
  },
  demand: {
    bottom: ['需求疲软', '磨底', '托底'],
    uptrend: ['边际修复', '需求持续向上', '成长加速', '放量', '高端占比持续扩大'],
    peak: ['高速爆发', '订单饱满', '高位走平'],
    downtrend: ['需求下滑', '增速放缓', '大幅放缓'],
  },
  price: {
    bottom: ['跌破成本', '筑底'],
    uptrend: ['价格上调', '涨价', '量价齐升', '拐头上行'],
    peak: ['冲高', '滞涨', '横盘'],
    downtrend: ['杀跌', '走弱', '价格战'],
  },
  utilization: {
    bottom: ['低位', '关停', '减产'],
    uptrend: ['复产', '爬坡', '产能利用率约 90', '产能利用率约 92', '产能利用率约 95'],
    peak: ['满产', '超负荷', '高位'],
    downtrend: ['降开工', '高位回落'],
  },
};

const PENETRATION_KEYWORDS = {
  intro: ['试产', '小众', '低基数', '初期', '公募持仓极低'],
  golden: ['爆发', '供给缺口', '量价齐升', '高端占比持续扩大', '国产替代', '份额重构'],
  mature: ['增速放缓', '过剩', '价格战', 'ROE回落', '向龙头集中'],
  decline: ['被替代', '衰退', '萎缩', '倾销', '减值'],
};

export function createGapRules(config = {}) {
  const rules = config.gap_rules || {};
  return {
    rules,
    classify(gap = {}) {
      return normalizeGap(gap);
    },
  };
}

export function normalizeGap(gap = {}) {
  if (hasDualAxes(gap)) {
    return {
      cycle_axis: normalizeCycleAxis(gap.cycle_axis),
      penetration_axis: normalizePenetrationAxis(gap.penetration_axis),
    };
  }

  return migrateLegacyGap(gap);
}

export function getStageLabel(axis, stage) {
  const dict = axis === 'penetration' ? PENETRATION_STAGES : CYCLE_STAGES;
  return dict[stage]?.label || stage || '-';
}

export function getSourceLabel(source) {
  if (source === 'research') return '研报';
  if (source === 'derived') return '推导';
  return '待补';
}

export function getPenetrationTypeLabel(type) {
  return PENETRATION_TYPES[type] || type || '-';
}

export function getStageTone(axis, stage) {
  const dict = axis === 'penetration' ? PENETRATION_STAGES : CYCLE_STAGES;
  return dict[stage]?.tone || null;
}

function hasDualAxes(gap) {
  return gap && typeof gap === 'object' && ('cycle_axis' in gap || 'penetration_axis' in gap);
}

function normalizeCycleAxis(axis = {}) {
  const source = axis.source || (axis.stage ? 'research' : 'derived');
  const indicators = fillCycleIndicators(axis.indicators || {});
  const inferred = inferCycleStage(indicators);
  return {
    stage: axis.stage ?? inferred.stage,
    source: axis.source ?? (axis.stage ? source : inferred.source),
    evidence: axis.evidence || inferred.evidence,
    source_ref: axis.source_ref || '',
    indicators,
    breakdown: Array.isArray(axis.breakdown) && axis.breakdown.length ? axis.breakdown : inferred.breakdown,
    heatmap: normalizeHeatmap(axis.heatmap),
  };
}

function normalizePenetrationAxis(axis = {}) {
  const indicators = axis.indicators || {};
  const inferred = inferPenetrationStage(axis.rate, indicators);
  return {
    stage: axis.stage ?? inferred.stage,
    source: axis.source ?? (axis.stage || axis.rate != null ? 'research' : inferred.source),
    evidence: axis.evidence || inferred.evidence,
    source_ref: axis.source_ref || '',
    rate: axis.rate ?? null,
    type: axis.type ?? null,
    indicators,
    breakdown: Array.isArray(axis.breakdown) && axis.breakdown.length ? axis.breakdown : inferred.breakdown,
    trend: normalizePenetrationTrend(axis.trend, axis.rate),
  };
}

function normalizeHeatmap(heatmap) {
  return heatmap && typeof heatmap === 'object' ? heatmap : null;
}

function normalizePenetrationTrend(trend, rate) {
  if (trend && typeof trend === 'object') return trend;
  if (rate == null || rate === '') return null;
  const numeric = Number(rate);
  if (!Number.isFinite(numeric)) return null;
  return {
    unit: '%',
    granularity: null,
    timeline: ['当前'],
    values: [numeric],
    thresholds: null,
    source_ref: '',
    note: '由当前渗透率数值生成的单点兜底序列。',
  };
}

function migrateLegacyGap(gap) {
  const indicators = gap.indicators || {};
  const sourceRef = extractSourceRef(gap.reasoning);
  const cycleIndicators = fillCycleIndicators({
    inventory: indicators.inventory_cycle ?? null,
    capex: null,
    demand: gap.reasoning || indicators.supply_tightness || null,
    price: gap.reasoning || null,
    utilization: indicators.capacity_utilization != null ? `产能利用率约 ${indicators.capacity_utilization}%` : null,
  });
  const cycle = normalizeCycleAxis({
    source: 'derived',
    evidence: gap.reasoning || legacyStatusEvidence(gap.status),
    source_ref: sourceRef,
    indicators: cycleIndicators,
  });
  const penetration = normalizePenetrationAxis({
    rate: indicators.penetration_rate ?? null,
    source: indicators.penetration_rate != null ? 'research' : 'derived',
    evidence: indicators.penetration_rate != null
      ? `研报给出渗透率约 ${indicators.penetration_rate}%。`
      : (gap.reasoning || ''),
    source_ref: sourceRef,
    type: null,
    indicators: {
      qualitative: gap.reasoning || null,
    },
  });
  return { cycle_axis: cycle, penetration_axis: penetration };
}

function fillCycleIndicators(indicators) {
  return Object.fromEntries(CYCLE_DIMENSIONS.map(key => [key, indicators[key] ?? null]));
}

function inferCycleStage(indicators) {
  const breakdown = CYCLE_DIMENSIONS
    .map(dimension => {
      const value = indicators[dimension];
      const stage = matchStage(value, CYCLE_KEYWORDS[dimension] || {});
      return { dimension, value, stage };
    })
    .filter(item => item.value != null && item.value !== '');

  const stage = winningStage(breakdown.map(item => item.stage).filter(Boolean), ['bottom', 'uptrend', 'peak', 'downtrend']);
  return {
    stage,
    source: stage ? 'derived' : null,
    evidence: stage ? '按库存周期维度词典投票推导。' : '',
    breakdown,
  };
}

function inferPenetrationStage(rate, indicators = {}) {
  if (rate != null && rate !== '') {
    const numeric = Number(rate);
    const stage = Number.isFinite(numeric)
      ? numeric < 10 ? 'intro' : numeric < 30 ? 'golden' : numeric <= 50 ? 'mature' : 'decline'
      : null;
    return {
      stage,
      source: stage ? 'research' : null,
      evidence: stage ? `按研报渗透率 ${rate}% 归类。` : '',
      breakdown: stage ? [{ dimension: 'rate', value: rate, stage }] : [],
    };
  }

  const text = Object.values(indicators || {}).filter(Boolean).join(' ');
  const stage = matchStage(text, PENETRATION_KEYWORDS);
  return {
    stage,
    source: stage ? 'derived' : null,
    evidence: stage ? '按渗透率阶段特征词推导。' : '',
    breakdown: stage ? [{ dimension: 'qualitative', value: text, stage }] : [],
  };
}

function matchStage(value, dictionary) {
  if (value == null || value === '') return null;
  const text = String(value);
  let best = null;
  let bestScore = 0;
  for (const [stage, keywords] of Object.entries(dictionary)) {
    const score = keywords.reduce((count, keyword) => count + (text.includes(keyword) ? 1 : 0), 0);
    if (score > bestScore) {
      best = stage;
      bestScore = score;
    }
  }
  return best;
}

function winningStage(stages, order) {
  if (!stages.length) return null;
  const counts = new Map();
  stages.forEach(stage => counts.set(stage, (counts.get(stage) || 0) + 1));
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (ranked.length > 1 && ranked[0][1] === ranked[1][1]) {
    const first = order.indexOf(ranked[0][0]);
    const second = order.indexOf(ranked[1][0]);
    if (first >= 0 && second >= 0 && Math.abs(first - second) === 1) {
      return `${order[Math.min(first, second)]}->${order[Math.max(first, second)]}`;
    }
  }
  return ranked[0][0];
}

function extractSourceRef(text = '') {
  const match = String(text).match(/来源：([^，。；;]+)/);
  return match ? match[1] : '';
}

function legacyStatusEvidence(status) {
  return status ? `旧 gap.status=${status}，仅作为迁移参考，已按双轴重新归类。` : '';
}
