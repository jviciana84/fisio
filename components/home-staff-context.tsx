"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

export type HomeStaffContextValue = {
  staffOpen: boolean
  staffDetailIndex: number | null
  setStaffDetailIndex: (index: number | null) => void
  openStaff: () => void
  closeStaff: () => void
}

const HomeStaffContext = createContext<HomeStaffContextValue | null>(null)

export function HomeStaffProvider({ children }: { children: ReactNode }) {
  const [staffOpen, setStaffOpen] = useState(false)
  const [staffDetailIndex, setStaffDetailIndex] = useState<number | null>(null)

  const closeStaff = useCallback(() => {
    setStaffDetailIndex(null)
    setStaffOpen(false)
  }, [])

  const openStaff = useCallback(() => {
    setStaffDetailIndex(null)
    setStaffOpen(true)
    requestAnimationFrame(() => {
      document.getElementById("inicio")?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }, [])

  const value = useMemo(
    () => ({
      staffOpen,
      staffDetailIndex,
      setStaffDetailIndex,
      openStaff,
      closeStaff,
    }),
    [staffOpen, staffDetailIndex, closeStaff, openStaff],
  )

  return <HomeStaffContext.Provider value={value}>{children}</HomeStaffContext.Provider>
}

export function useHomeStaff() {
  const ctx = useContext(HomeStaffContext)
  if (!ctx) {
    throw new Error("useHomeStaff debe usarse dentro de HomeStaffProvider")
  }
  return ctx
}
