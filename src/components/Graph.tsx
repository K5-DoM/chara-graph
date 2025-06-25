// GraphView.tsx
import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import * as cola from 'webcola';
import { Work }  from '../types';

/*───────── 型定義 ─────────*/
interface NodeDatum extends cola.Node {
  id : string;
  label : string;
  appearAt : number;
  disappearAt?: number;
}
interface LinkDatum extends cola.Link<NodeDatum> {
  id : string;
  label : string;
  appearAt : number;
  disappearAt?: number;
  curvature?: number;          // markOppositePairs が付与
}

/*───────── 定数 ─────────*/      // node 半径
const NODE_RADIUS=10;

function linkMidpoint(d: LinkDatum): [number, number] {
  const s = d.source as NodeDatum;
  const t = d.target as NodeDatum;

  // ---- 直線の場合 ----
  if (!d.curvature) {
    return [(s.x! + t.x!) / 2, (s.y! + t.y!) / 2];
  }

  // ---- 曲線の場合：制御点を再計算 ----
  const k = Math.abs(d.curvature);
  const dx = t.x! - s.x!;
  const dy = t.y! - s.y!;
  const dist = Math.hypot(dx, dy) || 1;
  const nx = -dy / dist;
  const ny =  dx / dist;
  const cx = (s.x! + t.x!) / 2 + nx * dist * k;
  const cy = (s.y! + t.y!) / 2 + ny * dist * k;

  // 2 次 Bézier の t=0.5: (1/4)P0 + (1/2)C + (1/4)P2
  const x = 0.25 * s.x! + 0.5 * cx + 0.25 * t.x!;
  const y = 0.25 * s.y! + 0.5 * cy + 0.25 * t.y!;
  return [x, y];
}

/*───────── 既存 util 再掲 ─────────*/
function markOppositePairs(links: LinkDatum[], k = 0.25) {
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

/*───────── 最大グラフを構築 ─────────*/
function buildFullGraph(work: Work) {
  const nodes: NodeDatum[] = work.characters.map(c => ({
    id: c.id, label: c.name,
    appearAt: c.appearAt ?? 0,
    disappearAt: c.disappearAt,
    width: NODE_RADIUS*2, height: NODE_RADIUS*2,
    x: 0, y: 0
  }));
  const id2 = Object.fromEntries(nodes.map(n => [n.id, n]));
  const links: LinkDatum[] = work.relations.map(r => ({
    id: r.id, label: r.label,
    appearAt: r.appearAt, disappearAt: r.disappearAt,
    source: id2[r.sourceId], target: id2[r.targetId]
  }));
  markOppositePairs(links);
  return { nodes, links };
}

/*───────── メインコンポーネント ─────────*/
type Props = { work: Work; time: number,width:number,height:number};

export default function GraphView({ work, time, width, height}: Props) {

  /*―――― 1) 最大グラフ & 位置キャッシュ ――――*/
  const fullRef   = useRef<{nodes: NodeDatum[]; links: LinkDatum[]} | null>(null);
  const posRef    = useRef<Record<string, [number, number]>>({});
  const solvedRef = useRef(false);

  if (!fullRef.current) fullRef.current = buildFullGraph(work);

  /*―――― 初回だけレイアウト ――――*/
  useEffect(() => {
    if (solvedRef.current) return;

    const { nodes, links } = fullRef.current!;
    cola.d3adaptor(d3)
      .size([width, height])
      .handleDisconnected(true)
      .avoidOverlaps(true)
      .linkDistance(140)
      .nodes(nodes)
      .links(links)
      .start(80, 0, 50)          // しっかり回す
      .on('end', () => {
        nodes.forEach(n => (posRef.current[n.id] = [n.x!, n.y!]));
        solvedRef.current = true;
      });
  }, []);

  /*―――― time が変わったら描画だけ更新 ――――*/
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!solvedRef.current || !svgRef.current) return;

    /* ① time でフィルタリング */
    const { nodes: allN, links: allL } = fullRef.current!;
    const nodes = allN.filter(n => n.appearAt <= time && (n.disappearAt ?? 1e9) > time);
    const idSet = new Set(nodes.map(n => n.id));
    const links = allL.filter(l => idSet.has(l.source.id as string) &&
                                   idSet.has(l.target.id as string) &&
                                   l.appearAt <= time &&
                                   (l.disappearAt ?? 1e9) > time);

    /* ② 座標をキャッシュから復元 */
    nodes.forEach(n => { const p = posRef.current[n.id]; n.x=p[0]; n.y=p[1]; });

    /* ③ join 描画 */
    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    const g =
      svg.select('g.graph-root');

    /* 3️⃣ データ結合 (join) */

g.selectAll<SVGGElement, NodeDatum>('g.node')
  .data(nodes, d => d.id)
  .join(
    enter => {
      // --- enter ---
      const ng = enter.append('g')
        .attr('class', 'node')
        .attr('transform', d => `translate(${d.x},${d.y})`)
        .style('opacity', 0);

      ng.append('circle')
        .attr('r', NODE_RADIUS)
        .attr('fill', '#4f46e5');

      ng.append('text')
        .attr('y', NODE_RADIUS + 12)
        .attr('text-anchor', 'middle')
        .attr('font-size', 10)
        .text(d => d.label);

      return ng.transition().style('opacity', 1);
    },
    update => update            // update selection を受け取る
                .attr('transform', d => `translate(${d.x},${d.y})`),
    exit   => exit.transition().style('opacity', 0).remove()
  );


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

    linkSel.attr('d',arcPath);

        
    /* path に id を付与 */
    linkSel.attr('id', d => `link-${d.id}`);

        /* ラベル join */
    g.selectAll<SVGTextElement, LinkDatum>('text.link-label')
      .data(links, d => d.id)
      .join(
        /* ---------- enter ---------- */
        enter => {
          const txt = enter.append('text')
                          .attr('class', 'link-label')
                          .attr('font-size', 10)
                          .attr('text-anchor', 'middle')
                          .attr('href',d => `#link-${d.id}`)
                          .text(d => d.label)
          return txt;               // ★ Selection を返す！
        },
        /* ---------- update ---------- */
        update => update,      // ★ 必ず同じ Selection 型を返す
        
        /* ---------- exit ---------- */
        exit => exit.remove()       // remove() は Selection を返すので OK
      )
      .attr('x', d => linkMidpoint(d)[0])
      .attr('y', d => linkMidpoint(d)[1]);

  });

    // --- Nodes ---


  /*―――― JSX ――――*/
  return (
    <svg ref={svgRef}>
      <g className="graph-root" />
    </svg>
  );

}
