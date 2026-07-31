import { createContext, useContext, useState, ReactNode } from "react";

interface Ctx { open: boolean; setOpen: (v: boolean) => void; }
const AusCtx = createContext<Ctx>({ open: false, setOpen: () => {} });

export function AusMarketProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <AusCtx.Provider value={{ open, setOpen }}>{children}</AusCtx.Provider>;
}

export function useAusMarket() { return useContext(AusCtx); }
