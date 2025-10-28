import { useMemo } from 'react';
import axios from 'axios';
import { useApiConfig } from '../context/ApiContext.jsx';

export const useApi = () => {
  const { baseUrl } = useApiConfig();

  return useMemo(() => {
    const instance = axios.create({
      baseURL: baseUrl,
      timeout: 120000, // 2 minutes - increased for prescription OCR processing
      headers: {
        'Content-Type': 'application/json'
      }
    });

    instance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          return Promise.reject(
            new Error(error.response.data?.message || 'Request failed')
          );
        }
        if (error.request) {
          return Promise.reject(new Error('Network error. Please check your connection.'));
        }
        return Promise.reject(error);
      }
    );

    return instance;
  }, [baseUrl]);
};

export default useApi;
