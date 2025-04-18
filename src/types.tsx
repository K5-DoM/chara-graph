export type TagCategory = {
    id: string;
    name: string; // 例: 性格, 能力
    options: string[]; // 例: ["元気", "クール"]
    multi:boolean;
  };
  
  // キャラクター
  export type Character = {
    id: string;
    name: string;
    description?:string;
    tags: {
      [category: string]: string[]; // 例: { 性格: ["元気"], 性別: ["女性"] }
    };
    status?: "alive" | "dead";
    icon?: string; // アイコンURL or Base64
  };
  
  // キャラクター関係性（ID参照）
  export type Relation = {
    id: string;
    sourceId: string; // Character.id
    targetId: string; // Character.id
    label: string;    // 例:「兄弟」「敵対」など
  };
  
  // 作品
  export type Work = {
    id: string;
    title: string;
    nowfilePath?: string
    description?: string;
    characters: Character[];
    relations?: Relation[];
    organizations?: string[];
    tagCategories: TagCategory[];
    createdAt: string; // ISO形式
    updatedAt: string;
  };