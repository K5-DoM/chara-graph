import { useState } from 'react';
import { TagCategory,Character} from '../types';
import { confirm } from '@tauri-apps/plugin-dialog'

type Props = {
  existingCharacters:Character[]
  existingtagCategories: TagCategory[];
  onUpdate: (updatedTagCategories: TagCategory[],updatedCharacters: Character[]) => void;
};

export default function TagCategoryForm({ existingCharacters,existingtagCategories, onUpdate}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [multi, setMulti] = useState(true);
  const [options, setOptions] = useState<string[]>([]);
  const [optionInput, setOptionInput] = useState('');
  const handleEditClick = (cat: TagCategory) => {
    setEditingId(cat.id);
    setName(cat.name);
    setMulti(cat.multi);
    setOptions(cat.options);
  };

  const handleAdd = () => {
    if (!name.trim()) return;

    const newCategory: TagCategory = {
      id: crypto.randomUUID(),
      name: name.trim(),
      options,
      multi,
    };
    const updatedCharacters = existingCharacters.map(char => {
      if (char.tags.hasOwnProperty(newCategory.name)) return char;
      return {
        ...char,
        tags: {
          ...char.tags,
          [newCategory.name]: [],
        },
      };
    });
    onUpdate([...existingtagCategories, newCategory],updatedCharacters);
    // 初期化
    setName('');
    setMulti(true);
    setOptions([]);
    setOptionInput('');
  };
  const handleUpdate = () => {
    if (!editingId) return;
    const trimmed = name.trim();
    if (!trimmed) return;

    // 1) カテゴリ一覧を更新
    const newTagCats = existingtagCategories.map(cat =>
      cat.id === editingId
        ? { ...cat, name: trimmed, multi, options }
        : cat
    );

    // 2) 各キャラの tags キーを（名前が変わったら）マイグレーション
    const oldCat = existingtagCategories.find(c => c.id === editingId)!;
    const oldKey = oldCat.name;
    const newKey = trimmed;

    const newCharacters = existingCharacters.map(char => {
      const newTags = { ...char.tags };
      if (oldKey !== newKey && oldKey in newTags) {
        newTags[newKey] = newTags[oldKey];
        delete newTags[oldKey];
      }
      return { ...char, tags: newTags };
    });

    // 3) 親コンポーネントにまとめて通知
    onUpdate(newTagCats, newCharacters);

    // 4) 編集モード解除・フォーム初期化
    setEditingId(null);
    setName('');
    setMulti(true);
    setOptions([]);
    setOptionInput('');
  };

    // ─── ④ 編集キャンセル ───
    const handleCancel = () => {
      setEditingId(null);
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

  function handleDeleteCategory(categoryId: string) {
    // 1) カテゴリ配列から削除
    const afterdeleteTagCats = existingtagCategories.filter(c => c.id !== categoryId);
  
    // 2) 各キャラクターの tags から該当キーを除去
    const afterdeleteCharacters = existingCharacters.map(char => {
      const {[categoryId]: _, ...rest} = char.tags;
      return {
        ...char,
        tags: rest,
      };
    });
  
    // 3) 親コンポーネントにまとめて通知
    onUpdate(afterdeleteTagCats, afterdeleteCharacters);
  }

  async function handleDeleteClick(tagCat:TagCategory) {
    const confirmed = await confirm(
      `${tagCat.name} を削除すると、全てのキャラからそのタグが消えます。\nよろしいですか？`);
    if (confirmed) { handleDeleteCategory(tagCat.id)}
  }
  

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{editingId ? 'タグ分類を編集' : 'タグ分類の管理'}</h2>

      {/* 新規追加or編集フォーム */}
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
            <button type="button" onClick={handleAddOption} className="btn">候補追加</button>
        <div className="flex gap-2">
          <button
            onClick={editingId ? handleUpdate : handleAdd}
            className="btn flex-1"
          >
            {editingId ? '更新' : '分類を追加'}
          </button>
          {editingId && (
            <button
              onClick={handleCancel}
              className="btn bg-gray-300 text-black"
            >
              キャンセル
            </button>
          )}
        </div>
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
      </div>

      {/* 既存のタグ分類一覧 */}
      <ul className="space-y-1 text-sm">
        {existingtagCategories.map(cat => (
          <li key={cat.id} className="flex justify-between items-center border p-2 rounded bg-white">
            <div>
              <strong>{cat.name}</strong>（{cat.multi ? '複数' : '単一'}）  
              <span className="text-gray-500 ml-2">候補: {cat.options.join(', ') || 'なし'}</span>
              <button
                type="button"
                className="text-blue-500 text-sm"
                onClick={() => handleEditClick(cat)}
              >
                編集
              </button>
              <button
                type="button"
                className="text-red-500 text-sm"
                onClick={() => handleDeleteClick(cat)}
              >
                削除
              </button>
            </div>
            {/* RUD は今後追加 */}
          </li>
        ))}
      </ul>
    </div>
  );
}
