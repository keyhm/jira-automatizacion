import { useEffect, useState } from 'react';

export default function useLocalStorageState(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // localStorage puede no estar disponible (modo privado, storage lleno); ignorar.
    }
  }, [key, value]);

  return [value, setValue];
}
