// types.tsx
export type Organization = {
  id: string;
  name: string;
  parentId?: string;
};

export type TagCategory = {
  id: string;
  name: string;       // 例: 性格, 能力
  options: string[];  // 例: ["元気", "クール"]
  multi: boolean;
};

export type TagChange = {
  time: number;
  categoryId: string;
  tag: string;
  type: 'add' | 'remove';
};

export type RelationEvent = {
  time: number;
  type: 'create' | 'update' | 'remove';
  label: string;
};

export type Character = {
  id: string;
  name: string;
  description?: string;
  // カテゴリIDをキーにしたマッピングに変更
  tags: { [categoryId: string]: string[] };
  tagTimeline?: TagChange[];
  appearAt?: number;
  icon?: string;
  // 所属組織を扱いたい場合
  organizationIds?: string[];
};

export type Relation = {
  id: string;
  sourceId: string; // Character.id
  targetId: string; // Character.id
  label: string;    // 例:「兄弟」「敵対」
  timeline?: RelationEvent[];
};

export type Work = {
  id: string;
  title: string;
  nowfilePath?: string;
  description?: string;
  characters: Character[];
  relations: Relation[];
  // Organization 型の配列として管理
  organizations: Organization[];
  tagCategories: TagCategory[];
  createdAt: string; // ISO形式
  updatedAt: string;
};
