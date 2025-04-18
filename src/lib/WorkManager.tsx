import { readTextFile, writeFile } from '@tauri-apps/plugin-fs';
import { open, save } from '@tauri-apps/plugin-dialog';
import { Work } from '../types';

export const loadWork = async (): Promise<Work | null> => {
  try {
    const filePath = await open({
      filters: [{ name: 'JSON File', extensions: ['json'] }],
      multiple: false,
    });

    if (typeof filePath === 'string') {
      const contents = await readTextFile(filePath);
      const work: Work = JSON.parse(contents);
      work.nowfilePath = filePath; // ✅ パスを保持しておく
      return work;
    } else {
      alert("読み込みがキャンセルされました。");
      return null;
    }
  } catch (error) {
    console.error("読み込みエラー:", error);
    alert("読み込みに失敗しました。詳細はコンソールを確認してください。");
    return null;
  }
};

export const saveWorkAs = async (work: Work): Promise<string | null> => {
  try {
    const filePath = await save({
      defaultPath: `${work.title.replace(/\s+/g, "_")}.json`,
      filters: [{ name: 'JSON File', extensions: ['json'] }],
      title: '保存するファイルを選んでください',
    });

    if (typeof filePath !== 'string') {
      alert("保存がキャンセルされました。");
      return null;
    }
    const encoder = new TextEncoder();
    const encodejson = encoder.encode(JSON.stringify(work, null, 2));
    await writeFile(filePath, encodejson);

    alert("保存が完了しました！");
    return filePath;
  } catch (error) {
    console.error("保存エラー:", error);
    alert("保存に失敗しました。詳細はコンソールを確認してください。");
    return null;
  }
};

export const overwriteWork = async (work: Work): Promise<boolean> => {
  if (!work.nowfilePath) {
    alert("ファイルパスがありません。まずは『新規保存』してください。");
    return false;
  }

  try {
    const encoder = new TextEncoder();
    const encodejson = encoder.encode(JSON.stringify(work, null, 2));
    await writeFile(work.nowfilePath, encodejson);
    alert("上書き保存が完了しました！");
    return true;
  } catch (error) {
    console.error("上書き保存エラー:", error);
    alert("上書き保存に失敗しました。詳細はコンソールを確認してください。");
    return false;
  }
};
