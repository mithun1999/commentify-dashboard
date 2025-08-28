import { create } from 'zustand'

type HistoryStatus = 'pending' | 'completed'

interface HistoryStoreState {
  status: HistoryStatus
  setStatus: (status: HistoryStatus) => void
  open: 'create' | 'update' | 'delete' | 'import' | null
  setOpen: (open: 'create' | 'update' | 'delete' | 'import' | null) => void
  currentRow: unknown | null
  setCurrentRow: (row: unknown | null) => void
  pageIndex: number
  setPageIndex: (pageIndex: number) => void
  pageSize: number
  setPageSize: (pageSize: number) => void
}

export const useHistoryStore = create<HistoryStoreState>((set) => ({
  status: 'pending',
  setStatus: (status) => set({ status }),
  open: null,
  setOpen: (open) => set({ open }),
  currentRow: null,
  setCurrentRow: (row) => set({ currentRow: row }),
  pageIndex: 0,
  setPageIndex: (pageIndex) => set({ pageIndex }),
  pageSize: 10,
  setPageSize: (pageSize) => set({ pageSize }),
}))
