import { useState } from 'react';
import { Character, TagCategory } from '../types';
import { confirm } from '@tauri-apps/plugin-dialog';

type Props = {
  tagCategories: TagCategory[];
  existingCharacters: Character[];
  onUpdate: (updated: Character[]) => void;
  onDelete: (charId: string) => void;
};

function moveAt<T>(arr: T[], from: number, to: number): T[] {
  const copy = arr.slice();
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

/* ─── タグ初期化ヘルパー ─── */
function makeInitialTags(
  tagCategories: TagCategory[]
): Record<string, string[]> {
  const t: Record<string, string[]> = {};
  tagCategories.forEach((cat) => {
    t[cat.id] = cat.multi ? [] : [cat.options[0] || ''];
  });
  return t;
}

export default function CharacterForm({
  tagCategories,
  existingCharacters,
  onUpdate,
  onDelete,
}: Props) {
  /* ─── state ─── */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [tags, setTags] = useState<Record<string, string[]>>(
    () => makeInitialTags(tagCategories)
  );
  const [appearAt, setAppearAt] = useState<number | ''>('');
  const [disappearAt, setDisappearAt] = useState<number | ''>('');

  /* ─── reset ─── */
  const resetForm = () => {
    setEditingId(null);
    setName('');
    setIcon('');
    setTags(makeInitialTags(tagCategories));
    setAppearAt('');
    setDisappearAt('');
  };

  /* ─── 登録／更新 共通バリデーション ─── */
  const basicCheck = (): boolean => {
    if (!name.trim()) {
      alert('名前を入力してください');
      return false;
    }
    if (appearAt === '') {
      alert('登場タイミングを入力してください');
      return false;
    }
    if (
      disappearAt !== '' &&
      Number(disappearAt) <= Number(appearAt)
    ) {
      alert('消失タイミングは登場より後にしてください');
      return false;
    }
    return true;
  };

  /* ─── 追加 ─── */
  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!basicCheck()) return;

    const newChar: Character = {
      id: crypto.randomUUID(),
      name: name.trim(),
      tags,
      icon: icon.trim() || undefined,
      appearAt: Number(appearAt),
      ...(disappearAt !== '' ? { disappearAt: Number(disappearAt) } : {}),
    };

    onUpdate([...existingCharacters, newChar]);
    resetForm();
  };

  /* ─── 更新 ─── */
  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !basicCheck()) return;

    const updatedChar: Character = {
      id: editingId,
      name: name.trim(),
      icon: icon.trim() || undefined,
      tags,
      appearAt: Number(appearAt),
      ...(disappearAt !== '' ? { disappearAt: Number(disappearAt) } : {}),
    };

    const newList = existingCharacters.map((c) =>
      c.id === editingId ? updatedChar : c
    );
    onUpdate(newList);
    resetForm();
  };

  /* ─── タグ入力ハンドラ ─── */
  const handleMultiTagChange = (catId: string, value: string) => {
    const arr = value.split(',').map((t) => t.trim()).filter(Boolean);
    setTags((p) => ({ ...p, [catId]: arr }));
  };
  const handleSingleTagChange = (catId: string, value: string) => {
    setTags((p) => ({ ...p, [catId]: value ? [value] : [] }));
  };

  /* ─── 編集／削除 ─── */
  const handleEditClick = (char: Character) => {
    setEditingId(char.id);
    setName(char.name);
    setIcon(char.icon ?? '');
    const merged = makeInitialTags(tagCategories);
    Object.entries(char.tags).forEach(([id, vals]) => (merged[id] = vals));
    setTags(merged);
    setAppearAt(char.appearAt ?? '');
    setDisappearAt(char.disappearAt ?? '');
  };

  async function handleDeleteClick(char: Character) {
    const ok = await confirm(
      `${char.name} を削除すると関連する関係性も消えます。続行しますか？`,
      { title: 'キャラクター削除' }
    );
    if (ok) onDelete(char.id);
  }

  /* ─── UI ─── */
  return (
    <form
      onSubmit={editingId ? handleUpdate : handleAdd}
      className="space-y-4 border p-4 rounded shadow bg-white"
    >
      <h2 className="text-xl font-bold">
        {editingId ? 'キャラクター編集' : 'キャラクター追加'}
      </h2>

      {/* 名前 / アイコン */}
      <div>
        <label className="block">名前:</label>
        <input
          className="border p-1 w-full"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <label className="block">アイコンURL:</label>
        <input
          className="border p-1 w-full"
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
        />
      </div>

      {/* タグ入力 */}
      <div className="space-y-3">
        {tagCategories.map((cat) => (
          <div key={cat.id}>
            <label className="block font-semibold mb-1">{cat.name}</label>
            {cat.multi ? (
              <>
                <input
                  type="text"
                  list={`datalist-${cat.id}`}
                  placeholder="カンマ区切りで入力"
                  value={tags[cat.id]?.join(', ') || ''}
                  onChange={(e) =>
                    handleMultiTagChange(cat.id, e.target.value)
                  }
                  className="border p-1 w-full"
                />
                <datalist id={`datalist-${cat.id}`}>
                  {cat.options.map((o) => (
                    <option key={o} value={o} />
                  ))}
                </datalist>
              </>
            ) : (
              <select
                className="border p-1 w-full"
                value={tags[cat.id]?.[0] || ''}
                onChange={(e) =>
                  handleSingleTagChange(cat.id, e.target.value)
                }
              >
                {cat.options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            )}
          </div>
        ))}
      </div>

      {/* 出現／消失タイミング */}
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block">登場タイミング:</label>
          <input
            type="number"
            className="border p-1 w-full"
            value={appearAt}
            onChange={(e) =>
              setAppearAt(e.target.value === '' ? '' : Number(e.target.value))
            }
            placeholder="例: 1"
          />
        </div>
        <div className="flex-1">
          <label className="block">消失タイミング(任意):</label>
          <input
            type="number"
            className="border p-1 w-full"
            value={disappearAt}
            onChange={(e) =>
              setDisappearAt(
                e.target.value === '' ? '' : Number(e.target.value)
              )
            }
            placeholder="例: 10"
          />
        </div>
      </div>

      {/* ボタン */}
      <div className="flex gap-2">
        <button className="btn bg-blue-600 text-white flex-1" type="submit">
          {editingId ? '更新' : '追加'}
        </button>
        {editingId && (
          <button className="btn bg-gray-300" type="button" onClick={resetForm}>
            キャンセル
          </button>
        )}
      </div>

      {/* 一覧 */}
      <div className="border-t pt-4">
        <h3 className="text-lg font-semibold mb-2">既存キャラクター（Tabで選択・上下キーで移動）</h3>
        <ul className="space-y-2">
          {existingCharacters.map((c,idx) => {
            const ended = c.disappearAt !== undefined;
            return (
              <li
                key={c.id}
                id={`char-${c.id}`} 
                tabIndex={0}
                className={`flex justify-between items-center p-2 rounded
                focus:ring-2 focus:ring-blue-400 cursor-pointer
                ${ended ? 'bg-gray-200 text-gray-500' : 'bg-gray-50'}`}
                onKeyDown={e => {
                  if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;

                  e.preventDefault();        // スクロール抑制
                  const dir = e.key === 'ArrowUp' ? -1 : 1;
                  const next = idx + dir;
                  if (next < 0 || next >= existingCharacters.length) return;

                  const reordered = moveAt(existingCharacters, idx, next);
                  onUpdate(reordered);

                  /* 再レンダリング後に自分にフォーカスを戻す */
                  requestAnimationFrame(() => {
                    document.getElementById(`char-${c.id}`)?.focus();
                  });
                }}
              >
                <span>
                  {c.name}{' '}
                  <span className="text-xs text-gray-400">
                    ({c.appearAt}〜{c.disappearAt ?? '…'})
                  </span>
                </span>
                <div className="flex gap-2">
                  <button type='button'
                    className="text-blue-500 text-sm"
                    onClick={() => handleEditClick(c)}
                  >
                    編集
                  </button>
                  <button type='button'
                    className="text-red-500 text-sm"
                    onClick={() => handleDeleteClick(c)}
                  >
                    削除
                  </button>
                </div>
              </li>
            );
          })}
          {existingCharacters.length === 0 && (
            <li className="text-gray-400">キャラクターがいません</li>
          )}
        </ul>
      </div>
    </form>
  );
}
