import { useState } from 'react';
import { TagCategory } from '../types';

type Props = {
  tagCategories: TagCategory[];
  onUpdate: (updated: TagCategory[]) => void;
};

export default function TagCategoryForm({ tagCategories, onUpdate }: Props) {
  const [name, setName] = useState('');
  const [multi, setMulti] = useState(true);
  const [options, setOptions] = useState<string[]>([]);
  const [optionInput, setOptionInput] = useState('');

  const handleAdd = () => {
    if (!name.trim()) return;

    const newCategory: TagCategory = {
      id: crypto.randomUUID(),
      name: name.trim(),
      options,
      multi,
    };

    onUpdate([...tagCategories, newCategory]);

    // 初期化
    setName('');
    setMulti(true);
    setOptions([]);
    setOptionInput('');
  };

  const handleAddOption = () => {
    const trimmed = optionInput.trim();
    if (trimmed && !options.includes(trimmed)) {
      setOptions([...options, trimmed]);
    }
    setOptionInput('');
  };

  const handleDeleteOption = (optionToDelete: string) => {
    setOptions(options.filter(opt => opt !== optionToDelete));
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">タグ分類の管理</h2>

      {/* 新規追加フォーム */}
      <div className="space-y-2 border p-3 rounded bg-white shadow">
        <div className="flex gap-2">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="分類名（例: 能力）"
            className="border p-1 flex-1"
          />
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={multi}
              onChange={e => setMulti(e.target.checked)}
            />
            複数可
          </label>
        </div>

        {/* 候補入力欄 */}
        <div>
          <label className="block font-semibold">タグ候補:</label>
          <div className="flex gap-2 mt-1">
            <input
              value={optionInput}
              onChange={e => setOptionInput(e.target.value)}
              placeholder="例: 火遁"
              className="border p-1 flex-1"
            />
            <button type="button" onClick={handleAddOption} className="btn">
              候補追加
            </button>
          </div>

          {/* 現在の候補一覧 */}
          <ul className="mt-2 space-y-1 text-sm">
            {options.map(opt => (
              <li key={opt} className="flex justify-between items-center bg-gray-100 px-2 py-1 rounded">
                <span>{opt}</span>
                <button
                  type="button"
                  className="text-red-500 text-xs"
                  onClick={() => handleDeleteOption(opt)}
                >
                  削除
                </button>
              </li>
            ))}
          </ul>
        </div>

        <button onClick={handleAdd} className="btn mt-2 w-full">分類を追加</button>
      </div>

      {/* 既存のタグ分類一覧 */}
      <ul className="space-y-1 text-sm">
        {tagCategories.map(cat => (
          <li key={cat.id} className="flex justify-between items-center border p-2 rounded bg-white">
            <div>
              <strong>{cat.name}</strong>（{cat.multi ? '複数' : '単一'}）  
              <span className="text-gray-500 ml-2">候補: {cat.options.join(', ') || 'なし'}</span>
            </div>
            {/* RUD は今後追加 */}
          </li>
        ))}
      </ul>
    </div>
  );
}
