"use client";

import { useState, useCallback, useRef } from "react";

// ==================== 乐观更新状态 ====================

export interface UseOptimisticOptions<T> {
  onError?: (error: Error, previousState: T) => void;
  onSuccess?: (result: unknown, newState: T) => void;
}

export function useOptimistic<T>(
  initialState: T,
  options: UseOptimisticOptions<T> = {}
) {
  const { onError, onSuccess } = options;
  const [state, setState] = useState<T>(initialState);
  const [isPending, setIsPending] = useState(false);
  const previousStateRef = useRef<T>(initialState);

  const update = useCallback(
    async (
      newState: T,
      mutation: () => Promise<unknown>
    ): Promise<boolean> => {
      // 保存之前的状态
      previousStateRef.current = state;
      setIsPending(true);

      // 乐观更新 UI
      setState(newState);

      try {
        const result = await mutation();
        onSuccess?.(result, newState);
        return true;
      } catch (error) {
        // 回滚到之前状态
        setState(previousStateRef.current);
        onError?.(error as Error, previousStateRef.current);
        return false;
      } finally {
        setIsPending(false);
      }
    },
    [state, onError, onSuccess]
  );

  const updateWithHandler = useCallback(
    (updater: (current: T) => T, mutation: () => Promise<unknown>) => {
      const newState = updater(state);
      return update(newState, mutation);
    },
    [state, update]
  );

  const rollback = useCallback(() => {
    setState(previousStateRef.current);
  }, []);

  return {
    state,
    setState,
    update,
    updateWithHandler,
    rollback,
    isPending,
  };
}

// ==================== 乐观列表更新 ====================

export interface UseOptimisticListOptions<T> extends UseOptimisticOptions<T[]> {
  getId: (item: T) => string;
}

export function useOptimisticList<T>(
  initialList: T[],
  options: UseOptimisticListOptions<T>
) {
  const { getId, ...rest } = options;

  const {
    state: items,
    update,
    isPending,
  } = useOptimistic<T[]>(initialList, rest);

  const add = useCallback(
    async (
      item: T,
      mutation: () => Promise<unknown>
    ): Promise<boolean> => {
      const newItems = [...items, item];
      return update(newItems, mutation);
    },
    [items, update]
  );

  const remove = useCallback(
    async (
      id: string,
      mutation: () => Promise<unknown>
    ): Promise<boolean> => {
      const newItems = items.filter((item) => getId(item) !== id);
      return update(newItems, mutation);
    },
    [items, update, getId]
  );

  const updateItem = useCallback(
    async (
      id: string,
      updater: (item: T) => T,
      mutation: () => Promise<unknown>
    ): Promise<boolean> => {
      const newItems = items.map((item) =>
        getId(item) === id ? updater(item) : item
      );
      return update(newItems, mutation);
    },
    [items, update, getId]
  );

  const reorder = useCallback(
    async (
      newOrder: T[],
      mutation: () => Promise<unknown>
    ): Promise<boolean> => {
      return update(newOrder, mutation);
    },
    [update]
  );

  return {
    items,
    add,
    remove,
    updateItem,
    reorder,
    isPending,
  };
}

// ==================== 乐观表单提交 ====================

interface UseOptimisticFormOptions<T> {
  submit: (data: T) => Promise<unknown>;
  onSuccess?: (result: unknown) => void;
  onError?: (error: Error) => void;
}

export function useOptimisticForm<T>(
  initialData: T,
  options: UseOptimisticFormOptions<T>
) {
  const { submit, onSuccess, onError } = options;
  const [data, setData] = useState<T>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const updateField = useCallback(
    <K extends keyof T>(field: K, value: T[K]) => {
      setData((prev) => ({ ...prev, [field]: value }));
      setError(null);
    },
    []
  );

  const handleSubmit = useCallback(
    async (e?: React.FormEvent): Promise<boolean> => {
      e?.preventDefault();
      setIsSubmitting(true);
      setError(null);
      setIsSuccess(false);

      try {
        const result = await submit(data);
        setIsSuccess(true);
        onSuccess?.(result);
        return true;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("提交失败");
        setError(error);
        onError?.(error);
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [data, submit, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setData(initialData);
    setError(null);
    setIsSuccess(false);
  }, [initialData]);

  return {
    data,
    setData,
    updateField,
    isSubmitting,
    isSuccess,
    error,
    handleSubmit,
    reset,
  };
}

// ==================== 通用操作队列 ====================

type Operation<T> = {
  id: string;
  type: "create" | "update" | "delete";
  data: T;
  rollback: () => void;
};

export function useOperationQueue<T>() {
  const [pending, setPending] = useState<Operation<T>[]>([]);
  const queueRef = useRef<Operation<T>[]>([]);

  const add = useCallback((operation: Omit<Operation<T>, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    const op: Operation<T> = { ...operation, id };

    queueRef.current = [...queueRef.current, op];
    setPending(queueRef.current);

    return id;
  }, []);

  const remove = useCallback((id: string) => {
    queueRef.current = queueRef.current.filter((op) => op.id !== id);
    setPending(queueRef.current);
  }, []);

  const clear = useCallback(() => {
    queueRef.current = [];
    setPending([]);
  }, []);

  const execute = useCallback(
    async (
      executor: (operation: Operation<T>) => Promise<unknown>
    ): Promise<void> => {
      const operations = [...queueRef.current];

      for (const operation of operations) {
        try {
          await executor(operation);
          remove(operation.id);
        } catch {
          // 失败时停止执行
          break;
        }
      }
    },
    [remove]
  );

  return {
    pending,
    add,
    remove,
    clear,
    execute,
    count: pending.length,
  };
}
