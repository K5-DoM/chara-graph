import { useState } from 'react';
import { TagCategory,Work } from '../types';

export default function WorkForm({ onSubmit }: { onSubmit: (work: Work) => void }) {
  const [title, setTitle] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert("タイトルを入力してください");
      return;
    }

    const now = new Date().toISOString();

    const deadoraliveCategory: TagCategory = {
      id: '0',
      name: "生死",
      options: ["生存","死亡"],
      multi:false,
    }
    const genderCategory: TagCategory = {
      id: '1',
      name: "性別",
      options: ["男性", "女性", "その他"],
      multi: false,
    };

    const newWork: Work = {
      id: crypto.randomUUID(),
      title,
      characters: [],
      tagCategories: [deadoraliveCategory,genderCategory],
      organizations:[],
      createdAt: now,
      updatedAt: now,
      relations: [],
      maxTime:3
      // 保存されていない状態なので filePath は含めない
    };

    onSubmit(newWork);
    setTitle('');
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border rounded space-y-2 bg-white">
      <div>
        <label>タイトル:</label>
        <input
          className="border p-1 w-full"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="例：星を継ぐ者"
        />
      </div>
      <button className="bg-blue-500 text-white px-4 py-2 rounded" type="submit">新規作成</button>
    </form>
  );
}
