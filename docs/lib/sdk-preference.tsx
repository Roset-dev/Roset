"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

export type SdkPreference = "python" | "typescript" | "curl";

interface SdkPreferenceContextValue {
  sdk: SdkPreference;
  setSdk: (sdk: SdkPreference) => void;
}

const SdkPreferenceContext = createContext<SdkPreferenceContextValue>({
  sdk: "python",
  setSdk: () => {},
});

export function useSdkPreference() {
  return useContext(SdkPreferenceContext);
}

export function SdkPreferenceProvider({ children }: { children: React.ReactNode }) {
  const [sdk, setSdkState] = useState<SdkPreference>("python");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("sdk-preference") as SdkPreference | null;
      if (stored && ["python", "typescript", "curl"].includes(stored)) {
        setSdkState(stored);
      }
    } catch {}
  }, []);

  const setSdk = useCallback((value: SdkPreference) => {
    setSdkState(value);
    try {
      localStorage.setItem("sdk-preference", value);
    } catch {}
  }, []);

  return (
    <SdkPreferenceContext.Provider value={{ sdk, setSdk }}>
      {children}
    </SdkPreferenceContext.Provider>
  );
}
