const CYCLE_STAGES = {
  bottom: { label: "底部", tone: "cycle-bottom" },
  uptrend: { label: "上行", tone: "cycle-uptrend" },
  peak: { label: "顶峰", tone: "cycle-peak" },
  downtrend: { label: "下行", tone: "cycle-downtrend" },
};

const INVENTORY_CYCLE_PHASES = {
  active_restocking: { label: "主动补库存阶段", tone: "cycle-peak", description: "需求旺盛、企业主动增加库存，量价齐升" },
  passive_destocking: { label: "被动去库存阶段", tone: "cycle-uptrend", description: "需求回暖、库存被动消耗，价格企稳回升" },
  active_destocking: { label: "主动去库存阶段", tone: "cycle-bottom", description: "需求疲软、企业主动削减库存，价格承压" },
  passive_restocking: { label: "被动补库存阶段", tone: "cycle-downtrend", description: "需求转弱、库存被动累积，价格下行" },
};

const PENETRATION_STAGES = {
  intro: { label: "导入期", tone: "penetration-intro" },
  golden: { label: "黄金爆发期", tone: "penetration-golden" },
  mature: { label: "成熟分化期", tone: "penetration-mature" },
  decline: { label: "出清/衰退期", tone: "penetration-decline" },
};

const PENETRATION_TYPES = {
  structural: "结构替代型",
  space_creating: "空间创造型",
  supply_chain: "供应链自主型",
  scenario: "场景跨界型",
};

const CYCLE_DIMENSIONS = ["inventory", "price", "demand", "utilization", "capacity_util", "capex"];

const CYCLE_DIMENSION_LABELS = {
  inventory: "库存周转天数",
  price: "价格",
  demand: "需求",
  utilization: "开工率",
  capacity_util: "稼动率",
  capex: "资本开支",
};

const CYCLE_DIMENSION_DIRECTIONS = {
  inventory: "down",
  price: "up",
  demand: "up",
  utilization: "up",
  capacity_util: "up",
  capex: "up",
};

const CYCLE_KEYWORDS = {
  inventory: {
    bottom: ["被动去库", "去库", "库存消费比下行", "出清"],
    uptrend: ["去库尾声", "底部回补", "主动补库", "拐点向上", "订单能见度", "交货周期延长"],
    peak: ["补库到极致", "库存消费比上行", "订单饱满"],
    downtrend: ["被动累库", "库存走高", "主动补库终结"],
  },
  capex: {
    bottom: ["停扩产", "项目延期", "资本开支负增"],
    uptrend: ["新增投产极少", "扩产释放滞后", "供给释放滞后"],
    peak: ["扎堆扩产", "大幅放量", "资本开支高增"],
    downtrend: ["产能集中投产", "CAPEX砍缩", "扩产砍缩"],
  },
  demand: {
    bottom: ["需求疲软", "磨底", "托底"],
    uptrend: ["边际修复", "需求持续向上", "成长加速", "放量", "高端占比持续扩大"],
    peak: ["高速爆发", "订单饱满", "高位走平"],
    downtrend: ["需求下滑", "增速放缓", "大幅放缓"],
  },
  price: {
    bottom: ["跌破成本", "筑底"],
    uptrend: ["价格上调", "涨价", "量价齐升", "拐头上行"],
    peak: ["冲高", "滞涨", "横盘"],
    downtrend: ["杀跌", "走弱", "价格战"],
  },
  utilization: {
    bottom: ["低位", "关停", "减产"],
    uptrend: ["复产", "爬坡", "产能利用率约 90", "产能利用率约 92", "产能利用率约 95"],
    peak: ["满产", "超负荷", "高位"],
    downtrend: ["降开工", "高位回落"],
  },
};

const CYCLE_INDICATOR_DIRECTION_MAP = {
  inventory: {
    up: ["累库", "补库", "库存走高", "库存上升", "库存增加", "库存消费比上行", "被动累库", "主动补库", "补库到极致", "回补"],
    down: ["去库", "库存下降", "库存走低", "库存减少", "库存消费比下行", "被动去库", "主动去库", "出清", "去库尾声", "底部回补"],
    flat: ["库存平稳", "库存稳定", "持平"],
  },
  price: {
    up: ["涨价", "价格上调", "价格上行", "价格回升", "量价齐升", "冲高", "拐头上行", "强势", "维持强势", "维持上行"],
    down: ["降价", "价格下行", "杀跌", "走弱", "价格战", "跌破成本", "承压"],
    flat: ["企稳", "筑底", "横盘", "滞涨", "持平", "稳定"],
  },
  demand: {
    up: ["需求回升", "需求上行", "需求旺盛", "放量", "爆发", "暴涨", "加速", "增长", "持续向上", "边际修复", "订单饱满", "高端占比持续扩大", "供需紧张", "偏紧", "交货周期延长", "供不应求", "量价齐升"],
    down: ["需求下滑", "需求疲软", "放缓", "萎缩", "磨底", "低迷"],
    flat: ["走平", "高位走平", "平稳", "托底"],
  },
  utilization: {
    up: ["爬坡", "复产", "提升", "90", "92", "95", "高位", "满产", "超负荷"],
    down: ["降开工", "回落", "低位", "关停", "减产"],
    flat: ["稳定", "持平"],
  },
  capacity_util: {
    up: ["提升", "高稼动", "满稼动", "90", "95", "高位"],
    down: ["降稼动", "回落", "低位", "停线"],
    flat: ["稳定", "持平"],
  },
  capex: {
    up: ["扩产", "投产", "资本开支增加", "放量", "高增", "扎堆扩产"],
    down: ["停扩", "延期", "负增", "砍缩", "收缩"],
    flat: ["平稳", "持平"],
  },
};

const PENETRATION_KEYWORDS = {
  intro: ["试产", "小众", "低基数", "初期", "公募持仓极低"],
  golden: ["爆发", "供给缺口", "量价齐升", "高端占比持续扩大", "国产替代", "份额重构"],
  mature: ["增速放缓", "过剩", "价格战", "ROE回落", "向龙头集中"],
  decline: ["被替代", "衰退", "萎缩", "倾销", "减值"],
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
  const dict = axis === "penetration" ? PENETRATION_STAGES : CYCLE_STAGES;
  return dict[stage]?.label || stage || "-";
}

export function getSourceLabel(source) {
  if (source === "research") return "研报";
  if (source === "derived") return "推导";
  return "待补";
}

export function getPenetrationTypeLabel(type) {
  return PENETRATION_TYPES[type] || type || "-";
}

export function getStageTone(axis, stage) {
  const dict = axis === "penetration" ? PENETRATION_STAGES : CYCLE_STAGES;
  return dict[stage]?.tone || null;
}

export function getInventoryCyclePhase(indicators) {
  const invDir = inferIndicatorDirection("inventory", indicators.inventory);
  const priceDir = inferIndicatorDirection("price", indicators.price);
  const demandDir = inferIndicatorDirection("demand", indicators.demand);

  if (demandDir === "up" && invDir === "up" && (priceDir === "up" || priceDir === "flat")) {
    return "active_restocking";
  }
  if (demandDir === "up" && invDir === "down" && (priceDir === "up" || priceDir === "flat")) {
    return "passive_destocking";
  }
  if (demandDir === "down" && invDir === "down" && (priceDir === "down" || priceDir === "flat")) {
    return "active_destocking";
  }
  if (demandDir === "down" && invDir === "up" && (priceDir === "down" || priceDir === "flat")) {
    return "passive_restocking";
  }

  return null;
}

export function getInventoryCyclePhaseLabel(phase) {
  return INVENTORY_CYCLE_PHASES[phase]?.label || phase || "待判定";
}

export function getInventoryCyclePhaseDescription(phase) {
  return INVENTORY_CYCLE_PHASES[phase]?.description || "";
}

export function getInventoryCyclePhaseTone(phase) {
  return INVENTORY_CYCLE_PHASES[phase]?.tone || null;
}

function inferIndicatorDirection(dimension, text) {
  if (text == null || text === "") return null;
  const dict = CYCLE_INDICATOR_DIRECTION_MAP[dimension];
  if (!dict) return null;
  const textStr = String(text);
  let best = null;
  let bestScore = 0;
  for (const [dir, keywords] of Object.entries(dict)) {
    const score = keywords.reduce((count, kw) => count + (textStr.includes(kw) ? 1 : 0), 0);
    if (score > bestScore) {
      best = dir;
      bestScore = score;
    }
  }
  return bestScore > 0 ? best : null;
}

export function getCycleDimensionLabel(key) {
  return CYCLE_DIMENSION_LABELS[key] || key;
}

export function getCycleDimensionDirection(key) {
  return CYCLE_DIMENSION_DIRECTIONS[key] || "up";
}

export function generateHeatmapSummary(dimensions, timeline) {
  if (!Array.isArray(dimensions) || !dimensions.length) return [];

  return dimensions.map(dim => {
    const values = Array.isArray(dim.values) ? dim.values : [];
    const key = dim.key;
    const name = dim.name || getCycleDimensionLabel(key) || key;
    const goodDir = dim.good_direction || getCycleDimensionDirection(key) || 'up';

    const validValues = values.map(v => {
      if (v == null) return null;
      if (typeof v === "object") return v.direction || null;
      return v;
    });

    const upCount = validValues.filter(v => v === "up").length;
    const downCount = validValues.filter(v => v === "down").length;
    const flatCount = validValues.filter(v => v === "flat").length;
    const missingCount = validValues.filter(v => v == null).length;
    const total = validValues.length;

    if (missingCount === total) {
      return { key, name, summary: name + "数据暂未收集到有效信息，待后续补充。" };
    }

    const recent = [...validValues].reverse();
    let streak = 0;
    let streakDir = null;
    for (const v of recent) {
      if (v == null) break;
      if (streakDir === null) {
        streakDir = v;
        streak = 1;
      } else if (v === streakDir) {
        streak++;
      } else {
        break;
      }
    }

    function isFavorable(dir) {
      if (dir === 'flat') return 'neutral';
      return dir === goodDir ? 'favorable' : 'unfavorable';
    }

    let summary = "";
    const fav = isFavorable(streakDir);
    
    if (streakDir === "up" && streak >= 3) {
      summary = name + "近" + streak + "个月持续上行";
      summary += fav === 'favorable' ? "，景气改善明显。" : "，需关注趋势变化。";
    } else if (streakDir === "down" && streak >= 3) {
      summary = name + "近" + streak + "个月持续下行";
      summary += fav === 'favorable' ? "，趋势向好（该指标下行有利）。" : "，景气承压。";
    } else if (streakDir === "flat" && streak >= 3) {
      summary = name + "近期维持平稳，无明显方向性变化。";
    } else if (upCount > downCount && upCount >= total * 0.5) {
      summary = name + "在过去" + total + "个月中以改善为主，上行月份占比" + Math.round(upCount / (total - missingCount) * 100) + "%。";
    } else if (downCount > upCount && downCount >= total * 0.5) {
      summary = name + "在过去" + total + "个月中以下行为主，下行月份占比" + Math.round(downCount / (total - missingCount) * 100) + "%。";
      if (goodDir === 'down') summary += " 该指标下行趋势有利。";
    } else if (upCount === downCount && upCount > 0) {
      summary = name + "呈波动态势，上行与下行月份相当，方向尚不明朗。";
    } else {
      summary = name + "数据覆盖不足，趋势暂不明确（" + (total - missingCount) + "/" + total + "个月有数据）。";
    }

    return { key, name, summary };
  });
}


export function getCycleDimensionsMeta() {
  return CYCLE_DIMENSIONS.map(key => ({
    key,
    name: CYCLE_DIMENSION_LABELS[key] || key,
    good_direction: CYCLE_DIMENSION_DIRECTIONS[key] || "up",
  }));
}

function hasDualAxes(gap) {
  return gap && typeof gap === "object" && ("cycle_axis" in gap || "penetration_axis" in gap);
}

function normalizeCycleAxis(axis = {}) {
  const source = axis.source || (axis.stage ? "research" : "derived");
  const indicators = fillCycleIndicators(axis.indicators || {});
  const inferred = inferCycleStage(indicators);
  const phase = getInventoryCyclePhase(indicators);
  return {
    stage: axis.stage ?? inferred.stage,
    source: axis.source ?? (axis.stage ? source : inferred.source),
    evidence: axis.evidence || inferred.evidence,
    source_ref: axis.source_ref || "",
    indicators,
    breakdown: Array.isArray(axis.breakdown) && axis.breakdown.length ? axis.breakdown : inferred.breakdown,
    heatmap: normalizeHeatmap(axis.heatmap),
    inventory_cycle_phase: axis.inventory_cycle_phase ?? phase,
  };
}

function normalizePenetrationAxis(axis = {}) {
  const indicators = axis.indicators || {};
  const inferred = inferPenetrationStage(axis.rate, indicators);
  return {
    stage: axis.stage ?? inferred.stage,
    source: axis.source ?? (axis.stage || axis.rate != null ? "research" : inferred.source),
    evidence: axis.evidence || inferred.evidence,
    source_ref: axis.source_ref || "",
    rate: axis.rate ?? null,
    type: axis.type ?? null,
    indicators,
    breakdown: Array.isArray(axis.breakdown) && axis.breakdown.length ? axis.breakdown : inferred.breakdown,
    trend: normalizePenetrationTrend(axis.trend, axis.rate),
  };
}

function normalizeHeatmap(heatmap) {
  return heatmap && typeof heatmap === "object" ? heatmap : null;
}

function normalizePenetrationTrend(trend, rate) {
  if (trend && typeof trend === "object") return trend;
  if (rate == null || rate === "") return null;
  const numeric = Number(rate);
  if (!Number.isFinite(numeric)) return null;
  return {
    unit: "%",
    granularity: null,
    timeline: ["当前"],
    values: [numeric],
    thresholds: null,
    source_ref: "",
    note: "由当前渗透率数值生成的单点兜底序列。",
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
    utilization: indicators.capacity_utilization != null ? "产能利用率约 " + indicators.capacity_utilization + "%" : null,
  });
  const cycle = normalizeCycleAxis({
    source: "derived",
    evidence: gap.reasoning || legacyStatusEvidence(gap.status),
    source_ref: sourceRef,
    indicators: cycleIndicators,
  });
  const penetration = normalizePenetrationAxis({
    rate: indicators.penetration_rate ?? null,
    source: indicators.penetration_rate != null ? "research" : "derived",
    evidence: indicators.penetration_rate != null
      ? "研报给出渗透率约 " + indicators.penetration_rate + "%。"
      : (gap.reasoning || ""),
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
    .filter(item => item.value != null && item.value !== "");

  const stage = winningStage(breakdown.map(item => item.stage).filter(Boolean), ["bottom", "uptrend", "peak", "downtrend"]);
  return {
    stage,
    source: stage ? "derived" : null,
    evidence: stage ? "按库存周期维度词典投票推导。" : "",
    breakdown,
  };
}

function inferPenetrationStage(rate, indicators = {}) {
  if (rate != null && rate !== "") {
    const numeric = Number(rate);
    const stage = Number.isFinite(numeric)
      ? numeric < 10 ? "intro" : numeric < 30 ? "golden" : numeric <= 50 ? "mature" : "decline"
      : null;
    return {
      stage,
      source: stage ? "research" : null,
      evidence: stage ? "按研报渗透率 " + rate + "% 归类。" : "",
      breakdown: stage ? [{ dimension: "rate", value: rate, stage }] : [],
    };
  }

  const text = Object.values(indicators || {}).filter(Boolean).join(" ");
  const stage = matchStage(text, PENETRATION_KEYWORDS);
  return {
    stage,
    source: stage ? "derived" : null,
    evidence: stage ? "按渗透率阶段特征词推导。" : "",
    breakdown: stage ? [{ dimension: "qualitative", value: text, stage }] : [],
  };
}

function matchStage(value, dictionary) {
  if (value == null || value === "") return null;
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
      return order[Math.min(first, second)] + "->" + order[Math.max(first, second)];
    }
  }
  return ranked[0][0];
}

function extractSourceRef(text = "") {
  const match = String(text).match(/来源：([^，。；;]+)/);
  return match ? match[1] : "";
}

function legacyStatusEvidence(status) {
  return status ? "旧 gap.status=" + status + "，仅作为迁移参考，已按双轴重新归类。" : "";
}