import React from 'react';
import { useState } from 'react';
import { Character, TagCategory } from '../types'; // 型ファイルを適宜調整

export default function CharacterForm({ onSubmit, tagCategories }: {
  onSubmit: (char: Character) => void;
  tagCategories: TagCategory[];
}) {
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'alive' | 'dead'>('alive');
  const [icon, setIcon] = useState('');
  const [tags, setTags] = useState<Record<string, string[]>>({});

  const handleTagChange = (category: string, option: string, checked: boolean) => {
    setTags(prev => {
      const existing = prev[category] || [];
      const updated = checked
        ? [...existing, option]
        : existing.filter(tag => tag !== option);
      return { ...prev, [category]: updated };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newChar: Character = {
      id: crypto.randomUUID(),
      name,
      tags,
      status,
      icon,
    };
    onSubmit(newChar);

    // フォームを初期化
    setName('');
    setStatus('alive');
    setIcon('');
    setTags({});
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border p-4 rounded shadow-md bg-white">
      <h2 className="text-xl font-semibold">キャラクター追加</h2>

      <div>
        <label className="block">名前:</label>
        <input value={name} onChange={e => setName(e.target.value)} className="border p-1 w-full" />
      </div>

      <div>
        <label className="block">生死:</label>
        <select value={status} onChange={e => setStatus(e.target.value as 'alive' | 'dead')} className="border p-1 w-full">
          <option value="alive">生存</option>
          <option value="dead">死亡</option>
        </select>
      </div>

      <div>
        <label className="block">アイコンURL:</label>
        <input value={icon} onChange={e => setIcon(e.target.value)} className="border p-1 w-full" />
      </div>

      {tagCategories.map(category => (
        <div key={category.id} className="mb-2">
          <p className="font-semibold">{category.name}</p>

          {category.multi ? (
            // ✅ 複数選択：チェックボックス
            category.options.map(option => (
              <label key={option} className="inline-flex items-center mr-4">
                <input
                  type="checkbox"
                  checked={tags[category.name]?.includes(option) || false}
                  onChange={e => handleTagChange(category.name, option, e.target.checked)}
                  className="mr-1"
                />
                {option}
              </label>
            ))
          ) : (
            // ✅ 単一選択：セレクトボックス
            <select
              value={tags[category.name]?.[0] || ''}
              onChange={e => handleTagChange(category.name, e.target.value, true)}
              className="border p-1 w-full"
            >
              <option value="">-- 選択 --</option>
              {category.options.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          )}
        </div>
      ))}

      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
        追加
      </button>
    </form>
  );
}
