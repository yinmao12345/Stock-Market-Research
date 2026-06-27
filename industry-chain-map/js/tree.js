import { getStageTone } from './gap-rules.js';

export function createTreeRenderer({ host, onSelect, onReady }) {
  const margin = { top: 30, right: 40, bottom: 30, left: 40 };
  const nodeWidth = 220;
  const nodeHalfWidth = nodeWidth / 2;
  const toggleOffset = nodeHalfWidth + 22;
  const nodeHeight = 56;
  const svg = d3.select(host).append('svg').attr('class', 'tree-svg');
  const g = svg.append('g');
  let baseTransform = d3.zoomIdentity;
  const zoom = d3.zoom().scaleExtent([0.3, 2.4]).on('zoom', event => {
    g.attr('transform', event.transform);
  });

  svg.call(zoom);

  let root = null;
  let currentData = null;
  let selectedId = null;
  let nodeMap = new Map();
  let width = 0;
  let height = 0;

  function setData(data) {
    currentData = data;
    root = d3.hierarchy(data, nodeChildren);
    root.x0 = 0;
    root.y0 = 0;
    selectedId = data.id;
    root.descendants().forEach((d, index) => {
      d.id = d.data.id || `${index}`;
      d._children = d.children;
      if (d.depth > 0) d.children = null;
    });
    update();
    onSelect?.(data);
    onReady?.();
  }

  function update() {
    if (!root) return;
    const hostRect = host.getBoundingClientRect();
    width = Math.max(hostRect.width, 800);
    height = Math.max(hostRect.height, 600);
    svg.attr('width', width).attr('height', height);

    d3.tree().nodeSize([78, 285])(root);

    const descendants = root.descendants();
    const links = root.links();
    const xExtent = d3.extent(descendants, d => d.x) || [0, 0];
    const yExtent = d3.extent(descendants, d => d.y) || [0, 0];
    const translateX = margin.left - yExtent[0] + 20;
    const translateY = margin.top + (height - (xExtent[1] - xExtent[0])) / 2 - xExtent[0];
    if (!svg.node().__zoom || isIdentity(svg.node().__zoom)) {
      baseTransform = d3.zoomIdentity.translate(translateX, translateY);
      svg.call(zoom.transform, baseTransform);
    }

    g.selectAll('path.link')
      .data(links, d => d.target.id)
      .join(
        enter => enter.append('path').attr('class', 'link').attr('d', d => horizontalLink(d.source, d.target)),
        update => update.attr('d', d => horizontalLink(d.source, d.target)),
        exit => exit.remove()
      );

    nodeMap = new Map(descendants.map(d => [d.id, d]));
    const node = g.selectAll('g.node-card').data(descendants, d => d.id);
    const nodeEnter = node.enter().append('g')
      .attr('class', d => nodeClasses(d))
      .attr('transform', d => `translate(${d.y},${d.x})`)
      .on('click', (event, d) => {
        event.stopPropagation();
        toggle(d);
        selectedId = d.data.id;
        update();
        onSelect?.(d.data);
      });

    nodeEnter.append('rect')
      .attr('class', 'node-card__rect')
      .attr('x', -nodeHalfWidth)
      .attr('y', -nodeHeight / 2)
      .attr('width', nodeWidth)
      .attr('height', nodeHeight);

    nodeEnter.append('text')
      .attr('class', 'node-card__label')
      .attr('text-anchor', 'middle')
      .attr('y', -6)
      .text(d => d.data.name || '');

    nodeEnter.append('text')
      .attr('class', 'node-card__sub')
      .attr('text-anchor', 'middle')
      .attr('y', 12)
      .text(d => compactMeta(d));

    const toggleEnter = nodeEnter.append('g')
      .attr('class', 'node-card__toggle')
      .attr('transform', d => `translate(${toggleX(d, toggleOffset)},0)`);

    toggleEnter.append('circle')
      .attr('class', 'node-card__toggle-circle')
      .attr('r', 8);

    toggleEnter.append('text')
      .attr('class', 'node-card__toggle-mark')
      .attr('text-anchor', 'middle')
      .attr('y', -1)
      .text(expandMark);

    const merged = node.merge(nodeEnter);
    merged
      .attr('class', d => nodeClasses(d))
      .attr('transform', d => `translate(${d.y},${d.x})`)
      .classed('node--selected', d => d.data.id === selectedId);

    merged.select('text.node-card__sub').text(d => compactMeta(d));
    merged.select('g.node-card__toggle')
      .attr('transform', d => `translate(${toggleX(d, toggleOffset)},0)`);
    merged.select('text.node-card__toggle-mark').text(expandMark);
    node.exit().remove();
  }

  function toggle(d) {
    if (Array.isArray(d.children) && d.children.length) {
      d._children = d.children;
      d.children = null;
    } else if (Array.isArray(d._children) && d._children.length) {
      d.children = d._children;
      d._children = null;
    }
    if (d.parent && Array.isArray(d.parent.children)) {
      d.parent.children.sort((a, b) => sortValue(b) - sortValue(a));
    }
  }

  function fit() {
    if (!root) return;
    update();
    let bounds;
    try {
      bounds = g.node().getBBox();
    } catch {
      return;
    }
    if (!bounds.width || !bounds.height) return;
    const parent = host.getBoundingClientRect();
    const fullWidth = bounds.width + 120;
    const fullHeight = bounds.height + 120;
    const scale = Math.min(parent.width / fullWidth, parent.height / fullHeight, 1.2);
    const tx = (parent.width - bounds.width * scale) / 2 - bounds.x * scale;
    const ty = (parent.height - bounds.height * scale) / 2 - bounds.y * scale;
    svg.transition().duration(250).call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
  }

  function reset() {
    if (!root) return;
    collapseAll(root, true);
    selectedId = currentData?.id;
    update();
    svg.transition().duration(250).call(zoom.transform, baseTransform);
  }

  function findAndReveal(term) {
    if (!root) return null;
    const query = normalizeSearch(term);
    if (!query) return null;
    const match = allDescendants(root).find(d => matchNode(d.data, query));
    if (!match) return null;
    let parent = match.parent;
    while (parent) {
      if (Array.isArray(parent._children) && parent._children.length) {
        parent.children = parent._children;
        parent._children = null;
      }
      parent = parent.parent;
    }
    selectedId = match.data.id;
    update();
    onSelect?.(match.data);
    requestAnimationFrame(() => centerOnSelected());
    return match.data;
  }

  function centerOnSelected() {
    if (!selectedId) return;
    const node = nodeMap.get(selectedId);
    if (!node) return;
    const transform = d3.zoomIdentity.translate(width / 2 - node.y, height / 2 - node.x).scale(1);
    svg.transition().duration(250).call(zoom.transform, transform);
  }

  function nodeClasses(d) {
    const classes = ['node-card'];
    const cycleTone = getStageTone('cycle', d.data.gap?.cycle_axis?.stage);
    const penetrationTone = getStageTone('penetration', d.data.gap?.penetration_axis?.stage);
    if (cycleTone) classes.push(`node--${cycleTone}`);
    if (penetrationTone) classes.push(`node--${penetrationTone}`);
    if (hasToggle(d)) classes.push('node-card--has-toggle');
    if (Array.isArray(d._children) && d._children.length) classes.push('node--collapsed');
    if (Array.isArray(d.children) && d.children.length) classes.push('node--expanded');
    if (d.data.id === selectedId) classes.push('node--selected');
    return classes.join(' ');
  }

  function collapseAll(node, keepChildren = false) {
    const kids = Array.isArray(node.children) ? node.children : Array.isArray(node._children) ? node._children : [];
    if (!keepChildren && kids.length) {
      node._children = kids;
      node.children = null;
    }
    for (const child of kids) collapseAll(child, false);
  }

  return { setData, update, fit, reset, findAndReveal, centerOnSelected };
}

function nodeChildren(node) {
  if (Array.isArray(node.upstream)) return node.upstream;
  if (Array.isArray(node.children)) return node.children;
  return [];
}

function expandMark(d) {
  if (Array.isArray(d._children) && d._children.length) return '+';
  if (Array.isArray(d.children) && d.children.length) return '−';
  return '';
}

function compactMeta(d) {
  const share = getDisplayValueShare(d);
  const value = share?.value == null ? '-' : `${share.value}${share.unit || '%'}`;
  return `价值量占比：${value}`;
}

function getDisplayValueShare(d) {
  const bomShare = getParentGenerationShare(d);
  if (bomShare) return bomShare;
  return d.data.metrics?.value_share;
}

function getParentGenerationShare(d) {
  const parent = d.parent?.data;
  if (!parent?.current_generation || !Array.isArray(parent.bom_by_generation)) return null;
  const generation = parent.bom_by_generation.find(item => item?.generation === parent.current_generation);
  const bomItems = generation?.items?.filter(item => (item?.node_id || item?.material_id) === d.data.id) || [];
  if (!bomItems.length) return null;
  const share = bomItems.reduce((sum, item) => sum + (Number(item.share) || 0), 0);
  if (!share) return null;
  return { value: share, unit: '%' };
}

function sortValue(d) {
  return Array.isArray(d.data.companies) && d.data.companies[0]?.purity ? d.data.companies[0].purity : 0;
}

function toggleX(d, offset) {
  return d.depth === 0 ? offset : -offset;
}

function hasToggle(d) {
  return (Array.isArray(d.children) && d.children.length) || (Array.isArray(d._children) && d._children.length);
}

function isIdentity(transform) {
  return transform.k === 1 && transform.x === 0 && transform.y === 0;
}

function horizontalLink(source, target) {
  const sourceX = source.y + 132;
  const targetX = target.y - 132;
  const midX = (sourceX + targetX) / 2;
  return `M${sourceX},${source.x}C${midX},${source.x} ${midX},${target.x} ${targetX},${target.x}`;
}

function matchNode(data, query) {
  return searchableValues(data).some(text => normalizeSearch(text).includes(query));
}

function allDescendants(node) {
  const result = [];
  walk(node);
  return result;

  function walk(current) {
    result.push(current);
    const kids = Array.isArray(current.children)
      ? current.children
      : Array.isArray(current._children)
        ? current._children
        : [];
    kids.forEach(walk);
  }
}

function searchableValues(data) {
  const companies = Array.isArray(data.companies) ? data.companies : [];
  return [
    data.id,
    data.name,
    data.ticker,
    ...companies.flatMap(company => [company?.name, company?.ticker, company?.role]),
  ].filter(Boolean);
}

function normalizeSearch(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/\.(sh|sz|bj|hk)$/i, '');
}
