// src/Pages/modules/operations/utils/avatar.js
// BACKEND TODO: upload to storage and keep only the URL on the user record.
const KEY = (email) => `milex_ops_v3_avatar_${String(email || '').toLowerCase()}`;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const getAvatar = (email) => { try { return window.localStorage.getItem(KEY(email)); } catch { return null; } };
export const removeAvatar = (email) => { try { window.localStorage.removeItem(KEY(email)); } catch { /* noop */ } window.dispatchEvent(new CustomEvent('milex-ops-avatar')); };

// Validates type + size, crops to a 256px square and stores a small JPEG.
export const saveAvatarFile = (email, file) => new Promise((resolve, reject) => {
  if (!file || !TYPES.includes(file.type)) return reject(new Error('Choose a JPG, PNG or WebP image'));
  if (file.size > 5 * 1024 * 1024) return reject(new Error('Image must be 5MB or smaller'));
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    const size = Math.min(img.width, img.height);
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    c.getContext('2d').drawImage(img, (img.width - size) / 2, (img.height - size) / 2, size, size, 0, 0, 256, 256);
    URL.revokeObjectURL(url);
    try { const data = c.toDataURL('image/jpeg', 0.85); window.localStorage.setItem(KEY(email), data); window.dispatchEvent(new CustomEvent('milex-ops-avatar')); resolve(data); }
    catch { reject(new Error('Could not save the picture')); }
  };
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('This file is not a valid image')); };
  img.src = url;
});