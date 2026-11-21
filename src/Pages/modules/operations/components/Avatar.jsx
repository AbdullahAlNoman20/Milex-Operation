// src/Pages/modules/operations/components/Avatar.jsx
import { useEffect, useState } from 'react';
import { getAvatar } from '../utils/avatar';

const Avatar = ({ user, size = 36, className = '' }) => {
  const [src, setSrc] = useState(() => getAvatar(user?.email));
  useEffect(() => {
    const sync = () => setSrc(getAvatar(user?.email));
    sync();
    window.addEventListener('milex-ops-avatar', sync);
    return () => window.removeEventListener('milex-ops-avatar', sync);
  }, [user?.email]);
  const style = { width: size, height: size };
  return src
    ? <img src={src} alt="" style={style} className={`rounded-full object-cover shrink-0 ${className}`} />
    : <span style={style} className={`rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-black shrink-0 ${className}`}>{user?.name?.charAt(0) || '?'}</span>;
};

export default Avatar;