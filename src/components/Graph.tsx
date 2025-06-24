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
const LABEL_OFFSET = 14;    
const NODE_WIDTH = NODE_RADIUS * 2;
const NODE_HEIGHT = NODE_RADIUS * 2;

export function markOppositePairs(links: LinkDatum[], k = 0.25) {
  const bucket = new Map<string, { a2b?: LinkDatum; b2a?: LinkDatum }>();

  links.forEach(l => {
    const [a, b] = [l.source.id as string, l.target.id as string];
    const key = [a, b].sort().join('|');

    const box = bucket.get(key) ?? {};
    if (a < b) box.a2b = l; else box.b2a = l;
    bucket.set(key, box);
  });

  bucket.forEach(({ a2b, b2a }) => {
    if (a2b && b2a) {
      (a2b as any).curvature = k;   // **符号を付けない**
      (b2a as any).curvature = k;
    } else {
      (a2b ?? b2a as any).curvature = 0;   // 片方向だけ
    }
  });
}


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

function arcPath(d: LinkDatum & { curvature?: number }) {
  const s = d.source as NodeDatum;
  const t = d.target as NodeDatum;
  const k = Math.abs(d.curvature ?? 0);       // ★ 正値にする

  if (k === 0) return `M${s.x},${s.y} L${t.x},${t.y}`;

  const dx = t.x! - s.x!;
  const dy = t.y! - s.y!;
  const dist = Math.hypot(dx, dy) || 1;

  // 単位法線ベクトル N = (-dy, dx)/dist
  const nx = -dy / dist;
  const ny =  dx / dist;

  // 向きが逆なら N も逆向きになるので、ここでは |k| だけ掛ける
  const mx = (s.x! + t.x!) / 2;
  const my = (s.y! + t.y!) / 2;
  const cx = mx + nx * dist * k;
  const cy = my + ny * dist * k;

  return `M${s.x},${s.y} Q${cx},${cy} ${t.x},${t.y}`;
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
    markOppositePairs(links);
    // filterByTime の後
    // links.forEach(l => {
    //   // key を「source|target」ソートで作る
    //   //const key = [l.source.id, l.target.id].sort().join('|');
    //   const twin = links.find(
    //     o => o !== l &&
    //       ((o.source.id === l.source.id && o.target.id === l.target.id) ||
    //       (o.source.id === l.target.id && o.target.id === l.source.id))
    //   );
    //   // 曲率 0 = 直線, ±1 = 弧
    //   (l as any).curvature = twin ? (l.source.id < l.target.id ? 0.3 : -0.3) : 0;
    // });


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
      const linkSel = g.selectAll<SVGPathElement, LinkDatum>('path.link')
        .data(links, d => d.id)
        .join(
          enter => enter.append('path')
                        .attr('class','link')
                        .attr('stroke','#999')
                        .attr('fill','none'),
          update => update,
          exit   => exit.remove()
        );

      linkSel.attr('d', d => {
        const s = d.source as NodeDatum;
        const t = d.target as NodeDatum;
        const dx = t.x! - s.x!;
        const dy = t.y! - s.y!;
        // const dr = Math.hypot(dx, dy) * (d as any).curvature; // 曲率
        // quadratic Bézier弧:  M x1 y1  Q cx cy x2 y2
        const cx = s.x! + dx/2 + (-dy) * (d as any).curvature;
        const cy = s.y! + dy/2 + ( dx) * (d as any).curvature;
        return `M${s.x},${s.y} Q${cx},${cy} ${t.x},${t.y}`;
      });

        
        /* path に id を付与 */
        linkSel.attr('id', d => `link-${d.id}`);

        /* ラベル join */
        const labelSel = g
          .selectAll<SVGTextElement, LinkDatum>('text.link-label')
          .data(links, d => d.id)
          .join(
            /* ---------- enter ---------- */
            enter => {
              const txt = enter.append('text')
                              .attr('class', 'link-label')
                              .attr('font-size', 10)
                              .attr('startOffset', '50%')
                              .attr('text-anchor', 'middle')
                              .attr('href',d => `#link-${d.id}`)
                              .text(d => d.label)
              return txt;               // ★ Selection を返す！
            },
            /* ---------- update ---------- */
            update => {
              update.select('textPath')
                    .text(d => d.label);
              return update;            // ★ 必ず同じ Selection 型を返す
            },
            /* ---------- exit ---------- */
            exit => exit.remove()       // remove() は Selection を返すので OK
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

      linkSel.attr('d', arcPath);
      labelSel
        .attr('x', d => {
          const s = d.source as NodeDatum;
          const t = d.target as NodeDatum;
          const mx = (s.x! + t.x!) / 2;               // 中点
          const dx = t.x! - s.x!;
          const dy = t.y! - s.y!;
          const dist = Math.hypot(dx, dy) || 1;
          const nx = -dy / dist;                      // 単位法線
          return mx + nx * LABEL_OFFSET;              // 少し外側
        })
        .attr('y', d => {
          const s = d.source as NodeDatum;
          const t = d.target as NodeDatum;
          const my = (s.y! + t.y!) / 2;
          const dx = t.x! - s.x!;
          const dy = t.y! - s.y!;
          const dist = Math.hypot(dx, dy) || 1;
          const ny =  dx / dist;                      // 単位法線
          return my + ny * LABEL_OFFSET;
        })
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
