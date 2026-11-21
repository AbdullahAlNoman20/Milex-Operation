// ===== 5) src/Pages/modules/operations/utils/openFile.js  (REPLACE ENTIRE FILE — opens uploaded files in the same tab; browser Back returns to the app) =====
export const openDataUrl = async (file, onError) => {
  try {
    if (!file?.dataUrl) throw new Error('No file');
    const blob = await (await fetch(file.dataUrl)).blob();
    window.location.assign(URL.createObjectURL(blob));
  } catch {
    onError?.();
  }
};