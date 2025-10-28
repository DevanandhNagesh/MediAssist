import { createContext, useContext, useMemo } from 'react';

const ApiContext = createContext({ baseUrl: '/api' });

export const ApiProvider = ({ children }) => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';

  const value = useMemo(() => ({ baseUrl }), [baseUrl]);

  return (
    <ApiContext.Provider value={value}>
      {children}
    </ApiContext.Provider>
  );
};

export const useApiConfig = () => useContext(ApiContext);
