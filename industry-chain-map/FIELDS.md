# FIELDS.md 字段字典

本项目数据字段的唯一权威定义。记录字段的类型、单位、JSON 位置、显示方式和填写要求,**不记录任何具体产业链的数据内容**(产业数据进度见 `PROGRESS.md`,数据本体在 `data/*.json`)。

## 怎么用这份文档

- 改任何字段前先读本文档,改完按"五处同步"纪律落实(见下)。
- 表格只列每个字段**真正有内容**的信息;纯展示字段不写计算规则(默认即"不参与计算")。
- 计算逻辑本身在 `js/gap-rules.js`,本文档只描述行为;计算参数在 `data/config.json`;显示逻辑在 `js/panel.js`、`js/tree.js`;schema 目前无独立文件,以本文档为准。

## 五处同步纪律

任何字段的增删改,必须同步检查这五处并改到一致,再更新本文档:
① 数据 `data/*.json` ② schema(本文档) ③ 数据提取模板 `updates/数据提取模板.md` ④ 推导规则 `js/gap-rules.js` ⑤ 界面渲染(节点缩略 + 详情面板 + CSS)。
新增产业链只是在现有 schema 下填 `data/`,**不需要改本文档**。

---

## 节点基础字段

每个产业链节点对象的顶层字段。

| 字段 | 类型 / 单位 | JSON 位置 | 显示方式 | 填写要求 |
|---|---|---|---|---|
| `id` | 字符串 | 节点对象 `id`;`index.json.chains[].id` 为产业链入口 | 详情面板标题区显示为 `ID`,参与节点搜索 | 必填,小写英文/数字/下划线,同一树内唯一;跨产业复用通用环节时保持同一 id |
| `name` | 字符串 | 节点对象 `name`;`index.json.chains[].name` 为入口名 | 画布节点主标题、详情面板标题、上游表 | 必填,行业通用简洁中文名 |
| `layer_updated` | 字符串 | 节点对象 `layer_updated` | 详情面板底部"最后更新" | 推荐填,`YYYY-MM` 或 `YYYY-MM-DD`;缺失显示 `-` |
| `upstream` | 数组 | 节点对象 `upstream`,元素为完整节点或含 `ref` 的引用 | 画布据此生成可展开树;详情面板上游表 | 可选;已有通用环节优先用 `ref` 复用 |
| `ref` | 字符串 | 常见于 `upstream[]` 元素 | 上游表显示 `ref`,缩略不显示 | 引用已有权威节点,避免复制整节点;加载阶段解析为完整节点,解析失败应报错 |
| `downstream_anchors` | 数组,元素含 `name`/`note` | 节点对象顶层,与 `upstream` 同级 | 详情面板"下游锚点"列表;主图不生成节点 | 仅标注下游需求来源/场景、不建独立节点时填;`note` 写价值量或需求逻辑 |

## 材料牌号字典

`grades` 用于把 BOM 明细关联到具备该牌号能力的公司。仅材料节点需要,其余节点缺省或填 `[]`。

| 字段 | 类型 / 单位 | 位置 | 填写要求 |
|---|---|---|---|
| `grades` | 数组 | 材料节点顶层,如 `electronic_copper_foil.grades` | 从研报提取牌号、引入代际、关键性能与说明 |
| `grades[].grade_id` | 字符串 | — | 必填,同一节点内唯一,英文小写下划线;须与 BOM `material_id`、公司 `capability.materials` 对齐 |
| `grades[].name` | 字符串 | — | 必填,牌号/材料体系中文名 |
| `grades[].intro_gen` | 字符串 或 `null` | — | 该牌号首次成为关键 BOM 材料的代际,推荐填 |
| `grades[].df` | 字符串 或 `null` | — | 介电损耗等性能指标,尽量提取 |
| `grades[].note` | 字符串 或 `null` | — | 用途/价格/认证/封装场景等补充 |

> UI 用 `grades[].grade_id` 识别 BOM item 所属材料节点,并匹配 `companies[].capability.materials`;当前不单独展示完整字典,仅在 BOM 行展开牌号龙头时作为匹配依据。

## 指标字段

三个指标字段同构,均为 `{value, unit, ...}` 对象,均显示在详情面板顶部指标卡,均不参与计算。

### `metrics.market_size` / 市场规模

| 子字段 | 类型 / 单位 | 填写要求 |
|---|---|---|
| `value` | 数字优先 | 主数值,采集值 |
| `unit` | 字符串 | 如 `亿元`/`亿美元`,必填 |
| `year` | 数字/字符串 | 统计年份,推荐 `YYYY`,必注明 |
| `note` | 字符串 | 口径/来源/边界说明 |

填写要求:填最新可核验口径,必须带单位和年份,口径差异写入 `note`。节点缩略当前不显示。

### `metrics.cagr` / 复合增速

| 子字段 | 类型 / 单位 | 填写要求 |
|---|---|---|
| `value` | 数字优先 | 增速数值 |
| `unit` | 字符串,通常 `%` | 必注明 |
| `period` | 字符串 | 统计/预测周期,如 `2024-2028E`,必注明 |
| `note` | 字符串 | 口径/是否预测值 |

作为采集字段录入,当前不由程序计算。节点缩略当前不显示。

### `metrics.value_share` / 价值量占比

| 子字段 | 类型 / 单位 | 填写要求 |
|---|---|---|
| `value` | 数字优先 | 占比数值 |
| `unit` | 字符串,通常 `%` | 必注明 |
| `relative_to` | 字符串 | **必填**,占比的分母/参照层级,避免跨层级口径混用 |
| `note` | 字符串 | 口径/估算方法 |

**特殊显示逻辑**:若父节点存在 `current_generation` 与 `bom_by_generation`,本字段为兜底口径;节点缩略实际显示值由 UI 在运行时按父节点 `current_generation` 查 `bom_by_generation[].items[].share`,查不到才回退本字段。有技术代际时**必须**同时填 `bom_by_generation`。节点缩略显示 `价值量占比:XX%`。

---

## 代际 BOM 字段

解决"价值量占比随技术代际变化"的问题。`upstream` 负责拓扑,`bom_by_generation` 负责每代材料占比,两者解耦。无代际节点:`current_generation` 填 `null`、`bom_by_generation` 填 `[]`。

| 字段 | 类型 / 单位 | 填写要求 |
|---|---|---|
| `current_generation` | 字符串 或 `null` | 当前主流代际(如 `M8`);用于主图取值和详情面板默认选中;无代际填 `null` 占位 |
| `bom_by_generation` | 数组 | 逐代提取材料清单、占比、应用、来源;不同代际清单可不同 |
| `bom_by_generation[].generation` | 字符串 | 必填,同节点内唯一(如 `M7`/`M8`);用于匹配 `current_generation` |
| `bom_by_generation[].df` | 字符串 或 `null` | 该代际性能指标 |
| `bom_by_generation[].application` | 字符串 或 `null` | 应用/速率/平台/量产阶段 |
| `bom_by_generation[].source_ref` | 字符串 或 `null` | "研报名+日期",当前 UI 不直接展示 |
| `bom_by_generation[].items` | 数组 | 该代际完整 BOM 清单,见下 |
| `…items[].material_id` | 字符串 | 必填,牌号级稳定标识,优先复用 `grades[].grade_id`;无牌号字典的次级材料用材料级 id |
| `…items[].node_id` | 字符串 或 `null` | 所属上游材料大类节点 id;主图按此汇总当前代际占比,缺失时回退用 `material_id` 匹配 |
| `…items[].material` | 字符串 | 必填,材料显示名 |
| `…items[].share` | 数字,默认 `%` | 必填,该材料在该代际 BOM 中的占比,只填数值 |
| `…items[].is_new` | 布尔 | 该代际新增/首次成关键材料标记;`true` 时 UI 高亮"新增",非新增可省略 |

**计算与显示**:UI 按 `material_id` 聚合生成趋势速览,按 `current_generation` 为主图提供当前代际占比;详情面板技术演进区下方显示代际切换、趋势速览、BOM 明细表,`is_new` 项高亮。

---
---

## 市场规模多来源预测字段

`market_size_forecast` 位于节点对象顶层（与 `metrics`、`competition` 同级），为数组，每个元素为一个来源的预测数据。缺失时 UI 显示"暂缺"。该字段与 `metrics.market_size` 并存，前者为多来源详细表，后者为单一摘要值。

| 子字段 | 类型 / 单位 | 填写要求 |
|---|---|---|
| `source` | 字符串 | **必填**，研究机构名称，如 `Mordor Intelligence` |
| `base_year` | 数字 或 `null` | 基准年；缺失填 `null` |
| `base_value` | 数字 或 `null` | 基准年市场规模数值；缺失填 `null` |
| `base_unit` | 字符串 | 单位，如 `亿美元`；缺失填 `null` |
| `forecast_value` | 数字 或 `null` | 预测值；缺失填 `null` |
| `forecast_year` | 数字 或 `null` | 预测年份；缺失填 `null` |
| `cagr` | 数字 或 `null` | CAGR 百分比数值（不含 %）；缺失填 `null` |
| `cagr_period` | 字符串 或 `null` | CAGR 对应周期，如 `2025-2031`；缺失填 `null` |

填写要求：按研究机构逐一录入，缺失值填 `null`（UI 显示"暂缺"），**不要编纂数据**。

---

## 增长驱动力字段

`growth_drivers` 位于节点对象顶层，为字符串数组。缺失或为空时 UI 显示"暂缺"。

| 子字段 | 类型 / 单位 | 填写要求 |
|---|---|---|
| `growth_drivers[]` | 字符串数组 | 每条为一项核心驱动力描述，控制在 1-2 句话，标注细分场景和量化逻辑 |

示例：`AI 服务器：单台 AI 服务器 PCB/CCL 价值量可达传统服务器的 5-10 倍…`

---


## 竞争格局字段

`competition` 对象或 `null`（**找不到资料填 `null`，不得编造**）。非空时含全球市场地位、国内市场地位、竞争格局关键成因三部分。`ref` 引用对象不重复填。不参与缺口计算。详情面板第二窗格显示。

### `competition.global` / 全球市场地位

| 字段 | 类型 / 单位 | 填写要求 |
|---|---|---|
| `competition.global.companies` | 数组 | 全球主要参与公司列表，缺失填 `[]` |
| `…companies[].name` | 字符串 | **必填**，公司名称 |
| `…companies[].country` | 字符串 | 所属国家/地区；缺失填 `null` |
| `…companies[].share` | 数字 或 `null` | 全球市占率数值（不含 %）；缺失填 `null` |
| `…companies[].share_unit` | 字符串 | 单位，通常 `%` |
| `…companies[].description` | 字符串 | 简要介绍（技术路线、核心客户、竞争优势等 1-2 句） |
| `competition.global.note` | 字符串 | 数据来源/口径说明；缺失填 `null` |

### `competition.domestic` / 国内市场地位

| 字段 | 类型 / 单位 | 填写要求 |
|---|---|---|
| `competition.domestic.companies` | 数组 | 国内主要参与公司列表，缺失填 `[]` |
| `…companies[].name` | 字符串 | **必填**，公司名称 |
| `…companies[].share` | 数字 或 `null` | 国内市占率数值（不含 %）；缺失填 `null` |
| `…companies[].share_unit` | 字符串 | 单位，通常 `%` |
| `…companies[].description` | 字符串 | 简要介绍（技术路线、核心客户、竞争优势等 1-2 句） |
| `competition.domestic.note` | 字符串 | 数据来源/口径说明；缺失填 `null` |

### `competition.key_factors` / 竞争格局关键成因

| 字段 | 类型 / 单位 | 填写要求 |
|---|---|---|
| `competition.key_factors` | 字符串数组 | 促成当前竞争格局的关键原因，每条 1-2 句话概括（如技术壁垒、资源优势、客户认证壁垒、产能优势、规模效应、先发优势等）；缺失填 `[]` |

> 填写要求：公司列表按市占率从高到低排列。市占率缺失仍可录入公司名，`share` 填 `null`。`key_factors` 不限于示例类别，根据实际产业情况自由归纳。
## 缺口字段与双轴评价规则

> `gap` 拆成 `cycle_axis`(库存周期轴)与 `penetration_axis`(渗透率轴)两条独立轴,**不再**使用旧 `gap.status`、`gap.score`、顶层 `gap.breakdown`、`gap.indicators`。面板只展示阶段定位和来源,不展示交易策略。**这是项目中唯一参与 `gap-rules.js` 计算的字段组**,计算逻辑见该文件,参数见 `data/config.json.gap_rules`。

### `gap` / 缺口双轴对象

对象,位于节点 `gap`。必须含 `cycle_axis`、`penetration_axis` 两个子对象。按两轴分别填阶段、来源、依据、指标,映射不了的填 `null`。
**计算**:`gap-rules.js` 按词典和渗透率区间分别推导两轴阶段,研报明确值优先于推导值。
**显示**:节点缩略显示两轴阶段;详情面板分两区块展示阶段、来源、依据,悬停来源显示 `source_ref` 或推导依据。

### `gap.cycle_axis` / 库存周期轴

供需钟摆位置。含 `stage`、`source`、`evidence`、`source_ref`、`indicators`、`breakdown`。
四阶段:`bottom` 底部 / `uptrend` 上行 / `peak` 顶峰 / `downtrend` 下行。
**计算**:研报明确阶段则 `source=research` 直接采用;否则按七维指标词典投票,得票最多者为 `stage`,平票且相邻可写过渡阶段如 `uptrend->peak`,并在 `breakdown` 列明各维度命中。
**显示**:节点缩略 `周期:阶段(来源)`;详情面板第一块。

#### `gap.cycle_axis.indicators` / 库存周期维度指标

对象,各字段为字符串或 `null`,如 `inventory`、`capex`、`demand`、`price`、`utilization`。尽量填研报原文或归纳短句,无资料填 `null`。
**计算**:每个非空维度按权威词典匹配到 `bottom/uptrend/peak/downtrend` 之一,形成投票。

### `gap.penetration_axis` / 渗透率轴

成长生命周期位置。含 `stage`、`source`、`evidence`、`source_ref`、`rate`、`type`、`indicators`、`breakdown`、`trend`。`rate` 单位 `%`,只填数值。
四阶段:`intro` 导入期(0-10%) / `golden` 黄金爆发期(10-30%) / `mature` 成熟分化期(30-50%) / `decline` 出清衰退期(50%+ 或见顶/被替代)。
四类型:`structural` 结构替代 / `space_creating` 空间创造 / `supply_chain` 供应链自主 / `scenario` 场景跨界。
**计算**:研报给出渗透率数值则按区间归类标 `source=research`;只有定性描述则按特征词推导标 `source=derived`。`trend.values` 最新值可作 `rate` 权威来源,最终 `stage` 允许人工确认覆盖。
**显示**:节点缩略 `渗透:阶段(来源)`;详情面板第二块展示渗透率、类型、依据和带阈值带的趋势折线图(不展示热力图)。

### `gap.*.source` / 来源双轨

枚举字符串 `research`/`derived`,未知 `null`,位于两轴各自的 `source`。研报直接说阶段或给数值填 `research`,词典/区间推导填 `derived`。
**计算**:`research` 优先级高于 `derived`;`source=research` 时 `source_ref` 必填"研报名+日期"。
**显示**:阶段标签旁显示"研报/推导"小标记,悬停显示来源。

### `gap.*.breakdown` / 推导拆解

数组,元素至少含 `dimension`、`value`、`stage`,位于两轴各自的 `breakdown`。可为空;`source=derived` 时建议填。人工直接给 `research` 阶段时可空,推导时列命中依据。
**计算**:由 `gap-rules.js` 按七维词典或渗透率区间生成/补全。
**显示**:详情面板按行展示维度和命中阶段。

---

## 公司字段

`companies` 数组,元素为公司对象,可选(空数组表示暂无)。不参与缺口计算。优先登记业务纯度高、逻辑清晰的上市公司。
**显示**:节点缩略显示第一家公司名;详情面板以表格显示。
**排序注意**:树节点展开后会用第一家公司 `purity` 对同级节点排序。

| 字段 | 类型 / 单位 | 填写要求 |
|---|---|---|
| `companies[].name` | 字符串 | 必填,交易软件/研报常用简称;参与节点搜索 |
| `companies[].ticker` | 字符串 | 推荐,市场通用代码格式;缺失显示 `-` |
| `companies[].role` | 字符串 | 推荐,短语说明产品/材料/设备/客户位置 |
| `companies[].purity` | 数字 `0-100` | 推荐,业务纯度,须同一口径;缺失按 `0` 排序 |
| `companies[].logic` | 字符串 | 推荐,一句话受益逻辑,避免过长 |
| `companies[].capability` | 对象 或 缺省 | 牌号能力标签,见下;旧公司无此字段不报错,按大类供应商兜底 |
| `…capability.materials` | 字符串数组 | 非空 capability 必填,可供应牌号 id,须与 BOM `material_id` 对齐 |
| `…capability.highest_grade` | 字符串 | 推荐,最高牌号/技术代际 |
| `…capability.note` | 字符串 | 推荐,认证/量产/客户/产能依据 |
| `…capability.source_ref` | 字符串 | 推荐,资料名+日期,当前 UI 不直接展示 |
| `…capability.verification_status` | 字符串 或 `null` | 上市状态/代码存疑必填 `待核实`,**不得臆造股票代码** |

> **capability 匹配显示**:详情面板按 BOM `material_id` 精准匹配 `capability.materials`,按 `purity` 降序;无 capability 的公司作"大类供应商,牌号待核实"降级展示;无精准匹配则展示材料大类公司兜底。BOM 材料行展开后显示匹配公司卡片(公司名、代码或待核实、纯度、角色、最高代际、能力说明、可供/待核实标签)。

---

## 技术演进字段

`tech_evolution` 对象,位于节点 `tech_evolution`,推荐填(缺失时面板显示暂无)。不参与缺口计算。

| 字段 | 类型 / 单位 | 填写要求 |
|---|---|---|
| `tech_evolution.stages` | 字符串数组 | 技术路线/阶段有序列表,从旧到新、从基础到高阶 |
| `tech_evolution.current` | 字符串 | 当前最值得关注的阶段,从 `stages` 选或概括 |
| `tech_evolution.note` | 字符串 | 替代逻辑/催化因素/变化方向 |
| `tech_evolution.risk_level` | 字符串 | 迭代/替代/验证/商业化风险,建议枚举 `低`/`中`/`高` |

> **显示**:详情面板技术演进 section;若节点有 `bom_by_generation`,在本区块下方追加代际 BOM 拆解、趋势速览和新增材料高亮。`stages` 用箭头连接显示。节点缩略不显示。

---


## 需求分析字段

`demand_analysis` 对象,位于节点 `demand_analysis`,与 `gap` 平级,推荐填(缺失时详情面板不渲染该栏)。不参与缺口计算。

九因子框架(三层级 × 九因子),按 `polarity` 区分正向/反向/中性,反向因子不计入正向汇总。评星依据见提取模板 `updates/数据提取模板.md`。

| 字段 | 类型 / 单位 | 填写要求 |
|---|---|---|
| `demand_analysis.summary` | 字符串 | 推荐,一句判读小结,如"供需缺口驱动的周期成长,主引信=单机用量↑+高端占比↑" |
| `demand_analysis.tiers` | 数组,三层固定 | **必填**:breadth(广度)、depth(深度)、sustainability(持续性),顺序固定 |
| `demand_analysis.tiers[].tier` | 字符串 | 层级 key:breadth/depth/sustainability,固定 |
| `demand_analysis.tiers[].name` | 字符串 | 层级中文名:广度(用的人更多)/深度(每人用更多更贵)/持续性(缺口维持多久) |
| `demand_analysis.tiers[].factors` | 数组,每层3个因子固定 | 九个因子 key 固定不变;不适用该因子时 stars 按实际填、detail 说明"本轮无关" |
| `…factors[].key` | 字符串 | 因子 key,固定:penetration/scene_expansion/localization/unit_usage/premium_upgrade/tech_iteration/policy/cyclicality/restocking |
| `…factors[].name` | 字符串 | 因子中文名 |
| `…factors[].stars` | 数字 1-5 | 星级评定,界面用 ★☆ 显示 |
| `…factors[].polarity` | 枚举 `positive`/`reverse`/`neutral` | positive=正向(星多=需求好);reverse=反向⚠(星多=风险大,不计入正向汇总);neutral=择时中性。前8因子除 cyclicality 为 neutral 外均 positive;restocking 为 reverse |
| `…factors[].detail` | 字符串 | 该因子详情描述,含数据依据 |
| `…factors[].source_ref` | 字符串 | 推荐,资料名+日期,当前 UI 不直接展示 |

### 三层级九因子固定 key 对照

| 层级 | key | 中文名 | polarity |
|---|---|---|---|
| breadth | penetration | 渗透率提升 | positive |
| breadth | scene_expansion | 应用场景扩张 | positive |
| breadth | localization | 国产替代/份额转移 | positive |
| depth | unit_usage | 单位用量提升 | positive |
| depth | premium_upgrade | 高端结构升级(ASP) | positive |
| depth | tech_iteration | 替代升级/技术代际迭代 | positive |
| sustainability | policy | 政策/补贴驱动 | positive |
| sustainability | cyclicality | 季节性/行业周期 | neutral |
| sustainability | restocking | 补库存/囤货放大 | **reverse**⚠ |

> **显示规则**:详情面板单独一栏"需求分析",三层级分组,因子+★☆星级+详情。reverse 因子(补库存)用 ⚠ 图标+警示色区分,neutral 因子正常显示。原表第5列(评星依据)不显示在界面。null 时不渲染该栏。


## 索引与配置字段

非节点字段,位于 `data/index.json` 和 `data/config.json`。

| 字段 | 类型 / 位置 | 填写要求 |
|---|---|---|
| `index.json.default_chain` | 字符串 | 首次加载展示的产业链 id,必须匹配 `chains[].id` 之一 |
| `index.json.chains` | 数组,元素含 `id`/`name`/`note` | 可加载产业链入口列表,新增产业链必须更新 |
| `index.json.chains[].id` | 字符串 | 必填唯一,对应 `/data/{id}.json` |
| `index.json.chains[].name` | 字符串 | 必填,入口中文名 |
| `index.json.chains[].note` | 字符串 | 可选,入口简述 |
| `config.json.gap_rules` | 对象 | 缺口双轴规则的机器可读配置(阶段/维度/渗透率区间/类型/来源优先级),**必须与本文档双轴规则一致**;调整时先改本文档再同步配置和代码 |
| `config.json.gap_rules.cycle_axis` | 对象 | 库存周期轴阶段/维度/来源优先级配置 |
| `config.json.heatmap.color_mode` | 枚举 `sentiment`/`direction` | `sentiment`=景气含义(红/正色有利),`direction`=原始方向 |
| `config.json.heatmap.palette` | 对象 | 含 `positive`/`negative`/`flat`/`missing` 四类颜色,UI 作 CSS 变量应用 |
| `config.json.ref_map` | 对象 | 预留引用映射表,当前可为空对象,优先用加载器已支持的 `ref` 机制 |

> `gap_rules.js` 使用内置权威词典与该配置的阶段/类型结构执行归类;配置缺失时默认值也须与本文档一致。

---

## 新增产业链 SOP

新增产业链是按现有 schema 填新数据,**不需要登记进本文档**。

1. **建数据文件**:在 `/data` 建 `{chain_id}.json`,根节点含 `id`、`name`、`metrics`、`competition`、`gap`、`companies`、`tech_evolution`、`upstream`、`layer_updated` 等。
2. **复用环节**:已有上游/共用环节优先用 `ref` 引用,不要复制粘贴。
3. **更新索引**:`index.json.chains` 新增 `{id, name, note}`;需默认打开再改 `default_chain`。
4. **按 schema 填字段**:类型/单位/必填口径以本文档为准。市场规模带单位和年份,CAGR 带周期,价值量占比带参照对象;有技术代际须填 `current_generation` + `bom_by_generation`,无代际填 `null`/`[]`;竞争格局找不到填 `null`。
5. **双轴缺口**:`gap.cycle_axis` 填库存周期阶段和维度,`gap.penetration_axis` 填渗透率阶段、rate、type 和依据;映射不了填 `null`。
6. **不手填旧运行时字段**:不要填旧 `gap.status`、`gap.score`、顶层 `gap.breakdown`。
7. **写清双轴依据**:研报明确值填 `source=research` + `source_ref`;推导值填 `source=derived` + `evidence` + `breakdown`。
8. **需新增字段时**:必须同步五处(`data`/schema/提取模板/推导规则/界面渲染)并更新本文档。
9. **完成校验**:JSON 可加载、节点可展开、详情面板字段完整、缺口阶段符合本文档规则。
10. **登记进度**:把本次填充的产业链/节点和来源记入 `PROGRESS.md`(不写进本文档)。