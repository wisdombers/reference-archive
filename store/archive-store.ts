import { create } from "zustand";
import { ReferenceSort } from "@/lib/references";

type ArchiveState = {
  query: string;
  tag: string;
  sort: ReferenceSort;
  setQuery: (query: string) => void;
  setTag: (tag: string) => void;
  setSort: (sort: ReferenceSort) => void;
};

export const useArchiveStore = create<ArchiveState>((set) => ({
  query: "",
  tag: "",
  sort: "latest",
  setQuery: (query) => set({ query }),
  setTag: (tag) => set({ tag }),
  setSort: (sort) => set({ sort })
}));
