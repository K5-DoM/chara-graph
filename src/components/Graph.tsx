// GraphView.tsx
import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import * as cola from 'webcola';
import { Work} from '../types';

/* ───────── 型定義 ───────── */
interface NodeDatum extends cola.Node {
  id: string;
  label: string;
  appearAt: number;
  disappearAt?: number;
  tags: Record<string, string[]>;
}

interface LinkDatum extends cola.Link<NodeDatum> {
  id: string;
  label: string;
    appearAt: number;
  disappearAt?: number;
}

/* ───────── Utility ───────── */
const NODE_RADIUS = 10;
const NODE_WIDTH = NODE_RADIUS * 2;
const NODE_HEIGHT = NODE_RADIUS * 2;

/** 時刻 t で有効な nodes / links を取得  */
function filterByTime(work: Work, t: number) {
  /* ノード抽出 */
  const nodes: NodeDatum[] = work.characters
    .filter(
      (c) =>
        (c.appearAt ?? 0) <= t &&
        !(c.disappearAt !== undefined && c.disappearAt <= t)
    )
    .map(
      (c): NodeDatum => ({
        id: c.id,
        label: c.name,
        appearAt: c.appearAt ?? 0,
        disappearAt: c.disappearAt,
        tags: c.tags,
        /* Cola が要求する寸法 (px) */
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        x: 0,
        y: 0,
      })
    );

  const id2node = new Map(nodes.map((n) => [n.id, n]));

  /* リンク抽出 + ラベル最新化 */
  const links: LinkDatum[] = (work.relations ?? [])
    .filter((r) => id2node.has(r.sourceId) && id2node.has(r.targetId))
    .filter((r) => {
      const created =r.appearAt ?? 0;
      const removed =r.disappearAt ?? Infinity;
      return created <= t && t < removed;
    })
    .map(
      (r): LinkDatum => {
        // 最新 update ラベル
        let lbl = r.label;
        return {
          id: r.id,
          source: id2node.get(r.sourceId)!,
          target: id2node.get(r.targetId)!,
          appearAt: r.appearAt,
          disappearAt: r.disappearAt,
          label: lbl,
        };
      }
    );

  return { nodes, links };
}

/* ─────────  Props  ───────── */
type Props = {
  work: Work;
  time: number;
  width?: number;
  height?: number;
};

/* ───────── Component  ───────── */
export default function GraphView({
  work,
  time,
  width = 800,
  height = 600,
}: Props) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    /* 1️⃣ データ準備 */
    const { nodes, links } = filterByTime(work, time);

    /* 2️⃣ SVG と <g> を取得 / 作成 */
    const svg = d3
      .select(ref.current)
      .attr('width', width)
      .attr('height', height);

    const g =
      svg.select<SVGGElement>('g.graph-root').empty()
        ? svg.append('g').attr('class', 'graph-root')
        : svg.select<SVGGElement>('g.graph-root');

    /* 3️⃣ データ結合 (join) */

    // --- Links ---
    const linkSel = g
      .selectAll<SVGLineElement, LinkDatum>('line.link')
      .data(links, (d) => d.id)
      .join(
        (enter) =>
          enter
            .append('line')
            .attr('class', 'link')
            .attr('stroke', '#999')
            .attr('stroke-width', 1.5)
            .attr('stroke-opacity', 0)
            .transition()
            .attr('stroke-opacity', 1),
        (update) => update,
        (exit) =>
          exit.transition().attr('stroke-opacity', 0).remove()
      );

      /* ★ Link ラベル（線と同じ key で join） */
      const linkLabelSel = g
        .selectAll<SVGTextElement, LinkDatum>('text.link-label')
        .data(links, d => d.id)
        .join(
          enter =>
            enter.append('text')
              .attr('class', 'link-label')
              .attr('font-size', 10)
              .attr('fill', '#555')
              .attr('text-anchor', 'middle')
              .attr('dy', -4)          // 線より少し上
              .text(d => d.label),
          update => update.text(d => d.label),
          exit => exit.remove()
        );

    // --- Nodes ---
    const nodeSel = g
      .selectAll<SVGGElement, NodeDatum>('g.node')
      .data(nodes, (d) => d.id)
      .join(
        (enter) => {
          const ng = enter
            .append('g')
            .attr('class', 'node')
            .style('opacity', 0);

          ng.append('circle')
            .attr('r', NODE_RADIUS)
            .attr('fill', '#4f46e5');

          ng.append('text')
            .attr('x', 0)
            .attr('y', NODE_RADIUS+12)
            .attr('text-anchor','middle')
            .attr('font-size', 10)
            .text(d => d.label);

          return ng.transition().style('opacity', 1);
        },
        (update) => update,
        (exit) => exit.transition().style('opacity', 0).remove()
      );

    /* 4️⃣ Cola レイアウト */
    const colaSim = cola
      .d3adaptor(d3) // 型が合わないので any キャスト
      .size([width, height])
      .handleDisconnected(true)
      .avoidOverlaps(true)
      .nodes(nodes)
      .links(links)
      .linkDistance(140)
      .jaccardLinkLengths(140, 0.7)
      .start(60, 0, 20);

    /* 5️⃣ tick → SVG 座標更新 */
    colaSim.on('tick', () => {
      nodeSel.attr('transform', (d) => `translate(${d.x},${d.y})`);

      linkSel
        .attr('x1', (d) => (d.source as NodeDatum).x ?? 0)
        .attr('y1', (d) => (d.source as NodeDatum).y ?? 0)
        .attr('x2', (d) => (d.target as NodeDatum).x ?? 0)
        .attr('y2', (d) => (d.target as NodeDatum).y ?? 0);

      linkLabelSel
        .attr('x', d => {
          const s = d.source as NodeDatum;
          const t = d.target as NodeDatum;
          return (s.x! + t.x!) / 2;
        })
        .attr('y', d => {
          const s = d.source as NodeDatum;
          const t = d.target as NodeDatum;
          return (s.y! + t.y!) / 2;
        });
      });

    /* 6️⃣ クリーンアップ */
    return () => {
      colaSim.stop();
      g.selectAll('.node,.link').remove();
    };
  }, [work, time, width, height]);

  return (
    <svg ref={ref}>
      <g className="graph-root" />
    </svg>
  );
}
