import { create } from "zustand"; 

export interface MenuItem {
  _id: number;
  Prob_name: string;
  order?: number;
  Prob_pic: string;
  // other fields as needed
}

interface MenuStoreState {
  menu: MenuItem[];
  menuLoading: boolean;
  imgLoaded: boolean[];
  fetchMenu: () => Promise<void>;
  setImgLoaded: (index: number) => void;
}

export const useMenuStore = create<MenuStoreState>((set) => ({
  menu: [],
  menuLoading: false,
  imgLoaded: [],
  fetchMenu: async () => {
    set({ menuLoading: true });
    try {
      console.log("🔍 Fetching menu from /api/menu-direct...");
      const response = await fetch("/api/menu-direct");
      if (!response.ok) {
        throw new Error("Failed to fetch menu data");
      }
      const data = await response.json();
      console.log("🔍 Menu data received:", data);
      console.log("🔍 Menu data length:", data.length);
      console.log("🔍 Menu Prob_names:", data.map((item: any) => item.Prob_name));
      await new Promise(resolve => setTimeout(resolve, 500));
      set({ menu: data, menuLoading: false, imgLoaded: new Array(data.length).fill(false) });
    } catch (error) {
      console.error("Error fetching menu:", error);
      set({ menuLoading: false });
    }
  },
  setImgLoaded: (index: number) =>
    set((state) => {
      const newImgLoaded = [...state.imgLoaded];
      newImgLoaded[index] = true;
      return { imgLoaded: newImgLoaded };
    }),
}));
