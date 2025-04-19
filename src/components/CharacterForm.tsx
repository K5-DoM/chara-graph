import { useState } from 'react';
import { Character, TagCategory } from '../types';

type Props = {
  tagCategories: TagCategory[];
  existingCharacters: Character[]; // 現在のキャラ一覧を受け取る
  onUpdate: (updated: Character[]) => void;
};

export default function CharacterForm({ tagCategories, existingCharacters,onUpdate }: Props) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [tags, setTags] = useState<Record<string, string[]>>({});
  const [appearAt, setAppearAt] = useState<number | ''>('');

  const handleSubmit = (e: React.FormEvent) => {
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

    // 初期化
    setName('');
    setIcon('');
    setTags({});
  };

  const handleMultiTagChange = (categoryName: string, input: string) => {
    const list = input
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean);
    setTags(prev => ({ ...prev, [categoryName]: list }));
  };

  const handleSingleTagChange = (categoryName: string, input: string) => {
    const value = input.trim();
    setTags(prev => ({ ...prev, [categoryName]: value ? [value] : [] }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border p-4 rounded shadow bg-white">
      <h2 className="text-xl font-bold">キャラクター追加</h2>

      <div>
        <label className="block">名前:</label>
        <input
          className="border p-1 w-full"
          value={name}
          onChange={e => setName(e.target.value)}
        />
      </div>
      <div>
        <label className="block">アイコンURL:</label>
        <input
          className="border p-1 w-full"
          value={icon}
          onChange={e => setIcon(e.target.value)}
        />
      </div>

      {/* タグ入力部分 */}
      <div className="space-y-3">
        {tagCategories.map(category => (
          <div key={category.id}>
          <label className="block font-semibold mb-1">{category.name}</label>

          {category.multi ? (
            // 複数選択（カンマ区切り入力）
            <input
              type="text"
              list={`datalist-${category.id}`}
              placeholder="カンマ区切りで入力（例: 火遁,雷遁）"
              value={tags[category.name]?.join(', ') || ''}
              onChange={e => handleMultiTagChange(category.name, e.target.value)}
              className="border p-1 w-full"
            />
          ) : (
            // 単一選択：セレクトボックスに置き換え！
            <select
              value={tags[category.name]?.[0] || ''}
              onChange={e => handleSingleTagChange(category.name, e.target.value)}
              className="border p-1 w-full"
            >
              <option value="">-- 選択してください --</option>
              {category.options.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          )}

          {/* サジェストは multi: true のときだけ使う */}
          {category.multi && (
            <datalist id={`datalist-${category.id}`}>
              {category.options.map(option => (
                <option key={option} value={option} />
              ))}
            </datalist>
          )}
        </div>
        ))}
      </div>
      <div>
        <label className="block">登場タイミング（整数）:</label>
        <input
          type="number"
          className="border p-1 w-full"
          value={appearAt}
          onChange={e => {
            const val = e.target.value;
            setAppearAt(val === '' ? '' : parseInt(val));
          }}
          placeholder="例: 1（1章で登場）"
        />
      </div>


      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
        追加
      </button>
    </form>
  );
}
