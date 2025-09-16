import { useState, useEffect, useCallback } from 'react';
import { ApiResponse } from '../types';

/**
 * API请求状态
 */
interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * useApi Hook选项
 */
interface UseApiOptions {
  immediate?: boolean; // 是否立即执行
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

/**
 * 通用API Hook
 * 提供加载状态、错误处理和数据管理
 */
export function useApi<T>(
  apiFunction: () => Promise<ApiResponse<T>>,
  options: UseApiOptions = {}
) {
  const { immediate = true, onSuccess, onError } = options;
  
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await apiFunction();
      
      if (response.success && response.data) {
        setState({
          data: response.data,
          loading: false,
          error: null,
        });
        onSuccess?.(response.data);
      } else {
        const errorMessage = response.error || '请求失败';
        setState({
          data: null,
          loading: false,
          error: errorMessage,
        });
        onError?.(errorMessage);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '网络错误';
      setState({
        data: null,
        loading: false,
        error: errorMessage,
      });
      onError?.(errorMessage);
    }
  }, [apiFunction, onSuccess, onError]);

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
    });
  }, []);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return {
    ...state,
    execute,
    reset,
  };
}

/**
 * 异步操作Hook
 * 用于处理创建、更新、删除等操作
 */
export function useAsyncOperation<T, P = any>(
  operation: (params: P) => Promise<ApiResponse<T>>,
  options: UseApiOptions = {}
) {
  const { onSuccess, onError } = options;
  
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async (params: P) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await operation(params);
      
      if (response.success) {
        setState({
          data: response.data || null,
          loading: false,
          error: null,
        });
        onSuccess?.(response.data);
        return response.data;
      } else {
        const errorMessage = response.error || '操作失败';
        setState({
          data: null,
          loading: false,
          error: errorMessage,
        });
        onError?.(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '操作失败';
      setState({
        data: null,
        loading: false,
        error: errorMessage,
      });
      onError?.(errorMessage);
      throw error;
    }
  }, [operation, onSuccess, onError]);

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

/**
 * 列表数据Hook
 * 专门用于处理列表数据的获取和管理
 */
export function useList<T>(
  fetchFunction: () => Promise<ApiResponse<T[]>>,
  options: UseApiOptions = {}
) {
  const { immediate = true, onSuccess, onError } = options;
  
  const [state, setState] = useState<{
    items: T[];
    loading: boolean;
    error: string | null;
  }>({
    items: [],
    loading: false,
    error: null,
  });

  const fetch = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await fetchFunction();
      
      if (response.success && response.data) {
        setState({
          items: response.data,
          loading: false,
          error: null,
        });
        onSuccess?.(response.data);
      } else {
        const errorMessage = response.error || '获取数据失败';
        setState({
          items: [],
          loading: false,
          error: errorMessage,
        });
        onError?.(errorMessage);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '网络错误';
      setState({
        items: [],
        loading: false,
        error: errorMessage,
      });
      onError?.(errorMessage);
    }
  }, [fetchFunction, onSuccess, onError]);

  const addItem = useCallback((item: T) => {
    setState(prev => ({
      ...prev,
      items: [...prev.items, item],
    }));
  }, []);

  const updateItem = useCallback((index: number, item: T) => {
    setState(prev => ({
      ...prev,
      items: prev.items.map((existingItem, i) => i === index ? item : existingItem),
    }));
  }, []);

  const removeItem = useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  }, []);

  const reset = useCallback(() => {
    setState({
      items: [],
      loading: false,
      error: null,
    });
  }, []);

  useEffect(() => {
    if (immediate) {
      fetch();
    }
  }, [fetch, immediate]);

  return {
    ...state,
    fetch,
    addItem,
    updateItem,
    removeItem,
    reset,
  };
}

/**
 * 防抖Hook
 * 用于优化搜索等频繁操作
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * 本地存储Hook
 * 用于持久化状态管理
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue] as const;
}