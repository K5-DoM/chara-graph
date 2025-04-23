import { useState } from 'react';
import { Character, TagCategory } from '../types';
import { confirm } from '@tauri-apps/plugin-dialog'

type Props = {
  tagCategories: TagCategory[];
  existingCharacters: Character[]; // 現在のキャラ一覧を受け取る
  onUpdate: (updated: Character[]) => void;
  onDelete: (charId: string) => void;
};

export default function CharacterForm({ tagCategories, existingCharacters,onUpdate,onDelete}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [tags, setTags] = useState<Record<string, string[]>>( 
    ()=> makeInitialTags(tagCategories)
  );
  const [appearAt, setAppearAt] = useState<number | ''>('');
  const resetForm = () => {
    setEditingId(null);
    setName('');
    setIcon('');
    setTags(makeInitialTags(tagCategories));
    setAppearAt('');
  };
  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("名前を入力してください");
      return;
    }

    const newChar: Character = {
      id: crypto.randomUUID(),
      name: name.trim(),
      tags,
      icon: icon.trim() || undefined,
      ...(appearAt !== '' ? { appearAt } : {}), // optionalにする
    };

    onUpdate([...existingCharacters,newChar]);

    resetForm();
  };
  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !name.trim()) return;

    const updatedChar: Character = {
      id: editingId,
      name: name.trim(),
      icon: icon.trim() || undefined,
      tags,
      ...(appearAt !== '' ? { appearAt } : {}),
    };

    const newList = existingCharacters.map(c =>
      c.id === editingId ? updatedChar : c
    );
    onUpdate(newList);
    resetForm();
  };


  const handleMultiTagChange = (categoryId: string, input: string) => {
    const list = input
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean);
    setTags(prev => ({ ...prev, [categoryId]: list }));
  };

  const handleSingleTagChange = (categoryId: string, input: string) => {
    const value = input.trim();
    setTags(prev => ({ ...prev, [categoryId]: value ? [value] : [] }));
  };

  const handleEditClick = (char: Character)=>{
    setEditingId(char.id);
    setName(char.name);
    setIcon(char.icon ?? '');
    const merged = makeInitialTags(tagCategories);
    Object.entries(char.tags).forEach(([catId,vals])=>{
      merged[catId]=vals;
    })
    setAppearAt(char.appearAt ?? '');
  }
  function makeInitialTags(tagCategories: TagCategory[]): Record<string,string[]> {
    const t: Record<string,string[]> = {};
    tagCategories.forEach(cat => {
      // 単一選択なら初期値に options[0]、複数選択なら空配列
      t[cat.id] = cat.multi ? [] : [cat.options[0] || ''];
    });
    return t;
  }
  async function handleDeleteClick(char: Character) {
    const confirmed = await confirm(
      `${char.name} を削除すると、関連する関係性もすべて消えます。\nよろしいですか？`,
      { title: 'キャラクター削除の確認' }
    );
    if (confirmed) {
      onDelete(char.id);
    }
  }

  return (
    <form
      onSubmit={editingId ? handleUpdate : handleAdd}
      className="space-y-4 border p-4 rounded shadow bg-white"
    >
      <h2 className="text-xl font-bold">
        {editingId ? 'キャラクター編集' : 'キャラクター追加'}
      </h2>

      {/* 名前 */}
      <div>
        <label className="block">名前:</label>
        <input
          className="border p-1 w-full"
          value={name}
          onChange={e => setName(e.target.value)}
        />
      </div>

      {/* アイコンURL */}
      <div>
        <label className="block">アイコンURL:</label>
        <input
          className="border p-1 w-full"
          value={icon}
          onChange={e => setIcon(e.target.value)}
        />
      </div>

      {/* タグ入力 */}
      <div className="space-y-3">
        {tagCategories.map(cat => (
          <div key={cat.id}>
            <label className="block font-semibold mb-1">{cat.name}</label>
            {cat.multi ? (
              <input
                type="text"
                list={`datalist-${cat.id}`}
                placeholder="カンマ区切りで入力"
                value={tags[cat.id]?.join(', ') || ''}
                onChange={e =>
                  handleMultiTagChange(cat.id, e.target.value)
                }
                className="border p-1 w-full"
              />
            ) : (
              <select
                value={tags[cat.id]?.[0] || ''}
                onChange={e =>
                  handleSingleTagChange(cat.id, e.target.value)
                }
                className="border p-1 w-full"
              >
                {cat.options.map(opt => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            )}
            {cat.multi && (
              <datalist id={`datalist-${cat.id}`}>
                {cat.options.map(opt => (
                  <option key={opt} value={opt} />
                ))}
              </datalist>
            )}
          </div>
        ))}
      </div>

      {/* 登場タイミング */}
      <div>
        <label className="block">登場タイミング（整数）:</label>
        <input
          type="number"
          className="border p-1 w-full"
          value={appearAt}
          onChange={e => {
            const v = e.target.value;
            setAppearAt(v === '' ? '' : parseInt(v, 10));
          }}
          placeholder="例: 1（1章で登場）"
        />
      </div>

      {/* 追加／更新／キャンセルボタン */}
      <div className="flex gap-2">
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded flex-1"
        >
          {editingId ? '更新' : '追加'}
        </button>
        {editingId && (
          <button
            type="button"
            onClick={resetForm}
            className="bg-gray-300 text-black px-4 py-2 rounded"
          >
            キャンセル
          </button>
        )}
      </div>

      {/* 既存キャラクター一覧（編集・削除） */}
      <div className="border-t pt-4">
        <h3 className="text-lg font-semibold mb-2">
          既存のキャラクター
        </h3>
        <ul className="space-y-2">
          {existingCharacters.map(char => (
            <li
              key={char.id}
              className="flex justify-between items-center bg-gray-50 p-2 rounded"
            >
              <span>{char.name}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="text-blue-500 text-sm"
                  onClick={() => handleEditClick(char)}
                >
                  編集
                </button>
                <button
                  type="button"
                  className="text-red-500 text-sm"
                  onClick={() => handleDeleteClick(char)}
                  >
                  削除
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </form>
  );
}
