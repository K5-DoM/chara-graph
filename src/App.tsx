import { useState } from 'react';
import { saveWorkAs, loadWork,overwriteWork } from './lib/WorkManager';
import CharacterForm from './components/CharacterForm';
import WorkForm from './components/WorkForm';
import RelationForm from './components/RelationForm';
import TagCategoryForm from './components/TagCategoryForm';
import { Work, Character, Relation,TagCategory} from './types';

type Mode = 'none' | 'new-work' | 'add-character' | 'add-relation'|'add-tagcat';

function App() {
  const [currentWork, setCurrentWork] = useState<Work | null>(null);
  const [mode, setMode] = useState<Mode>('none');

  const handleUpdateCharacters = (updated: Character[]) => {
    if (!currentWork) return;
    setCurrentWork({
      ...currentWork,
      characters: updated,
      updatedAt: new Date().toISOString(),
    });
  };
  
  const handleUpdateRelations = (updated: Relation[]) => {
    if (!currentWork) return;
    setCurrentWork({
      ...currentWork,
      relations: updated,
      updatedAt: new Date().toISOString(),
    });
  };
/* 
  const handleUpdateTagCategories = (updated: TagCategory[]) => {
    if (!currentWork) return;
    setCurrentWork({
      ...currentWork,
      tagCategories: updated,
      updatedAt: new Date().toISOString(),
    });
  };
*/
  const handleDeleteCharacterAndRelations = (charId: string) => {
    setCurrentWork(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        characters: prev.characters.filter(c => c.id !== charId),
        relations: prev.relations.filter(
          r => r.sourceId !== charId && r.targetId !== charId
        ),
        updatedAt: new Date().toISOString(),
      };
    });
};
   // タグカテゴリ＋キャラクターを一度に更新するハンドラ
  const handleUpdateTagCategoriesAndCharacters = (
    updatedTagCategories: TagCategory[],
    updatedCharacters: Character[]
  ) => {
    if (!currentWork) return;
    setCurrentWork(prev => ({
      ...prev!,
      tagCategories: updatedTagCategories,
      characters: updatedCharacters,
      updatedAt: new Date().toISOString(),
    }));
  };
  return (
    <div className="h-screen flex flex-col bg-gray-50 font-sans">
      {/* 上部メニューボタンバー */}
      <div className="bg-gray-200 p-2 flex gap-2">
        <button onClick={() => { setCurrentWork(null); setMode('new-work'); }} className="btn">新規作成</button>
        <button onClick={() => currentWork && saveWorkAs(currentWork)} className="btn" disabled={!currentWork}>新規保存</button>
        <button onClick={() => currentWork && overwriteWork(currentWork)} className="btn" disabled={!currentWork}>上書き</button>
        <button onClick={async () => {
          const loaded = await loadWork();
          if (loaded) {
            setCurrentWork(loaded);
            setMode('none');
          }
        }} className="btn">読み込み</button>
        <button onClick={() => setMode('add-character')} className="btn" disabled={!currentWork}>キャラ</button>
        <button onClick={() => setMode('add-relation')} className="btn" disabled={!currentWork}>関係性</button>
        <button onClick={() => setMode('add-tagcat')} className="btn" disabled={!currentWork}>タグカテゴリ</button>
      </div>

      {/* 二画面レイアウト */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左側：フォーム切り替え */}
        <div className="w-1/2 p-4 overflow-auto border-r bg-white">
          {mode === 'new-work' && (
            <WorkForm onSubmit={work => { setCurrentWork(work); setMode('none'); }} />
          )}
          {mode === 'add-character' && currentWork && (
            <CharacterForm
              tagCategories={currentWork.tagCategories}
              existingCharacters={currentWork.characters}
              onUpdate={handleUpdateCharacters}
              onDelete={handleDeleteCharacterAndRelations}
            />
          )}
          {mode === 'add-relation' && currentWork && (
            <RelationForm
              characters={currentWork.characters}
              existingRelations={currentWork.relations}
              onUpdate={handleUpdateRelations}
            />
          )}
          {mode === 'add-tagcat' && currentWork && (
            <TagCategoryForm
              existingCharacters={currentWork.characters}
              existingtagCategories={currentWork.tagCategories}
              onUpdate={handleUpdateTagCategoriesAndCharacters}
            />
          )}
          {mode === 'none' && (
            <p className="text-gray-500">左のメニューから操作を選んでください。</p>
          )}
        </div>

        {/* 右側：JSON（または将来的にグラフ） */}
        <div className="w-1/2 p-4 overflow-auto bg-gray-100">
          {currentWork ? (
            <pre className="bg-white p-3 border rounded text-sm whitespace-pre-wrap">
              {JSON.stringify(currentWork, null, 2)}
            </pre>
          ) : (
            <p className="text-gray-500">作品が読み込まれていません。</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
