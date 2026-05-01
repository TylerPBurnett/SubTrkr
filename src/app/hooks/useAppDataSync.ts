import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { toast } from 'sonner';
import type { Category, ItemWithCategory } from '@/types';
import {
  advancePastDueItems,
  getCategories,
  getItems,
  handleExpiredTrials,
  resumePausedItems,
} from '@/services/database';
import {
  checkAndNotifyExpiringTrials,
  checkAndNotifyUpcomingRenewals,
} from '@/services/notifications';
import { seedDefaultCategoriesIfNeeded } from '@/services/seedCategories';
import { supabase } from '@/services/supabase';
import type { ReloadTarget } from '../types';

export function useAppDataSync(session: Session | null) {
  const userId = session?.user?.id;
  const [items, setItems] = useState<ItemWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const itemsRef = useRef<ItemWithCategory[]>([]);
  const seededForUserId = useRef<string | null>(null);
  const reloadTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingReloadTargetsRef = useRef<Record<ReloadTarget, boolean>>({
    items: false,
    categories: false,
  });

  const reportBackgroundFailures = useCallback(
    (results: PromiseSettledResult<unknown>[], label: string) => {
      const failures = results.filter(
        (result): result is PromiseRejectedResult => result.status === 'rejected',
      );

      if (failures.length === 0) {
        return;
      }

      console.error(`Some ${label} tasks failed:`, failures);
      toast.warning(
        `${failures.length} ${label} task(s) failed. Data may be incomplete.`,
      );
    },
    [],
  );

  const loadItemsData = useCallback(async (): Promise<ItemWithCategory[]> => {
    const itemsData = await getItems();
    itemsRef.current = itemsData;
    setItems(itemsData);
    return itemsData;
  }, []);

  const loadCategoriesData = useCallback(async (): Promise<Category[]> => {
    const categoriesData = await getCategories();
    setCategories(categoriesData);
    return categoriesData;
  }, []);

  const loadData = useCallback(async (): Promise<ItemWithCategory[]> => {
    const [itemsData] = await Promise.all([loadItemsData(), loadCategoriesData()]);
    return itemsData;
  }, [loadCategoriesData, loadItemsData]);

  const runMaintenanceTasks = useCallback(async (): Promise<number> => {
    const results = await Promise.allSettled([
      advancePastDueItems(),
      resumePausedItems(),
      handleExpiredTrials(),
    ]);

    reportBackgroundFailures(results, 'maintenance');

    return results.reduce((count, result) => {
      if (result.status === 'fulfilled') {
        return count + result.value;
      }

      return count;
    }, 0);
  }, [reportBackgroundFailures]);

  const runNotificationChecks = useCallback(
    async (itemsData: ItemWithCategory[]): Promise<void> => {
      const results = await Promise.allSettled([
        checkAndNotifyUpcomingRenewals(itemsData),
        checkAndNotifyExpiringTrials(itemsData),
      ]);

      reportBackgroundFailures(results, 'notification');
    },
    [reportBackgroundFailures],
  );

  const clearReloadTimer = useCallback(() => {
    if (reloadTimerRef.current) {
      clearTimeout(reloadTimerRef.current);
      reloadTimerRef.current = null;
    }
  }, []);

  const reloadItemsAndRunNotificationChecks = useCallback(
    async (): Promise<ItemWithCategory[]> => {
      const latestItems = await loadItemsData();
      await runNotificationChecks(latestItems);
      return latestItems;
    },
    [loadItemsData, runNotificationChecks],
  );

  const scheduleReload = useCallback(
    (target: ReloadTarget) => {
      pendingReloadTargetsRef.current[target] = true;

      if (reloadTimerRef.current) {
        clearTimeout(reloadTimerRef.current);
      }

      reloadTimerRef.current = setTimeout(() => {
        const pendingTargets = pendingReloadTargetsRef.current;
        pendingReloadTargetsRef.current = { items: false, categories: false };
        reloadTimerRef.current = null;

        void (async () => {
          try {
            await Promise.all([
              pendingTargets.items
                ? reloadItemsAndRunNotificationChecks()
                : Promise.resolve(null),
              pendingTargets.categories
                ? loadCategoriesData()
                : Promise.resolve(null),
            ]);
          } catch (error) {
            console.error('Failed to refresh live updates:', error);
            toast.error('Failed to refresh live updates. Please try again.');
          }
        })();
      }, 100);
    },
    [loadCategoriesData, reloadItemsAndRunNotificationChecks],
  );

  const runStartupBackgroundTasks = useCallback(
    (itemsSnapshot: ItemWithCategory[]) => {
      window.setTimeout(() => {
        void (async () => {
          try {
            const maintenanceChanges = await runMaintenanceTasks();
            const latestItems =
              maintenanceChanges > 0 ? await loadItemsData() : itemsSnapshot;

            await runNotificationChecks(latestItems);
          } catch (error) {
            console.error('Startup background tasks failed:', error);
            toast.warning(
              'Background startup tasks failed. Data may be incomplete.',
            );
          }
        })();
      }, 0);
    },
    [loadItemsData, runMaintenanceTasks, runNotificationChecks],
  );

  useEffect(() => {
    if (!userId) {
      setItems([]);
      setCategories([]);
      setIsLoading(true);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    void (async () => {
      try {
        const itemsData = await loadData();
        if (!cancelled) {
          runStartupBackgroundTasks(itemsData);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load data:', error);
          toast.error('Failed to load data. Please check your connection.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadData, runStartupBackgroundTasks, userId]);

  useEffect(() => {
    if (!userId) {
      seededForUserId.current = null;
      return;
    }

    if (seededForUserId.current === userId) {
      return;
    }

    seededForUserId.current = userId;

    void (async () => {
      try {
        await seedDefaultCategoriesIfNeeded();
        const categoriesData = await getCategories();
        setCategories(categoriesData);
      } catch (error) {
        console.error('Failed to seed categories:', error);
      }
    })();
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const channel = supabase
      .channel('db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'items', filter: `user_id=eq.${userId}` },
        () => scheduleReload('items'),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories', filter: `user_id=eq.${userId}` },
        () => scheduleReload('categories'),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      pendingReloadTargetsRef.current = { items: false, categories: false };
      clearReloadTimer();
    };
  }, [clearReloadTimer, scheduleReload, userId]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const runDailyJobs = async () => {
      try {
        const maintenanceChanges = await runMaintenanceTasks();
        const latestItems =
          maintenanceChanges > 0
            ? await loadItemsData()
            : itemsRef.current;

        if (maintenanceChanges > 0) {
          console.log(
            `Daily jobs applied ${maintenanceChanges} maintenance change(s)`,
          );
        }

        await runNotificationChecks(latestItems);
      } catch (error) {
        console.error('Daily jobs failed:', error);
      }
    };

    const interval = setInterval(runDailyJobs, 86400000);
    return () => clearInterval(interval);
  }, [loadItemsData, runMaintenanceTasks, runNotificationChecks, userId]);

  return {
    items,
    categories,
    isLoading,
    reloadItems: loadItemsData,
    handleCategoriesChange: async () => {
      try {
        await loadData();
      } catch (error) {
        console.error('Failed to refresh categories:', error);
        toast.error('Failed to refresh categories. Please try again.');
      }
    },
  };
}
