import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, Client } from './api';

interface FilterContextType {
  selectedFY: string;
  setSelectedFY: (fy: string) => void;
  selectedClient: string;
  setSelectedClient: (clientId: string) => void;
  availableYears: string[];
  clients: Client[];
  loading: boolean;
  refreshFilters: () => Promise<void>;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [selectedFY, setSelectedFY] = useState<string>('');
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFilterOptions = async () => {
    setLoading(true);
    try {
      // 1. Fetch clients list
      const clientList = await api.clients.list();
      setClients(clientList);

      // 2. Fetch available years via the stats API
      const statsRes = await api.dashboard.getStats();
      if (statsRes && statsRes.availableYears) {
        setAvailableYears(statsRes.availableYears);
      }
    } catch (err) {
      console.error('Failed to fetch global filter options:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  return (
    <FilterContext.Provider
      value={{
        selectedFY,
        setSelectedFY,
        selectedClient,
        setSelectedClient,
        availableYears,
        clients,
        loading,
        refreshFilters: fetchFilterOptions
      }}
    >
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
}
