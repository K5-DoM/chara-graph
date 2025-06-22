import {Work} from '../types'

export function ensureMaxTime(work: Work): Work {
  // 既存の maxTime。無ければ 3 を初期値
  let maxT = work.maxTime ?? 3;

  // キャラ appear / disappear
  work.characters.forEach(c => {
    if (c.appearAt !== undefined)   maxT = Math.max(maxT, c.appearAt);
    if (c.disappearAt !== undefined) maxT = Math.max(maxT, c.disappearAt);
  });
  // リレーション timeline
  work.relations.forEach(r => {
    if (r.appearAt !== undefined)   maxT = Math.max(maxT, r.appearAt);
    if (r.disappearAt !== undefined) maxT = Math.max(maxT, r.disappearAt);

  });

  return maxT === work.maxTime ? work : { ...work, maxTime: maxT };
}
