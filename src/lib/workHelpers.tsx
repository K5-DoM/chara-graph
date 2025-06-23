import {Work,Character,Relation,TagCategory} from '../types'

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


function ensureUniqueIds<T extends { id?: string }>(
  items: T[],
  gen: () => string = () => crypto.randomUUID()
): T[] {
  const seen = new Set<string>();
  return items.map((it) => {
    let id = it.id;
    // 空 or すでに使われている → 新規発行
    while (!id || seen.has(id)) id = gen();
    seen.add(id);
    return { ...it, id };
  });
}


/* キャラクター */
export function ensureUniqueCharacters(chars: Character[]): Character[] {
  return ensureUniqueIds(chars);
}

/* 関係性（Relation） */
export function ensureUniqueRelations(rels: Relation[]): Relation[] {
  return ensureUniqueIds(rels);
}

/* タグ分類（TagCategory）*/
export function ensureUniqueTagCategories(
  cats: TagCategory[]
): TagCategory[] {
  return ensureUniqueIds(cats);
}
