/* DOM-independent model and layout. Also loadable by Node for regression tests. */
(function (scope) {
  'use strict';

  // ── Markdown 解析 ──────────────────────────────────────────
  function parseMarkdown(text) {
    let nodes = [];
    const stack = [],
      roots = [];
    let root = null,
      fence = null,
      inComment = false,
      pendingFloat = null,
      pendingColor = null;
    const rows = text.replace(/^\uFEFF/, '').split(/\r?\n/);
    for (let i = 0; i < rows.length; i++) {
      let line = rows[i];
      if (fence) {
        const close = line.match(/^\s*(`{3,}|~{3,})\s*$/);
        if (close && close[1][0] === fence[0] && close[1].length >= fence.length) fence = null;
        continue;
      }
      if (!inComment) {
        const open = line.match(/^\s*(`{3,}|~{3,})/);
        if (open) {
          fence = open[1];
          continue;
        }
      }
      const floatMarker = !inComment && line.match(/^\s*<!-- mindmap:float (\{.*\}) -->\s*$/);
      if (floatMarker) {
        try {
          const point = JSON.parse(floatMarker[1]);
          pendingFloat =
            Number.isFinite(point.x) && Number.isFinite(point.y)
              ? { x: point.x, y: point.y, line: i + 1 }
              : null;
        } catch {
          pendingFloat = null;
        }
        continue;
      }
      const colorMarker =
        !inComment && line.match(/^\s*<!-- mindmap:color (\d+|#[0-9a-f]{6}) -->\s*$/i);
      if (
        colorMarker &&
        (colorMarker[1][0] === '#' || Number.isSafeInteger(Number(colorMarker[1])))
      ) {
        pendingColor = {
          value: colorMarker[1][0] === '#' ? colorMarker[1].toLowerCase() : Number(colorMarker[1]),
          line: i + 1,
        };
        continue;
      }
      if (inComment) {
        if (!line.includes('-->')) continue;
        line = line.slice(line.indexOf('-->') + 3);
        inComment = false;
      }
      while (line.includes('<!--')) {
        const start = line.indexOf('<!--'),
          end = line.indexOf('-->', start + 4);
        if (end < 0) {
          line = line.slice(0, start);
          inComment = true;
          break;
        }
        line = line.slice(0, start) + line.slice(end + 3);
      }
      const m = line.match(/^(#+)\s+(.+?)\s*$/);
      if (!m) continue;
      const depth = m[1].length - 1;
      const label = m[2]
        .replace(/\s+#+\s*$/, '')
        .replace(/<br\s*\/?\s*>/gi, ' / ')
        .trim();
      if (!label) throw Error(`第 ${i + 1} 行格式错误：标题内容不能为空。`);
      if (depth && !stack[depth - 1])
        throw Error(`第 ${i + 1} 行格式错误：前面缺少上一级标题，请检查标题前的 # 数量。`);
      const parent = depth ? stack[depth - 1] : null;
      const node = {
        label,
        depth,
        parent,
        children: [],
        line: i + 1,
        startLine: Math.min(
          i + 1,
          depth <= 1 && pendingFloat ? pendingFloat.line : i + 1,
          pendingColor ? pendingColor.line : i + 1,
        ),
        explicitColor: pendingColor ? pendingColor.value : null,
        floating: depth <= 1 && pendingFloat ? { x: pendingFloat.x, y: pendingFloat.y } : null,
        side: 0,
        branch: 0,
      };
      if (parent) parent.children.push(node);
      else {
        roots.push(node);
        root ||= node;
      }
      pendingFloat = null;
      pendingColor = null;
      stack[depth] = node;
      stack.length = depth + 1;
      nodes.push(node);
    }
    if (!root) throw Error('文件格式错误：请至少添加一个“# 标题”作为中心主题。');
    // Promote the previous format's floating second-level topics, preserving source lines.
    const legacy = new Set(nodes.filter((n) => n.parent && n.depth === 1 && n.floating));
    const hasLegacyFloating = legacy.size > 0;
    const parents = new Set([...legacy].map((n) => n.parent));
    for (const parent of parents)
      parent.children = parent.children.filter((child) => !legacy.has(child));
    for (const n of legacy) {
      n.parent = null;
      roots.push(n);
    }
    const ordered = [],
      visit = roots.slice().reverse(),
      rootNames = new Map();
    while (visit.length) {
      const n = visit.pop(),
        names = n.parent ? n.parent.names : rootNames;
      const occurrence = names.get(n.label) || 0;
      names.set(n.label, occurrence + 1);
      n.depth = n.parent ? n.parent.depth + 1 : 0;
      n.key = (n.parent ? n.parent.key + '/' : '') + JSON.stringify(n.label) + '@' + occurrence;
      n.names = new Map();
      n.index = ordered.length;
      n.id = 'n' + n.index;
      n.total = 1;
      ordered.push(n);
      for (let i = n.children.length - 1; i >= 0; i--) visit.push(n.children[i]);
    }
    nodes = ordered;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      if (n.parent) n.parent.total += n.total;
      delete n.names;
    }
    let branch = 0;
    for (const r of roots) {
      const load = [0, 0];
      r.branch = branch;
      r.children
        .map((n, i) => ({ n, i }))
        .sort((a, b) => b.n.total - a.n.total || a.i - b.i)
        .forEach(({ n }) => {
          const side = load[0] <= load[1] ? 0 : 1;
          n.side = side ? 1 : -1;
          load[side] += n.total;
        });
      r.children.forEach((n) => {
        n.branch = branch++;
      });
      if (!r.children.length) branch++;
    }
    for (const n of nodes) {
      if (n.depth > 1) {
        n.side = n.parent.side;
        n.branch = n.parent.branch;
      }
      const explicit =
        typeof n.explicitColor === 'string' || n.depth === 1 ? n.explicitColor : null;
      n.color =
        explicit ??
        (n.depth > 1 || (n.depth === 1 && typeof n.parent.explicitColor === 'string')
          ? n.parent.color
          : n.branch);
      n.end = n.index + n.total;
    }
    return {
      root: roots[0],
      roots,
      nodes,
      byId: new Map(nodes.map((n) => [n.id, n])),
      hasLegacyFloating,
    };
  }

  // ── 文本测量与布局 ──────────────────────────────────────────
  function createMetricsCache(measure, limit = 4096) {
    const cache = new Map();
    const stats = { hits: 0, misses: 0, measurements: 0 };
    function get(label, depth) {
      const font = depth === 0 ? 28 : depth === 1 ? 21 : 18;
      const key = font + '|' + label;
      if (cache.has(key)) {
        stats.hits++;
        const result = cache.get(key);
        cache.delete(key);
        cache.set(key, result);
        return result;
      }
      stats.misses++;
      const fontCSS = `700 ${font}px Segoe UI, Microsoft YaHei, sans-serif`;
      const width = (text) => {
        stats.measurements++;
        return measure(text, fontCSS);
      };
      const lines = [];
      let line = '';
      for (const token of label.match(/[A-Za-z0-9_\-]+|\s+|[^A-Za-z0-9_\s\-]/gu) || []) {
        if (width(line + token) <= 260) {
          line += token;
          continue;
        }
        if (line.trim()) {
          lines.push(line.trim());
          line = '';
        }
        if (width(token) <= 260) {
          line = token.trimStart();
          continue;
        }
        for (const ch of token) {
          if (width(line + ch) > 260 && line) {
            lines.push(line);
            line = ch;
          } else line += ch;
        }
      }
      if (line.trim()) lines.push(line.trim());
      const lineHeight = Math.ceil(font * 1.25);
      let w = 16;
      for (const text of lines) w = Math.max(w, width(text) + 16);
      const result = { lines, font, weight: 700, lineHeight, w, h: lines.length * lineHeight + 8 };
      cache.set(key, result);
      if (cache.size > limit) cache.delete(cache.keys().next().value);
      return result;
    }
    return {
      get,
      stats,
      clear: () => cache.clear(),
      get size() {
        return cache.size;
      },
    };
  }

  function prepare(model, metrics, previousNodes = []) {
    let reusable;
    for (const n of model.nodes) {
      const key = (n.depth === 0 ? 28 : n.depth === 1 ? 21 : 18) + '|' + n.label;
      if (n.metricsKey === key) continue;
      reusable ||= new Map(
        previousNodes.filter((n) => n.measurement).map((n) => [n.metricsKey, n.measurement]),
      );
      const measured = reusable.get(key) || metrics.get(n.label, n.depth);
      Object.assign(n, measured);
      n.metricsKey = key;
      n.measurement = measured;
    }
  }

  function layout(rootOrRoots, collapsed) {
    const roots = Array.isArray(rootOrRoots) ? rootOrRoots : [rootOrRoots];
    const visible = [];
    let bottom = -Infinity;
    roots.forEach((r, i) => {
      const tree = layoutTree(r, collapsed, bottom + 160, i === 0);
      for (const n of tree) visible.push(n);
      for (const n of tree) bottom = Math.max(bottom, n.box.bottom);
    });
    return visible;
  }
  function layoutTree(root, collapsed, nextTop, first) {
    const visible = [],
      stack = [root];
    while (stack.length) {
      const n = stack.pop();
      visible.push(n);
      n.shown = collapsed.has(n.key) ? [] : n.children;
      for (let i = n.shown.length - 1; i >= 0; i--) stack.push(n.shown[i]);
    }
    for (let i = visible.length - 1; i >= 0; i--) {
      const n = visible[i];
      n.contentHeight = Math.max(0, n.shown.length - 1) * 8;
      for (const child of n.shown) n.contentHeight += child.span;
      n.span = Math.max(n.h, n.contentHeight);
    }
    root.x = root.floating ? root.floating.x : -root.w / 2;
    root.y = root.floating
      ? root.floating.y
      : first
        ? -root.h / 2
        : nextTop + root.span / 2 - root.h / 2;
    for (const side of [-1, 1]) {
      const branches = root.shown.filter((n) => n.side === side);
      let height = Math.max(0, branches.length - 1) * 24;
      for (const n of branches) height += n.span;
      let top = root.y + root.h / 2 - height / 2;
      const tasks = [];
      for (const n of branches) {
        tasks.push({ n, top, x: side < 0 ? root.x - 52 - n.w : root.x + root.w + 52 });
        top += n.span + 24;
      }
      while (tasks.length) {
        const { n, top, x } = tasks.pop();
        n.x = x;
        n.y = top + n.span / 2 - n.h / 2;
        let cursor = top + (n.span - n.contentHeight) / 2;
        for (const child of n.shown) {
          tasks.push({ n: child, top: cursor, x: side < 0 ? n.x - 36 - child.w : n.x + n.w + 36 });
          cursor += child.span + 8;
        }
      }
    }
    for (const n of visible) {
      const box = (n.box ||= {});
      box.x = n.x - (n.side < 0 ? 18 : 0);
      box.y = n.y;
      box.right = n.x + n.w + (n.side > 0 ? 18 : 0);
      box.bottom = n.y + n.h + (n.side === 0 ? 20 : 0);
      if (!n.parent || n.floating) {
        n.edgePath = null;
        n.edgeBox = null;
        n.edgeGeometry = null;
        continue;
      }
      const p = n.parent,
        side = n.side,
        x = side < 0 ? p.x : p.x + p.w;
      const y = p.y + p.h / 2,
        end = side < 0 ? n.x + n.w : n.x,
        endY = n.y + n.h / 2;
      const previous = n.edgeGeometry;
      if (
        previous &&
        previous.x === x &&
        previous.y === y &&
        previous.end === end &&
        previous.endY === endY &&
        previous.side === side
      )
        continue;
      n.edgeGeometry = { x, y, end, endY, side };
      n.edgePath = `M${x},${y} C${x + side * 18},${y} ${end - side * 18},${endY} ${end},${endY}`;
      n.edgeBox = {
        x: Math.min(x, end),
        right: Math.max(x, end),
        y: Math.min(y, endY),
        bottom: Math.max(y, endY),
      };
    }
    return visible;
  }

  function bounds(list) {
    const b = { x: Infinity, y: Infinity, right: -Infinity, bottom: -Infinity };
    for (const n of list) {
      b.x = Math.min(b.x, n.box.x);
      b.y = Math.min(b.y, n.box.y);
      b.right = Math.max(b.right, n.box.right);
      b.bottom = Math.max(b.bottom, n.box.bottom);
    }
    return b;
  }
  const intersects = (a, b) =>
    a.right >= b.x && a.x <= b.right && a.bottom >= b.y && a.y <= b.bottom;

  // Reserve actual node boxes, including their small fold-control area.
  // Empty space between branches and long connecting curves remains usable.
  function rootFootprint(model, root) {
    return model.nodes.slice(root.index, root.end).map((n) => ({ ...n.box }));
  }
  function nearestFreeOffset(shapes, obstacles, gap = 12) {
    if (!obstacles.length) return { x: 0, y: 0 };
    const padding = gap + 0.02;
    const sorted = obstacles.slice().sort((a, b) => a.y - b.y);
    const maxHeight = sorted.reduce((height, box) => Math.max(height, box.bottom - box.y), 0);
    function hasCollision(offset) {
      const epsilon = 1e-7;
      for (const a of shapes) {
        let lo = 0,
          hi = sorted.length;
        const minY = a.y + offset.y - padding - maxHeight;
        while (lo < hi) {
          const mid = (lo + hi) >>> 1;
          if (sorted[mid].y <= minY) lo = mid + 1;
          else hi = mid;
        }
        for (let i = lo; i < sorted.length && sorted[i].y < a.bottom + offset.y + padding; i++) {
          const b = sorted[i];
          if (
            a.x + offset.x < b.right + padding - epsilon &&
            a.right + offset.x > b.x - padding + epsilon &&
            a.y + offset.y < b.bottom + padding - epsilon &&
            a.bottom + offset.y > b.y - padding + epsilon
          ) {
            return true;
          }
        }
      }
      return false;
    }
    function nearestOnAxis(axis, limit) {
      const ends = new Map(),
        vertical = axis === 'y';
      for (const a of shapes) {
        const minY = a.y - padding - (vertical ? limit : 0);
        const maxY = a.bottom + padding + (vertical ? limit : 0);
        let lo = 0,
          hi = sorted.length;
        while (lo < hi) {
          const mid = (lo + hi) >>> 1;
          if (sorted[mid].y <= minY - maxHeight) lo = mid + 1;
          else hi = mid;
        }
        for (let i = lo; i < sorted.length && sorted[i].y < maxY; i++) {
          const b = sorted[i];
          if (b.bottom <= minY) continue;
          if (vertical && !(a.x < b.right + padding && a.right > b.x - padding)) continue;
          const start = vertical ? b.y - padding - a.bottom : b.x - padding - a.right;
          const end = vertical ? b.bottom + padding - a.y : b.right + padding - a.x;
          if (start < limit && end > -limit && end > (ends.get(start) ?? -Infinity))
            ends.set(start, end);
        }
      }
      const intervals = [...ends].sort((a, b) => a[0] - b[0]);
      let low, high;
      for (const [start, end] of intervals) {
        if (low === undefined) {
          low = start;
          high = end;
        } else if (start < high) high = Math.max(high, end);
        else {
          if (low < 0 && high > 0) return Math.abs(low) <= Math.abs(high) ? low : high;
          low = start;
          high = end;
        }
      }
      return low < 0 && high > 0 ? (Math.abs(low) <= Math.abs(high) ? low : high) : 0;
    }
    function extent(boxes) {
      const result = { x: Infinity, y: Infinity, right: -Infinity, bottom: -Infinity };
      for (const b of boxes) {
        result.x = Math.min(result.x, b.x);
        result.y = Math.min(result.y, b.y);
        result.right = Math.max(result.right, b.right);
        result.bottom = Math.max(result.bottom, b.bottom);
      }
      return result;
    }
    const distance = (offset) => offset.x * offset.x + offset.y * offset.y;
    const moving = extent(shapes),
      fixed = extent(obstacles);
    let best = [
      { x: fixed.x - padding - moving.right, y: 0 },
      { x: fixed.right + padding - moving.x, y: 0 },
      { x: 0, y: fixed.y - padding - moving.bottom },
      { x: 0, y: fixed.bottom + padding - moving.y },
    ].sort((a, b) => distance(a) - distance(b))[0];
    if (!hasCollision({ x: 0, y: 0 })) return { x: 0, y: 0 };
    // Axis solutions give a tight upper bound for the exact two-dimensional search.
    for (const axis of ['y', 'x']) {
      const limit = Math.sqrt(distance(best)),
        amount = nearestOnAxis(axis, limit);
      const candidate = axis === 'y' ? { x: 0, y: amount } : { x: amount, y: 0 };
      if (distance(candidate) < distance(best) && !hasCollision(candidate)) best = candidate;
    }
    // Each node pair forbids an open rectangle of translations. The closest
    // point outside their union lies on x=0 or a rectangle's vertical boundary.
    // Sweep those boundaries; a range-add tree tracks the closest uncovered y.
    // Unlike a capped local search this cannot skip a nearby diagonal opening.
    const limit2 = distance(best),
      limit = Math.sqrt(limit2),
      columns = new Map();
    for (const a of shapes) {
      let lo = 0,
        hi = sorted.length;
      const minY = a.y - padding - limit - maxHeight;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (sorted[mid].y <= minY) lo = mid + 1;
        else hi = mid;
      }
      for (let i = lo; i < sorted.length && sorted[i].y < a.bottom + padding + limit; i++) {
        const b = sorted[i],
          x = b.x - padding - a.right,
          right = b.right + padding - a.x;
        const y = b.y - padding - a.bottom,
          bottom = b.bottom + padding - a.y;
        const dx = Math.max(x, -right, 0),
          dy = Math.max(y, -bottom, 0);
        if (dx * dx + dy * dy >= limit2) continue;
        let rights = columns.get(x);
        if (!rights) columns.set(x, (rights = new Map()));
        let ends = rights.get(right);
        if (!ends) rights.set(right, (ends = new Map()));
        if (bottom > (ends.get(y) ?? -Infinity)) ends.set(y, bottom);
      }
    }
    // Repeated node widths/columns produce many identical forbidden regions.
    // Union overlapping vertical intervals before allocating sweep events.
    // Keep touching intervals separate: their shared boundary is still usable.
    const rectangles = [],
      ys = [0];
    for (const [x, rights] of columns)
      for (const [right, ends] of rights) {
        const intervals = [...ends].sort((a, b) => a[0] - b[0]);
        let y = intervals[0][0],
          bottom = intervals[0][1];
        const append = () => {
          rectangles.push({ x, right, y, bottom });
          ys.push(y, bottom);
        };
        for (let i = 1; i < intervals.length; i++) {
          const [nextY, nextBottom] = intervals[i];
          if (nextY < bottom) bottom = Math.max(bottom, nextBottom);
          else {
            append();
            y = nextY;
            bottom = nextBottom;
          }
        }
        append();
      }
    const coordinates = [...new Set(ys)].sort((a, b) => a - b);
    const indices = new Map(coordinates.map((y, i) => [y, i]));
    let size = 1;
    while (size < coordinates.length) size *= 2;
    const cover = new Int32Array(size * 2),
      lazy = new Int32Array(size * 2);
    const closest = new Float64Array(size * 2);
    function pull(i) {
      const left = i * 2,
        right = left + 1;
      cover[i] = Math.min(cover[left], cover[right]) + lazy[i];
      const useLeft =
        cover[left] < cover[right] ||
        (cover[left] === cover[right] && Math.abs(closest[left]) <= Math.abs(closest[right]));
      closest[i] = closest[useLeft ? left : right];
    }
    for (let i = 0; i < size; i++) {
      cover[size + i] = i < coordinates.length ? 0 : 1e9;
      closest[size + i] = coordinates[i] ?? Infinity;
    }
    for (let i = size - 1; i; i--) pull(i);
    function update(start, end, delta, i = 1, left = 0, right = size - 1) {
      if (start > right || end < left || start > end) return;
      if (start <= left && right <= end) {
        cover[i] += delta;
        lazy[i] += delta;
        return;
      }
      const mid = (left + right) >>> 1;
      update(start, end, delta, i * 2, left, mid);
      update(start, end, delta, i * 2 + 1, mid + 1, right);
      pull(i);
    }
    const events = [{ x: 0, start: 0, end: -1, delta: 0 }];
    for (const r of rectangles) {
      // Exact boundary contact is safe; only interior coordinates are covered.
      const start = indices.get(r.y) + 1,
        end = indices.get(r.bottom) - 1;
      events.push({ x: r.x, start, end, delta: 1 }, { x: r.right, start, end, delta: -1 });
    }
    events.sort((a, b) => a.x - b.x);
    for (let i = 0; i < events.length;) {
      let end = i + 1;
      const x = events[i].x;
      while (end < events.length && events[end].x === x) end++;
      // Remove ending rectangles before checking; add starting ones afterwards.
      for (let j = i; j < end; j++)
        if (events[j].delta < 0) update(events[j].start, events[j].end, -1);
      const candidate = { x, y: closest[1] };
      if (cover[1] === 0 && distance(candidate) < distance(best)) best = candidate;
      for (let j = i; j < end; j++)
        if (events[j].delta > 0) update(events[j].start, events[j].end, 1);
      i = end;
    }
    return best;
  }
  function settleRootPositions(change, movedIndices, metrics) {
    const { text } = change,
      model = change.model || parseMarkdown(text);
    prepare(model, metrics, change.previousNodes);
    layout(model.roots, new Set());
    const moving = new Set(movedIndices.map((i) => model.nodes[i]).filter((n) => n && !n.parent));
    const footprints = new Map(model.roots.map((r) => [r, rootFootprint(model, r)]));
    const obstacles = model.roots.filter((r) => !moving.has(r)).flatMap((r) => footprints.get(r));
    const state = structureMaps(model);
    let adjusted = false;
    for (const r of model.roots.filter((r) => moving.has(r))) {
      const shapes = footprints.get(r),
        offset = nearestFreeOffset(shapes, obstacles);
      if (offset.x || offset.y) {
        state.positions.set(r, point({ x: r.x + offset.x, y: r.y + offset.y }));
        adjusted = true;
      }
      // Use exactly the rounded coordinates that will be persisted.
      const position = state.positions.get(r) || r,
        dx = position.x - r.x,
        dy = position.y - r.y;
      for (const box of shapes)
        obstacles.push({
          x: box.x + dx,
          right: box.right + dx,
          y: box.y + dy,
          bottom: box.bottom + dy,
        });
    }
    if (!adjusted) return { ...change, model };
    const placed = rewriteForest(text, model, state.roots, state.children, state.positions);
    prepare(placed.model, metrics, model.nodes);
    return { ...change, text: placed.text, model: placed.model };
  }
  function avoidRootOverlap(text, movedIndices, metrics) {
    return settleRootPositions({ text }, movedIndices, metrics).text;
  }

  // Packed bounds over small contiguous groups retain paint order and avoid
  // scanning every edge on each viewport query. Long crossing edges stay visible.

  // ── 空间索引与可见区域查询 ──────────────────────────────────────────
  function createBoxIndex(items, key) {
    const blockSize = 8;
    let size = 1;
    while (size * blockSize < items.length) size *= 2;
    const boxes = new Float64Array(size * 8);
    for (let i = 0; i < size; i++) {
      const offset = (size + i) * 4;
      boxes[offset] = boxes[offset + 1] = Infinity;
      boxes[offset + 2] = boxes[offset + 3] = -Infinity;
      for (let j = i * blockSize; j < Math.min(items.length, (i + 1) * blockSize); j++) {
        const b = items[j][key];
        boxes[offset] = Math.min(boxes[offset], b.x);
        boxes[offset + 1] = Math.min(boxes[offset + 1], b.y);
        boxes[offset + 2] = Math.max(boxes[offset + 2], b.right);
        boxes[offset + 3] = Math.max(boxes[offset + 3], b.bottom);
      }
    }
    for (let i = size - 1; i; i--) {
      const offset = i * 4,
        left = offset * 2,
        right = left + 4;
      boxes[offset] = Math.min(boxes[left], boxes[right]);
      boxes[offset + 1] = Math.min(boxes[left + 1], boxes[right + 1]);
      boxes[offset + 2] = Math.max(boxes[left + 2], boxes[right + 2]);
      boxes[offset + 3] = Math.max(boxes[left + 3], boxes[right + 3]);
    }
    return { items, key, blockSize, size, boxes };
  }
  function queryBoxes(index, view) {
    const { items, key, blockSize, size, boxes } = index,
      result = [],
      stack = [1];
    while (stack.length) {
      const i = stack.pop(),
        offset = i * 4;
      if (
        boxes[offset] > view.right ||
        boxes[offset + 1] > view.bottom ||
        boxes[offset + 2] < view.x ||
        boxes[offset + 3] < view.y
      )
        continue;
      if (i < size) {
        stack.push(i * 2 + 1, i * 2);
        continue;
      }
      const start = (i - size) * blockSize,
        end = Math.min(items.length, start + blockSize);
      for (let j = start; j < end; j++) if (intersects(items[j][key], view)) result.push(items[j]);
    }
    return result;
  }
  function createViewportIndex(visible, edges = visible.filter((n) => n.edgePath)) {
    const sorted = visible.slice().sort((a, b) => a.box.y - b.box.y);
    let maxHeight = 0;
    for (const n of sorted) maxHeight = Math.max(maxHeight, n.box.bottom - n.box.y);
    return { sorted, maxHeight, edges, edgeIndex: createBoxIndex(edges, 'edgeBox') };
  }
  function queryNodes(index, view) {
    let lo = 0,
      hi = index.sorted.length;
    const min = view.y - index.maxHeight;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (index.sorted[mid].box.y < min) lo = mid + 1;
      else hi = mid;
    }
    const nodes = [];
    for (let i = lo; i < index.sorted.length && index.sorted[i].box.y <= view.bottom; i++) {
      const n = index.sorted[i];
      if (intersects(n.box, view)) nodes.push(n);
    }
    return nodes;
  }
  function selectViewport(index, view) {
    // Include crossing edges even when both endpoint nodes are off screen.
    return { nodes: queryNodes(index, view), edges: queryBoxes(index.edgeIndex, view) };
  }

  // ── 撤销重做历史 ──────────────────────────────────────────
  function createHistory(limit = 100, maxChars = 4000000) {
    const past = [],
      future = [];
    let chars = 0;
    const weight = (entry) => entry.before.length + entry.after.length;
    return {
      record(before, after, id, view = null) {
        if (before === after) return;
        for (const entry of future) chars -= weight(entry);
        future.length = 0;
        const entry = Object.freeze({ before, after, id, view });
        past.push(entry);
        chars += weight(entry);
        while (past.length > 1 && (past.length > limit || chars > maxChars))
          chars -= weight(past.shift());
      },
      peek(direction) {
        const stack = direction === 'undo' ? past : future;
        return stack[stack.length - 1];
      },
      complete(direction, entry) {
        const from = direction === 'undo' ? past : future,
          to = direction === 'undo' ? future : past;
        if (from[from.length - 1] !== entry) throw Error('History changed during save');
        to.push(from.pop());
      },
      reset() {
        past.length = 0;
        future.length = 0;
        chars = 0;
      },
      get canUndo() {
        return past.length > 0;
      },
      get canRedo() {
        return future.length > 0;
      },
    };
  }

  // ── 结构修改与 Markdown 回写 ──────────────────────────────────────────
  function rootsOf(model) {
    return model.roots || model.nodes.filter((n) => !n.parent);
  }

  function sourceChunks(text, model) {
    const offsets = [0];
    let match;
    const newline = /\r?\n/g,
      eol = text.includes('\r\n') ? '\r\n' : '\n';
    while ((match = newline.exec(text))) offsets.push(match.index + match[0].length);
    const sourceOrder = model.nodes.slice().sort((a, b) => a.startLine - b.startLine),
      chunks = new Map();
    sourceOrder.forEach((n, i) => {
      const start = offsets[n.startLine - 1];
      const end =
        i + 1 < sourceOrder.length ? offsets[sourceOrder[i + 1].startLine - 1] : text.length;
      const prefix = text
        .slice(start, offsets[n.line - 1])
        .replace(
          /^[^\S\r\n]*<!-- mindmap:(?:float \{[^\r\n]*\}|color (?:\d+|#[0-9a-fA-F]{6})) -->[^\S\r\n]*(?:\r?\n|$)/gm,
          '',
        );
      chunks.set(n, { prefix, body: text.slice(offsets[n.line - 1], end) });
    });
    return { offsets, sourceOrder, eol, chunks };
  }

  // Keep each heading's notes with it, even when old floating-topic source order differs.
  function rewriteForest(
    text,
    model,
    roots,
    children,
    positions,
    extra = new Map(),
    preserveColors = false,
    colorOverrides = new Map(),
  ) {
    if (!roots.length) throw Error('至少保留一个根节点');
    const { offsets, sourceOrder, eol, chunks: originalChunks } = sourceChunks(text, model);
    const chunks = new Map([...extra, ...originalChunks]);
    const order = [],
      stack = roots
        .slice()
        .reverse()
        .map((n) => ({ n, depth: 0 })),
      indices = new Map();
    while (stack.length) {
      const item = stack.pop();
      indices.set(item.n, order.length);
      order.push(item);
      const list = children.get(item.n) || [];
      for (let i = list.length - 1; i >= 0; i--) stack.push({ n: list[i], depth: item.depth + 1 });
    }
    const preamble = text.slice(0, offsets[sourceOrder[0].startLine - 1]).replace(/^\uFEFF/, '');
    const parts = [preamble];
    let needsNewline = !!preamble && !preamble.endsWith('\n');
    for (const { n, depth } of order) {
      if (needsNewline) parts.push(eol);
      if (depth === 0 && positions.has(n))
        parts.push('<!-- mindmap:float ' + JSON.stringify(positions.get(n)) + ' -->' + eol);
      const explicitColor = colorOverrides.has(n) ? colorOverrides.get(n) : n.explicitColor;
      if (
        typeof explicitColor === 'string' ||
        (depth === 1 && (preserveColors || explicitColor != null))
      ) {
        const color = typeof explicitColor === 'string' ? explicitColor : (n.color ?? n.branch);
        parts.push('<!-- mindmap:color ' + color + ' -->' + eol);
      }
      const chunk = chunks.get(n),
        body = typeof chunk === 'string' ? chunk : chunk.body;
      const part =
        (typeof chunk === 'string' ? '' : chunk.prefix) +
        body.replace(/^\uFEFF/, '').replace(/^#+(?=[ \t])/, () => '#'.repeat(depth + 1));
      parts.push(part);
      needsNewline = !part.endsWith('\n');
    }
    const updated = (text.startsWith('\uFEFF') ? '\uFEFF' : '') + parts.join('');
    const parsed = parseMarkdown(updated);
    if (parsed.nodes.length !== order.length) throw Error('结构修改后节点数量不一致');
    return {
      text: updated,
      model: parsed,
      previousNodes: model.nodes,
      indices,
      remap: (index) => indices.get(model.nodes[index]),
    };
  }
  function structureMaps(model) {
    return {
      roots: rootsOf(model).slice(),
      children: new Map(model.nodes.map((n) => [n, n.children.slice()])),
      positions: new Map(
        rootsOf(model)
          .filter(
            (n) => n.floating || (n !== model.root && Number.isFinite(n.x) && Number.isFinite(n.y)),
          )
          .map((n) => [n, n.floating || point(n)]),
      ),
    };
  }
  function normalizedSource(text, model) {
    if (!model.hasLegacyFloating) return text;
    const state = structureMaps(model);
    return rewriteForest(text, model, state.roots, state.children, state.positions).text;
  }
  function addRoot(text, model, position) {
    if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y))
      throw Error('根节点位置无效');
    const state = structureMaps(model),
      names = new Set(state.roots.map((n) => n.label));
    let label = '新根节点',
      suffix = 2;
    while (names.has(label)) label = '新根节点 ' + suffix++;
    const n = { label },
      eol = text.includes('\r\n') ? '\r\n' : '\n';
    state.roots.push(n);
    state.children.set(n, []);
    state.positions.set(n, point(position));
    const change = rewriteForest(
      text,
      model,
      state.roots,
      state.children,
      state.positions,
      new Map([[n, '# ' + label + eol]]),
    );
    return { ...change, targetIndex: change.indices.get(n), anchorBefore: 0 };
  }
  function changeStructure(text, model, targetId, action) {
    const node = model.byId.get(targetId);
    if (!node) throw Error('节点不存在');
    if (action === 'delete') {
      const change = deleteSubtrees(text, model, [targetId]);
      const survivor = node.parent || rootsOf(model).find((n) => n !== node);
      return {
        ...change,
        targetIndex: change.remap(survivor.index),
        anchorBefore: survivor.index,
        remap: (index) => change.remap(index) ?? null,
      };
    }
    if (action !== 'child' && action !== 'sibling') throw Error('Unknown structure operation');
    if (action === 'sibling' && !node.parent)
      return addRoot(text, model, { x: (node.x || 0) + (node.w || 150) + 180, y: node.y || 0 });
    const parent = action === 'child' ? node : node.parent,
      state = structureMaps(model);
    const names = new Set(parent.children.map((n) => n.label));
    let label = '新节点',
      suffix = 2;
    while (names.has(label)) label = '新节点 ' + suffix++;
    const n = { label },
      list = state.children.get(parent),
      eol = text.includes('\r\n') ? '\r\n' : '\n';
    if (action === 'child') list.push(n);
    else list.splice(list.indexOf(node) + 1, 0, n);
    state.children.set(n, []);
    const change = rewriteForest(
      text,
      model,
      state.roots,
      state.children,
      state.positions,
      new Map([[n, '# ' + label + eol]]),
    );
    return {
      ...change,
      targetIndex: change.indices.get(n),
      anchorBefore: node.index,
      expandIndex: parent.index,
    };
  }
  function selectionRoots(model, ids) {
    const candidates = [...new Set(ids)]
      .map((id) => model.byId.get(id))
      .filter(Boolean)
      .sort((a, b) => a.index - b.index);
    const roots = [];
    for (const n of candidates)
      if (!roots.length || n.index >= roots[roots.length - 1].end) roots.push(n);
    return roots;
  }
  // Copy standalone Markdown so branches can also move between tabs and files.
  function copySubtrees(text, model, ids, palette = []) {
    const selected = selectionRoots(model, ids);
    if (!selected.length) throw Error('请先选择要复制的节点');
    const overrides = new Map();
    for (const node of selected) {
      const color =
        typeof node.color === 'string' ? node.color : palette[node.color % palette.length];
      if (color) overrides.set(node, color);
    }
    const change = rewriteForest(
      text,
      model,
      selected,
      structureMaps(model).children,
      new Map(),
      new Map(),
      false,
      overrides,
    );
    const firstLine = change.model.nodes.reduce(
      (line, node) => Math.min(line, node.startLine),
      Infinity,
    );
    return change.text
      .split('\n')
      .slice(firstLine - 1)
      .join('\n')
      .replace(/^\uFEFF/, '');
  }

  function pasteSubtrees(text, model, targetId, clipboard, position = null) {
    const target = model.byId.get(targetId);
    if (targetId != null && !target) throw Error('请先选择粘贴位置');
    if (!target && (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)))
      throw Error('粘贴位置无效');
    if (typeof clipboard !== 'string' || !clipboard.trim()) throw Error('剪贴板为空，请先复制节点');
    // Plain clipboard text becomes one node per nonempty line. Markdown branches
    // keep their hierarchy, notes and color metadata.
    if (!/^#{1,}[ \t]+\S/m.test(clipboard.replace(/^\uFEFF/, ''))) {
      clipboard = clipboard
        .split(/\r\n|\r|\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => '# ' + line)
        .join('\n');
    }
    const imported = parseMarkdown(clipboard),
      state = structureMaps(model);
    const extra = sourceChunks(clipboard, imported).chunks;
    const eol = text.includes('\r\n') ? '\r\n' : '\n';
    for (const [node, chunk] of extra) {
      extra.set(node, {
        prefix: chunk.prefix.replace(/\r?\n/g, eol),
        body: chunk.body.replace(/\r?\n/g, eol),
      });
      state.children.set(node, node.children.slice());
    }
    if (target) state.children.get(target).push(...imported.roots);
    else {
      state.roots.push(...imported.roots);
      imported.roots.forEach((node, index) => {
        state.positions.set(node, point({ x: position.x, y: position.y + index * 120 }));
      });
    }
    const change = rewriteForest(text, model, state.roots, state.children, state.positions, extra);
    return {
      ...change,
      pastedIndices: imported.roots.map((node) => change.indices.get(node)),
      expandIndex: target ? change.remap(target.index) : null,
      count: imported.nodes.length,
    };
  }

  function point(value) {
    return { x: Math.round(value.x * 100) / 100, y: Math.round(value.y * 100) / 100 };
  }
  function swapSiblings(text, model, ids, targetId) {
    const moving = selectionRoots(model, ids),
      target = model.byId.get(targetId);
    if (!moving.length || !target?.parent || moving.some((n) => n.parent !== target.parent))
      throw Error('只能交换同父节点下的同级节点');
    const chosen = new Set(moving);
    if (chosen.has(target)) throw Error('不能与选中的节点交换');
    const state = structureMaps(model),
      order = [];
    // Exchange the selected subtrees as one ordered group with the target.
    // Other siblings retain their relative order, including noncontiguous picks.
    for (const n of state.children.get(target.parent)) {
      if (n === target) order.push(...moving);
      else if (n === moving[0]) order.push(target);
      else if (!chosen.has(n)) order.push(n);
    }
    state.children.set(target.parent, order);
    const change = rewriteForest(
      text,
      model,
      state.roots,
      state.children,
      state.positions,
      new Map(),
      !target.parent.parent,
    );
    return { ...change, movedIndices: moving.map((n) => change.indices.get(n)) };
  }

  // ── 插入位置与拖拽操作 ──────────────────────────────────────────
  function siblingGaps(visible, excluded = new Set(), scale = 1) {
    const groups = new Map(),
      gaps = [];
    for (const n of visible) {
      if (!n.parent || excluded.has(n.index)) continue;
      let sides = groups.get(n.parent);
      if (!sides) groups.set(n.parent, (sides = new Map()));
      let list = sides.get(n.side);
      if (!list) sides.set(n.side, (list = []));
      list.push(n);
    }
    for (const [parent, sides] of groups)
      for (const list of sides.values()) {
        list.sort((a, b) => a.y - b.y);
        const first = list[0],
          last = list[list.length - 1],
          reach = 24 / scale;
        gaps.push({
          parent,
          upper: null,
          lower: first,
          x: first.x,
          right: first.x + first.w,
          y: first.y - reach / 2,
          top: first.y - reach,
          bottom: first.y,
        });
        for (let i = 1; i < list.length; i++) {
          const upper = list[i - 1],
            lower = list[i];
          const top = upper.y + upper.h,
            bottom = lower.y;
          if (bottom <= top) continue;
          gaps.push({
            parent,
            upper,
            lower,
            x: Math.min(upper.x, lower.x),
            right: Math.max(upper.x + upper.w, lower.x + lower.w),
            y: (top + bottom) / 2,
            top,
            bottom,
          });
        }
        const end = last.y + last.h;
        gaps.push({
          parent,
          upper: last,
          lower: null,
          x: last.x,
          right: last.x + last.w,
          y: end + reach / 2,
          top: end,
          bottom: end + reach,
        });
      }
    return gaps;
  }
  function unchangedInsertionSlot(moving) {
    const parent = moving[0]?.parent;
    if (!parent || moving.some((n) => n.parent !== parent)) return null;
    const start = parent.children.indexOf(moving[0]);
    if (start < 0 || !moving.every((n, i) => parent.children[start + i] === n)) return null;
    return {
      parent,
      before: parent.children[start - 1] || null,
      after: parent.children[start + moving.length] || null,
    };
  }
  function isInsertionNoop(moving, lower) {
    return !!lower && unchangedInsertionSlot(moving)?.after === lower;
  }
  function createInsertionIndex(gaps, moving) {
    // Only one destination can preserve the current order. Find it once per drag.
    const unchanged = unchangedInsertionSlot(moving);
    const items = gaps.map((gap) => ({
      ...gap,
      noop:
        !!unchanged &&
        gap.parent === unchanged.parent &&
        (gap.lower ? gap.lower === unchanged.after : gap.upper === unchanged.before),
      hitBox: { x: gap.x, y: gap.top, right: gap.right, bottom: gap.bottom },
    }));
    return { items, boxes: items.length > 128 ? createBoxIndex(items, 'hitBox') : null };
  }
  function queryInsertion(index, x, y, scale) {
    if (!index) return null;
    const padding = 8 / scale;
    const candidates = index.boxes
      ? queryBoxes(index.boxes, { x: x - padding, y, right: x + padding, bottom: y })
      : index.items;
    let best = null,
      distance = Infinity;
    for (const gap of candidates) {
      const dy = Math.abs(y - gap.y);
      if (
        x < gap.x - padding ||
        x > gap.right + padding ||
        y <= gap.top ||
        y >= gap.bottom ||
        (!gap.noop && dy > 12 / scale)
      )
        continue;
      if (dy < distance) {
        best = gap;
        distance = dy;
      }
    }
    return best;
  }
  function insertSubtrees(text, model, ids, upperId, lowerId) {
    const moving = selectionRoots(model, ids),
      upper = model.byId.get(upperId),
      lower = model.byId.get(lowerId);
    if (!moving.length) throw Error('请选择要插入的节点');
    const anchor = upper || lower,
      parent = anchor?.parent;
    if (
      !parent ||
      (upperId != null && !upper) ||
      (lowerId != null && !lower) ||
      (upper &&
        lower &&
        (upper.parent !== lower.parent || upper === lower || upper.side !== lower.side))
    )
      throw Error('请选择有效的同级节点插入位置');
    const contains = (n) => n && moving.some((m) => n.index >= m.index && n.index < m.end);
    if (contains(parent) || contains(upper) || contains(lower))
      throw Error('不能插入自身或子节点之间');
    const chosen = new Set(moving),
      remaining = parent.children.filter((n) => !chosen.has(n));
    const side = remaining.filter((n) => n.side === anchor.side),
      slot = side.indexOf(upper);
    if (
      !upper
        ? side[0] !== lower
        : !lower
          ? side[side.length - 1] !== upper
          : slot < 0 || side[slot + 1] !== lower
    )
      throw Error('插入位置已变化，请重新拖动');
    const order = remaining.slice(),
      at = lower ? order.indexOf(lower) : order.indexOf(upper) + 1;
    order.splice(at, 0, ...moving);
    if (
      moving.every((n) => n.parent === parent) &&
      order.every((n, i) => n === parent.children[i])
    ) {
      return {
        text,
        model,
        remap: (index) => index,
        movedIndices: moving.map((n) => n.index),
        expandIndex: parent.index,
      };
    }
    const state = structureMaps(model);
    for (const n of moving) {
      if (n.parent)
        state.children.set(
          n.parent,
          state.children.get(n.parent).filter((c) => c !== n),
        );
      else state.roots = state.roots.filter((r) => r !== n);
      state.positions.delete(n);
    }
    state.children.set(parent, order);
    const change = rewriteForest(
      text,
      model,
      state.roots,
      state.children,
      state.positions,
      new Map(),
      !parent.parent || moving.some((n) => n.depth <= 1),
    );
    return {
      ...change,
      movedIndices: moving.map((n) => change.indices.get(n)),
      expandIndex: change.indices.get(parent),
    };
  }
  function moveSubtrees(text, model, ids, targetId, positions = {}) {
    const moving = selectionRoots(model, ids),
      state = structureMaps(model);
    if (!moving.length) throw Error('请选择要移动的节点');
    const detached = targetId === null,
      target = detached ? null : model.byId.get(targetId);
    if (!detached && !target) throw Error('目标节点不存在');
    if (target && moving.some((n) => target.index >= n.index && target.index < n.end))
      throw Error('不能拖入自身或其子节点');
    for (const n of moving) {
      if (n.parent)
        state.children.set(
          n.parent,
          state.children.get(n.parent).filter((c) => c !== n),
        );
      else if (!detached) state.roots = state.roots.filter((r) => r !== n);
      if (detached) {
        const pos = positions[n.id];
        if (!pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.y))
          throw Error('独立节点位置无效');
        state.positions.set(n, point(pos));
        if (n.parent) state.roots.push(n);
      } else state.positions.delete(n);
    }
    if (target) state.children.get(target).push(...moving);
    const change = rewriteForest(text, model, state.roots, state.children, state.positions);
    return {
      ...change,
      movedIndices: moving.map((n) => change.indices.get(n)),
      expandIndex: target ? change.indices.get(target) : null,
    };
  }

  // ── 分支颜色与删除 ──────────────────────────────────────────
  function setBranchColor(text, model, ids, color) {
    if (typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color)) throw Error('颜色格式无效');
    color = color.toLowerCase();
    const selected = selectionRoots(model, ids);
    if (!selected.length) throw Error('请选择要更改颜色的分支');
    const overrides = new Map();
    for (const node of selected) {
      // Applying a branch color deliberately replaces descendant overrides too.
      for (let i = node.index; i < node.end; i++) overrides.set(model.nodes[i], null);
      overrides.set(node, color);
    }
    const state = structureMaps(model);
    return rewriteForest(
      text,
      model,
      state.roots,
      state.children,
      state.positions,
      new Map(),
      false,
      overrides,
    );
  }
  function deleteSubtrees(text, model, ids) {
    const moving = selectionRoots(model, ids),
      state = structureMaps(model);
    if (!moving.length) throw Error('请选择要删除的节点');
    const removedRoots = new Set(moving.filter((n) => !n.parent));
    state.roots = state.roots.filter((n) => !removedRoots.has(n));
    if (!state.roots.length) throw Error('至少保留一个根节点');
    for (const n of moving)
      if (n.parent)
        state.children.set(
          n.parent,
          state.children.get(n.parent).filter((c) => c !== n),
        );
    return rewriteForest(text, model, state.roots, state.children, state.positions);
  }

  // ── 公共接口 ──────────────────────────────────────────
  const api = {
    parseMarkdown,
    createMetricsCache,
    prepare,
    layout,
    bounds,
    createViewportIndex,
    selectViewport,
    createHistory,
    changeStructure,
    selectionRoots,
    copySubtrees,
    pasteSubtrees,
    swapSiblings,
    siblingGaps,
    isInsertionNoop,
    createInsertionIndex,
    queryInsertion,
    insertSubtrees,
    moveSubtrees,
    setBranchColor,
    deleteSubtrees,
    addRoot,
    normalizedSource,
    avoidRootOverlap,
    settleRootPositions,
    queryNodes,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else scope.MindmapCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
