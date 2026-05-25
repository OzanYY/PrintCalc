import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ordersAPI, downloadOrdersCSV } from '@/api/orders';
import type {
  Order,
  CreateOrderData,
  UpdateOrderData,
  OrderStatsResponse,
} from '@/api/orders';

// ─── Типы ─────────────────────────────────────────────────────────────────────

type OrderStatus = 'in_progress' | 'completed' | 'cancelled';

interface Pagination {
  limit: number;
  offset: number;
  total: number;
}

interface UseOrdersOptions {
  /** Автоматически загружать заказы при монтировании */
  autoFetch?: boolean;
  /** Начальный фильтр по статусу */
  initialStatus?: OrderStatus | null;
  /** Кол-во заказов на странице */
  pageSize?: number;
}

interface UseOrdersReturn {
  // ─── Данные ────────────────────────────────────────────────────────────────
  orders: Order[];
  stats: OrderStatsResponse | null;
  pagination: Pagination;

  // ─── Состояние загрузки ────────────────────────────────────────────────────
  isLoading: boolean;
  isStatsLoading: boolean;
  isMutating: boolean;
  error: string | null;

  // ─── Фильтры ──────────────────────────────────────────────────────────────
  statusFilter: OrderStatus | null;
  setStatusFilter: (status: OrderStatus | null) => void;
  tagFilter: number | null;
  setTagFilter: (tagId: number | null) => void;
  clientFilter: number | null;
  setClientFilter: (clientId: number | null) => void;
  deadlineFilter: 'has_deadline' | 'overdue' | 'this_week' | null;
  setDeadlineFilter: (f: 'has_deadline' | 'overdue' | 'this_week' | null) => void;
  orderModeFilter: 'personal' | 'team' | null;
  setOrderModeFilter: (m: 'personal' | 'team' | null) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;

  // ─── CRUD ─────────────────────────────────────────────────────────────────
  fetchOrders: (opts?: { status?: OrderStatus | null; page?: number }) => Promise<void>;
  fetchStats: (period?: 'all' | 'week' | 'month' | 'year') => Promise<void>;
  createOrder: (data: CreateOrderData) => Promise<Order | null>;
  updateOrder: (id: number, data: UpdateOrderData) => Promise<Order | null>;
  deleteOrder: (id: number) => Promise<boolean>;
  cloneOrder: (id: number) => Promise<Order | null>;

  // ─── Смена статуса ────────────────────────────────────────────────────────
  completeOrder: (id: number) => Promise<Order | null>;
  cancelOrder: (id: number) => Promise<Order | null>;
  reopenOrder: (id: number) => Promise<Order | null>;
  updateStatus: (id: number, status: OrderStatus) => Promise<Order | null>;

  // ─── Массовые операции ────────────────────────────────────────────────────
  bulkUpdateStatus: (ids: number[], status: OrderStatus) => Promise<boolean>;

  // ─── Экспорт ──────────────────────────────────────────────────────────────
  exportCSV: (status?: OrderStatus) => Promise<boolean>;

  // ─── Утилиты ──────────────────────────────────────────────────────────────
  clearError: () => void;
  refresh: () => Promise<void>;
}

// ─── Хук ──────────────────────────────────────────────────────────────────────

export function useOrders(options: UseOrdersOptions = {}): UseOrdersReturn {
  const {
    autoFetch = true,
    initialStatus = null,
    pageSize = 50,
  } = options;

  // ─── Состояние ─────────────────────────────────────────────────────────────
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<OrderStatsResponse | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    limit: pageSize,
    offset: 0,
    total: 0,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();

  // Фильтры — источник истины в URL
  const statusFilter       = (searchParams.get('status') as OrderStatus | null) ?? initialStatus;
  const tagFilter          = searchParams.get('tag')      ? Number(searchParams.get('tag'))      : null;
  const clientFilter       = searchParams.get('client')   ? Number(searchParams.get('client'))   : null;
  const deadlineFilter     = (searchParams.get('deadline') as 'has_deadline' | 'overdue' | 'this_week' | null) ?? null;
  const orderModeFilter    = (searchParams.get('mode') as 'personal' | 'team' | null) ?? null;
  const currentPage        = Math.max(1, Number(searchParams.get('page') ?? '1'));

  const updateParam = useCallback(
    (key: string, value: string | null, resetPage = false) => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        if (value !== null) next.set(key, value); else next.delete(key);
        if (resetPage) next.delete('page');
        return next;
      }, { replace: true });
    },
    [setSearchParams],
  );

  // Защита от race conditions
  const abortRef = useRef<AbortController | null>(null);

  // ─── Fetch orders ───────────────────────────────────────────────────────────
  const fetchOrders = useCallback(
    async (opts?: { status?: OrderStatus | null; page?: number }) => {
      // Отменяем предыдущий запрос
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      const status = opts?.status !== undefined ? opts.status : statusFilter;
      const page = opts?.page ?? currentPage;

      setIsLoading(true);
      setError(null);

      try {
        const res = await ordersAPI.getAll({
          status: status ?? undefined,
          tag_id: tagFilter ?? undefined,
          client_id: clientFilter ?? undefined,
          deadline_filter: deadlineFilter ?? undefined,
          order_mode: orderModeFilter ?? undefined,
          limit: pageSize,
          page,
        });

        setOrders(res.data.data);
        setPagination(res.data.pagination);
      } catch (err: any) {
        if (err?.name !== 'CanceledError' && err?.name !== 'AbortError') {
          const msg = err?.response?.data?.message ?? err?.message ?? 'Ошибка загрузки заказов';
          setError(msg);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [statusFilter, tagFilter, clientFilter, deadlineFilter, orderModeFilter, currentPage, pageSize],
  );

  // ─── Fetch stats ────────────────────────────────────────────────────────────
  const fetchStats = useCallback(
    async (period: 'all' | 'week' | 'month' | 'year' = 'all') => {
      setIsStatsLoading(true);
      try {
        const res = await ordersAPI.getStats(period, orderModeFilter);
        setStats(res.data.data);
      } catch (err: any) {
        const msg = err?.response?.data?.message ?? err?.message ?? 'Ошибка загрузки статистики';
        setError(msg);
      } finally {
        setIsStatsLoading(false);
      }
    },
    [orderModeFilter],
  );

  // ─── Оптимистичное обновление списка ───────────────────────────────────────
  const replaceOrder = useCallback((updated: Order) => {
    setOrders(prev => prev.map(o => (o.id === updated.id ? updated : o)));
  }, []);

  const removeOrder = useCallback((id: number) => {
    setOrders(prev => prev.filter(o => o.id !== id));
    setPagination(prev => ({ ...prev, total: Math.max(0, prev.total - 1) }));
  }, []);

  const prependOrder = useCallback((order: Order) => {
    setOrders(prev => [order, ...prev]);
    setPagination(prev => ({ ...prev, total: prev.total + 1 }));
  }, []);

  // ─── Create ─────────────────────────────────────────────────────────────────
  const createOrder = useCallback(
    async (data: CreateOrderData): Promise<Order | null> => {
      setIsMutating(true);
      setError(null);
      try {
        const res = await ordersAPI.create(data);
        const created = res.data.data;
        prependOrder(created);
        // Обновляем статистику
        fetchStats();
        return created;
      } catch (err: any) {
        const msg = err?.response?.data?.message ?? err?.message ?? 'Ошибка создания заказа';
        setError(msg);
        return null;
      } finally {
        setIsMutating(false);
      }
    },
    [prependOrder, fetchStats],
  );

  // ─── Update ─────────────────────────────────────────────────────────────────
  const updateOrder = useCallback(
    async (id: number, data: UpdateOrderData): Promise<Order | null> => {
      setIsMutating(true);
      setError(null);
      try {
        const res = await ordersAPI.update(id, data);
        const updated = res.data.data;
        replaceOrder(updated);
        return updated;
      } catch (err: any) {
        const msg = err?.response?.data?.message ?? err?.message ?? 'Ошибка обновления заказа';
        setError(msg);
        return null;
      } finally {
        setIsMutating(false);
      }
    },
    [replaceOrder],
  );

  // ─── Delete ─────────────────────────────────────────────────────────────────
  const deleteOrder = useCallback(
    async (id: number): Promise<boolean> => {
      setIsMutating(true);
      setError(null);
      try {
        await ordersAPI.delete(id);
        removeOrder(id);
        fetchStats();
        return true;
      } catch (err: any) {
        const msg = err?.response?.data?.message ?? err?.message ?? 'Ошибка удаления заказа';
        setError(msg);
        return false;
      } finally {
        setIsMutating(false);
      }
    },
    [removeOrder, fetchStats],
  );

  // ─── Clone ──────────────────────────────────────────────────────────────────
  const cloneOrder = useCallback(
    async (id: number): Promise<Order | null> => {
      setIsMutating(true);
      setError(null);
      try {
        const res = await ordersAPI.clone(id);
        const cloned = res.data.data;
        // Обновляем список и статистику в фоне — не блокируем UI
        fetchOrders();
        fetchStats();
        return cloned;
      } catch (err: any) {
        const msg = err?.response?.data?.message ?? err?.message ?? 'Ошибка клонирования заказа';
        setError(msg);
        return null;
      } finally {
        setIsMutating(false);
      }
    },
    [fetchOrders, fetchStats],
  );

  // ─── Status helpers ─────────────────────────────────────────────────────────
  const updateStatus = useCallback(
    async (id: number, status: OrderStatus): Promise<Order | null> => {
      setIsMutating(true);
      setError(null);
      try {
        const res = await ordersAPI.updateStatus(id, status);
        const updated = res.data.data;
        // Если фильтр активен и статус не совпадает — убираем из списка
        if (statusFilter && updated.status !== statusFilter) {
          removeOrder(id);
        } else {
          replaceOrder(updated);
        }
        fetchStats();
        return updated;
      } catch (err: any) {
        const msg = err?.response?.data?.message ?? err?.message ?? 'Ошибка смены статуса';
        setError(msg);
        return null;
      } finally {
        setIsMutating(false);
      }
    },
    [statusFilter, replaceOrder, removeOrder, fetchStats],
  );

  const completeOrder = useCallback(
    (id: number) => updateStatus(id, 'completed'),
    [updateStatus],
  );

  const cancelOrder = useCallback(
    (id: number) => updateStatus(id, 'cancelled'),
    [updateStatus],
  );

  const reopenOrder = useCallback(
    (id: number) => updateStatus(id, 'in_progress'),
    [updateStatus],
  );

  // ─── Bulk status ────────────────────────────────────────────────────────────
  const bulkUpdateStatus = useCallback(
    async (ids: number[], status: OrderStatus): Promise<boolean> => {
      setIsMutating(true);
      setError(null);
      try {
        await ordersAPI.bulkUpdateStatus(ids, status);
        // Перезагружаем список — bulk изменяет много записей
        await fetchOrders();
        await fetchStats();
        return true;
      } catch (err: any) {
        const msg = err?.response?.data?.message ?? err?.message ?? 'Ошибка массового обновления';
        setError(msg);
        return false;
      } finally {
        setIsMutating(false);
      }
    },
    [fetchOrders, fetchStats],
  );

  // ─── Export CSV ─────────────────────────────────────────────────────────────
  const exportCSV = useCallback(
    async (status?: OrderStatus): Promise<boolean> => {
      const result = await downloadOrdersCSV(status);
      if (!result.success) {
        setError('Ошибка экспорта CSV');
      }
      return result.success;
    },
    [],
  );

  // ─── Фильтры: пишем в URL, сбрасываем страницу ─────────────────────────────
  const handleSetStatusFilter      = useCallback((v: OrderStatus | null) => updateParam('status', v, true), [updateParam]);
  const handleSetTagFilter         = useCallback((v: number | null) => updateParam('tag', v !== null ? String(v) : null, true), [updateParam]);
  const handleSetClientFilter      = useCallback((v: number | null) => updateParam('client', v !== null ? String(v) : null, true), [updateParam]);
  const handleSetDeadlineFilter    = useCallback((v: 'has_deadline' | 'overdue' | 'this_week' | null) => updateParam('deadline', v, true), [updateParam]);
  const handleSetOrderModeFilter   = useCallback((v: 'personal' | 'team' | null) => updateParam('mode', v, true), [updateParam]);
  const handleSetCurrentPage       = useCallback((page: number) => updateParam('page', page > 1 ? String(page) : null), [updateParam]);

  // ─── Refresh ────────────────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    await Promise.all([fetchOrders(), fetchStats()]);
  }, [fetchOrders, fetchStats]);

  // ─── Auto-fetch ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (autoFetch) {
      fetchOrders();
    }
  }, [statusFilter, tagFilter, clientFilter, deadlineFilter, orderModeFilter, currentPage]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (autoFetch) {
      fetchStats();
    }
  }, [orderModeFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Cleanup ────────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return {
    orders,
    stats,
    pagination,
    isLoading,
    isStatsLoading,
    isMutating,
    error,
    statusFilter,
    setStatusFilter: handleSetStatusFilter,
    tagFilter,
    setTagFilter: handleSetTagFilter,
    clientFilter,
    setClientFilter: handleSetClientFilter,
    deadlineFilter,
    setDeadlineFilter: handleSetDeadlineFilter,
    orderModeFilter,
    setOrderModeFilter: handleSetOrderModeFilter,
    currentPage,
    setCurrentPage: handleSetCurrentPage,
    fetchOrders,
    fetchStats,
    createOrder,
    updateOrder,
    deleteOrder,
    cloneOrder,
    completeOrder,
    cancelOrder,
    reopenOrder,
    updateStatus,
    bulkUpdateStatus,
    exportCSV,
    clearError: () => setError(null),
    refresh,
  };
}