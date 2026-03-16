// GraphView.tsx
import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Work }  from '../types';
import { convertFileSrc } from '@tauri-apps/api/core';

/*───────── 型定義 ─────────*/
interface NodeDatum extends d3.SimulationNodeDatum{
  id : string;
  label : string;
  imageUrl?:string;
  appearAt : number;
  disappearAt?: number;
  width:number,
  height:number;
}
interface LinkDatum extends d3.SimulationLinkDatum<NodeDatum> {
  id : string;
  label : string;
  appearAt : number;
  disappearAt?: number;
  curvature?: number;          // markOppositePairs が付与
}

/*───────── 定数 ─────────*/      // node 半径
const NODE_RADIUS=10;
const ARROW_GAP=2;
const SHRINK= NODE_RADIUS + ARROW_GAP;

function shrinkSegment(
  sx: number, sy: number,
  tx: number, ty: number,
  r: number
): [number, number, number, number] {
  const dx = tx - sx;
  const dy = ty - sy;
  const dist = Math.hypot(dx, dy) || 1;   // 0 除け

  const ux = dx / dist;  // 単位ベクトル
  const uy = dy / dist;

  return [
    sx + ux * r,        // 新しい始点
    sy + uy * r,
    tx - ux * r,        // 新しい終点
    ty - uy * r
  ];
}

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
    const s = l.source as NodeDatum;
    const t = l.target as NodeDatum;
    const [a, b] = [s.id as string, t.id as string];
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

  const [sx, sy, tx, ty] = shrinkSegment(s.x!, s.y!, t.x!, t.y!, SHRINK);

  if (k === 0) return `M${sx},${sy} L${tx},${ty}`;

  const dx = tx - sx;
  const dy = ty - sy;
  const dist = Math.hypot(dx, dy) || 1;

  // 単位法線ベクトル N = (-dy, dx)/dist
  const nx = -dy / dist;
  const ny =  dx / dist;

  // 向きが逆なら N も逆向きになるので、ここでは |k| だけ掛ける
  const mx = (sx + tx) / 2;
  const my = (sy + ty) / 2;
  const cx = mx + nx * dist * k;
  const cy = my + ny * dist * k;

  return `M${sx},${sy} Q${cx},${cy} ${tx},${ty}`;
}

function forceNodeEdgeCollision(
  links: LinkDatum[],
  nodeRadius: number,
  padding = 4,
  strength = 1.5
) {
  const threshold = nodeRadius + padding;

  function force(alpha: number) {
    for (const l of links) {
      const sx = (l.source as NodeDatum).x!;
      const sy = (l.source as NodeDatum).y!;
      const tx = (l.target as NodeDatum).x!;
      const ty = (l.target as NodeDatum).y!;

      const dx = tx - sx;
      const dy = ty - sy;
      const len2 = dx * dx + dy * dy || 1;

      // ノード n との内積パラメータ t を計算し最近点を得る
      for (const n of nodes) {          // nodes は外側環境で格納しておく
        const px = n.x! - sx;
        const py = n.y! - sy;
        let t = (px * dx + py * dy) / len2;
        if (t < 0) t = 0;
        else if (t > 1) t = 1;

        const nx = sx + t * dx;         // 線分最近点
        const ny = sy + t * dy;

        const ox = n.x! - nx;
        const oy = n.y! - ny;
        const dist2 = ox * ox + oy * oy;
        const thresh2 = threshold * threshold;

        if (dist2 < thresh2 && dist2 > 0.1) {
          const dist = Math.sqrt(dist2);
          const push = (threshold - dist) / dist * alpha * strength;
          n.vx = (n.vx || 0) + ox * push;
          n.vy = (n.vy || 0) + oy * push;

        }
      }
    }
  }
  force.initialize = (_: NodeDatum[]) => { nodes = _; };
  let nodes: NodeDatum[] = [];
  return force;
}

/*───────── 最大グラフを構築 ─────────*/
function buildFullGraph(work: Work) {
  const nodes: NodeDatum[] = work.characters.map(c => ({
    id: c.id, label: c.name,imageUrl: c.icon ? convertFileSrc(c.icon) : '',
    appearAt: c.appearAt ?? 0,
    disappearAt: c.disappearAt,
    width: NODE_RADIUS*2, height: NODE_RADIUS*2
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
    nodes.forEach(n => {
      const cache = posRef.current[n.id];
      if(cache){
        n.x = cache[0];
        n.y = cache[1];
      }
      else{
      n.x = (Math.random() - 0.5) * width*4;
      n.y = (Math.random() - 0.5) * width*4;
      }
    });
    const sim = d3.forceSimulation(nodes)
      .force('link',d3.forceLink(links)
                    .id(d=>(d as NodeDatum).id)
                    .distance(Math.max(60,300/Math.sqrt(nodes.length))))
      .force('charge',d3.forceManyBody().strength(-200))
      .force('collide',d3.forceCollide(NODE_RADIUS+4))
      .force('center',d3.forceCenter(width/2,height/2))
      .alpha(1)
      .alphaDecay(0.05)
      .stop();

    sim.tick(80);

    d3.forceSimulation(nodes)
      .alpha(0.6)
      .alphaDecay(0.15)
      .force('nodeEdge',forceNodeEdgeCollision(links,NODE_RADIUS,6,1))
      .stop()
      .tick(40);

    const xs = nodes.map(n => n.x!), ys = nodes.map(n => n.y!);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);

    const scale = Math.min(
      width  / (maxX - minX + NODE_RADIUS * 2),
      height / (maxY - minY + NODE_RADIUS * 2),
      1
    );
    
    const offX = (width  - (maxX - minX) * scale) / 2 + NODE_RADIUS + 10;
    const offY = (height - (maxY - minY) * scale) / 2 + NODE_RADIUS + 20;

    nodes.forEach(n => {
      n.x = (n.x! - minX) * scale + offX;
      n.y = (n.y! - minY) * scale + offY;
      posRef.current[n.id] = [n.x, n.y];
    });
    solvedRef.current = true;
  }, [width,height]);

  /*―――― time が変わったら描画だけ更新 ――――*/
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!solvedRef.current || !svgRef.current) return;

    /* ① time でフィルタリング */
    const { nodes: allN, links: allL } = fullRef.current!;
    const nodes = allN.filter(n => n.appearAt <= time && (n.disappearAt ?? 1e9) > time);
    const idSet = new Set(nodes.map(n => n.id));
    const links = allL.filter(l => {
      const s = l.source as NodeDatum;
      const t = l.target as NodeDatum;
      return (
        idSet.has(s.id) &&
        idSet.has(t.id) &&
        l.appearAt <= time &&
        (l.disappearAt ?? 1e9) > time
      );
    });

    /* ② 座標をキャッシュから復元 */
    nodes.forEach(n => { const p = posRef.current[n.id]; n.x=p[0]; n.y=p[1]; });

    /* ③ join 描画 */
    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    // GraphView 内、最初に SVG を生成した直後などで 1 度だけ
    const defs = svg
      .selectAll<SVGDefsElement, unknown>('defs#arrow-defs')
      .data([null])                // 必ず 1 つ欲しい
      .join('defs')                // ここで <defs> が出来る
      .attr('id', 'arrow-defs');

    // 2) マーカーも同じ join パターン
    defs
      .selectAll<SVGMarkerElement, unknown>('marker#arrow')
      .data([null])
      .join('marker')
        .attr('id', 'arrow')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 10)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .attr('fill', '#999')               // currentColor にしても OK
        .append('path')
          .attr('d', 'M0,-5L10,0L0,5Z');

    
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

                /* ① clipPath（丸型） */
        ng.append('clipPath')
          .attr('id', d => `clip-${d.id}`)
          .append('circle')
          .attr('r', NODE_RADIUS);

        /* ② 画像 */
        ng.append('image')
          .attr('href', d => d.imageUrl || '/img/no-image.png') // fallback
          .attr('x', -NODE_RADIUS)
          .attr('y', -NODE_RADIUS)
          .attr('width', NODE_RADIUS * 2)
          .attr('height', NODE_RADIUS * 2)
          .attr('clip-path', d => `url(#clip-${d.id})`);

        ng.append('circle')
          .attr('r', NODE_RADIUS)
          .attr('fill', 'none')
          .attr('stroke','#4f46e5')
          .attr('stroke-width', 2);

        ng.append('text')
          .attr('y', NODE_RADIUS + 12)
          .attr('text-anchor', 'middle')
          .attr('font-size', 10)
          .text(d => d.label);

        return ng.transition().style('opacity', 1);
      },
      update => {
        update            // update selection を受け取る
        .attr('transform', d => `translate(${d.x},${d.y})`);
        update.select<SVGImageElement>('image')
        .attr('href', d => d.imageUrl || '/public/no-image.png');
        return update;
      },
      exit   => exit.transition().style('opacity', 0).remove()
    );
    console.log('after nodeEdge', nodes.map(n => [n.x, n.y]));


    // --- Links ---
    const linkSel = g.selectAll<SVGPathElement, LinkDatum>('path.link')
      .data(links, d => d.id)
      .join(
        enter => enter.append('path')
                      .attr('class','link')
                      .attr('stroke-width', 1.5)
                      .attr('stroke','#999')
                      .attr('fill','none')
                      .attr('marker-end', 'url(#arrow)'),
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
    <div style={{width, height, overflow: 'auto'}}>
      <svg ref={svgRef} width={width} height={height}>
        <g className="graph-root" />
      </svg>
    </div>
  );

}
