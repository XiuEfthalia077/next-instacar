"use client";

import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "instacar_favorites_ids";
const SYNC_EVENT = "instacar:favorites_change";

export function useFavorites() {
  const [favorites, setFavorites] = useState<number[]>([]);

  // Initialize from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setFavorites(JSON.parse(stored));
      }
    } catch {
      /* ignore storage error */
    }

    const handleSync = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          setFavorites(JSON.parse(stored));
        } else {
          setFavorites([]);
        }
      } catch {
        /* ignore */
      }
    };

    window.addEventListener(SYNC_EVENT, handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener(SYNC_EVENT, handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  const toggleFavorite = useCallback((carId: number) => {
    setFavorites((prev) => {
      const next = prev.includes(carId)
        ? prev.filter((id) => id !== carId)
        : [...prev, carId];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        window.dispatchEvent(new CustomEvent(SYNC_EVENT));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const isFavorite = useCallback(
    (carId: number) => favorites.includes(carId),
    [favorites],
  );

  return {
    favorites,
    isFavorite,
    toggleFavorite,
    count: favorites.length,
  };
}
