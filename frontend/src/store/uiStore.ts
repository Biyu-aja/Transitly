import { create } from 'zustand';

interface UIState {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    feedRadius: number | null;
    setFeedRadius: (radius: number | null) => void;
    feedCoords: { lat: number; lng: number } | null;
    setFeedCoords: (coords: { lat: number; lng: number } | null) => void;
    trendingTags: [string, number][];
    setTrendingTags: (tags: [string, number][]) => void;
}

export const useUIStore = create<UIState>((set) => ({
    searchQuery: '',
    setSearchQuery: (query) => set({ searchQuery: query }),
    feedRadius: null,
    setFeedRadius: (radius) => set({ feedRadius: radius }),
    feedCoords: null,
    setFeedCoords: (coords) => set({ feedCoords: coords }),
    trendingTags: [],
    setTrendingTags: (tags) => set({ trendingTags: tags }),
}));
