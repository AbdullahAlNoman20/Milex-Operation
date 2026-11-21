// src/Pages/modules/operations/services/fileService.js
export const MAX_FILE_SIZE = 2 * 1024 * 1024; // demo storage cap — BACKEND TODO: real object storage
export const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

export const validateUpload = (file) => {
  if (!file) return 'No file selected';
  if (file.size > MAX_FILE_SIZE) return 'File is too large — please upload a file under 2MB';
  if (!ACCEPTED_TYPES.includes(file.type)) return 'Only PDF, JPG, or PNG files are accepted';
  return null;
};

export const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });

// Returns { name, type, size, dataUrl, uploadedAt } or throws with a user-readable message.
export const prepareFile = async (file) => {
  const err = validateUpload(file);
  if (err) throw new Error(err);
  return { name: file.name, type: file.type, size: file.size, dataUrl: await readFileAsDataUrl(file), uploadedAt: new Date().toISOString() };
};