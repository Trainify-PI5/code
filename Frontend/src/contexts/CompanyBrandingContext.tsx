import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import api from '../services/api';
import { useThemeStore } from '../store/themeStore';
import { brandVariables } from '../lib/branding';

export interface CompanyBranding {
  id: string; name: string; domain: string | null;
  primaryColor: string | null; secondaryColor: string | null;
  logoUrl: string | null; logoKey: string | null;
}
const BrandingContext = createContext<{ company: CompanyBranding | null; update: (company: CompanyBranding) => void }>({ company: null, update: () => {} });
export const useBranding = () => useContext(BrandingContext);

export function CompanyBrandingProvider({ children }: { children: ReactNode }) {
  const [company, setCompany] = useState<CompanyBranding | null>(null);
  const revision = useRef(0);
  const { isDarkMode } = useThemeStore();
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const current = ++revision.current;
      try {
        const { data } = await api.get('/tenants/branding');
        if (!cancelled && current === revision.current) setCompany(data);
      } catch { return; }
    };
    load();
    const timer = window.setInterval(load, 6 * 60 * 60 * 1000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, []);
  useEffect(() => {
    const variables = brandVariables(company?.primaryColor || null, company?.secondaryColor || null, isDarkMode);
    for (const [name, value] of Object.entries(variables)) document.documentElement.style.setProperty(name, value);
    return () => { for (const name of Object.keys(variables)) document.documentElement.style.removeProperty(name); };
  }, [company, isDarkMode]);
  return <BrandingContext.Provider value={{ company, update: value => { revision.current++; setCompany(value); } }}>{children}</BrandingContext.Provider>;
}
