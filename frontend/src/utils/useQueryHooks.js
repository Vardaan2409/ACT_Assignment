/**
 * useQueryHooks.js
 * Centralized TanStack Query hooks for Urban Homely platform.
 *
 * Every section of the app (Dashboard, Analytics, Properties,
 * Billing, Notifications, Activity Logs) subscribes to these hooks.
 * When the sync client invalidates a query key, every subscriber
 * automatically refetches in the background — no manual refresh ever needed.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import API from './api';

// ─── Auth header helper ───────────────────────────────────────────────────────
const authConfig = (token) => ({
  headers: { Authorization: `Bearer ${token}` }
});

// ─── PROPERTIES ──────────────────────────────────────────────────────────────

export const useProperties = (searchParams = {}) =>
  useQuery({
    queryKey: ['properties', searchParams],
    queryFn: async () => {
      const { data } = await API.get('/api/properties/search', { params: searchParams });
      return data;
    },
    staleTime: 30 * 1000,
  });

export const useAllProperties = () =>
  useQuery({
    queryKey: ['properties'],
    queryFn: async () => {
      const { data } = await API.get('/api/properties');
      return data;
    },
    staleTime: 30 * 1000,
  });

export const useMyBoosts = (token) =>
  useQuery({
    queryKey: ['boosts', token],
    queryFn: async () => {
      const { data } = await API.get('/api/properties/my-boosts', authConfig(token));
      return data;
    },
    enabled: !!token,
    staleTime: 30 * 1000,
  });

// Mutation: create property
export const useCreateProperty = (token) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (propertyData) => {
      const { data } = await API.post('/api/properties', propertyData, authConfig(token));
      return data;
    },
    // Optimistic update — add placeholder while request completes
    onMutate: async (newProperty) => {
      await qc.cancelQueries({ queryKey: ['properties'] });
      const prev = qc.getQueryData(['properties']);
      qc.setQueryData(['properties'], (old = []) => [
        { ...newProperty, _id: 'temp-' + Date.now(), rankingScore: 0 },
        ...old
      ]);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['properties'], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['properties'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

// Mutation: delete property
export const useDeleteProperty = (token) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (propertyId) => {
      await API.delete(`/api/properties/${propertyId}`, authConfig(token));
      return propertyId;
    },
    onMutate: async (propertyId) => {
      await qc.cancelQueries({ queryKey: ['properties'] });
      const prev = qc.getQueryData(['properties']);
      qc.setQueryData(['properties'], (old = []) =>
        old.filter(p => p._id !== propertyId)
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['properties'], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['properties'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

// ─── DASHBOARD ───────────────────────────────────────────────────────────────

export const useDashboard = (token) =>
  useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data } = await API.get('/api/dashboard', authConfig(token));
      return data;
    },
    enabled: !!token,
    staleTime: 20 * 1000,
    refetchInterval: 60 * 1000, // Background sync every 60s as safety net
  });

// Mutation: create lead
export const useCreateLead = (token) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (leadData) => {
      const { data } = await API.post('/api/dashboard/leads', leadData, authConfig(token));
      return data;
    },
    onMutate: async (newLead) => {
      await qc.cancelQueries({ queryKey: ['dashboard'] });
      const prev = qc.getQueryData(['dashboard']);
      qc.setQueryData(['dashboard'], (old) => old ? {
        ...old,
        leads: [{ ...newLead, _id: 'temp-' + Date.now(), status: 'New' }, ...(old.leads || [])]
      } : old);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['dashboard'], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['activityLogs'] });
    },
  });
};

// Mutation: create task / schedule visit
export const useCreateTask = (token) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (taskData) => {
      const { data } = await API.post('/api/dashboard/tasks', taskData, authConfig(token));
      return data;
    },
    onMutate: async (newTask) => {
      await qc.cancelQueries({ queryKey: ['dashboard'] });
      const prev = qc.getQueryData(['dashboard']);
      qc.setQueryData(['dashboard'], (old) => old ? {
        ...old,
        tasks: [{ ...newTask, _id: 'temp-' + Date.now(), status: 'Pending' }, ...(old.tasks || [])]
      } : old);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['dashboard'], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['activityLogs'] });
    },
  });
};

// ─── BILLING / SUBSCRIPTION ───────────────────────────────────────────────────

export const useBilling = (token) =>
  useQuery({
    queryKey: ['billing'],
    queryFn: async () => {
      const { data } = await API.get('/api/subscription/status', authConfig(token));
      return data;
    },
    enabled: !!token,
    staleTime: 30 * 1000,
  });

export const useAnalytics = (token) =>
  useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      const { data } = await API.get('/api/subscription/analytics', authConfig(token));
      return data;
    },
    enabled: !!token,
    staleTime: 60 * 1000,
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 min
  });

// ─── NOTIFICATIONS ───────────────────────────────────────────────────────────

export const useNotifications = (token) =>
  useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await API.get('/api/notifications', authConfig(token));
      return data;
    },
    enabled: !!token,
    staleTime: 0, // Always refetch notifications
    refetchInterval: 30 * 1000, // Poll every 30s as fallback
  });

export const useMarkAllRead = (token) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await API.post('/api/notifications/read-all', {}, authConfig(token));
      return data;
    },
    // Optimistic: mark all as read immediately in UI
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['notifications'] });
      const prev = qc.getQueryData(['notifications']);
      qc.setQueryData(['notifications'], (old = []) =>
        old.map(n => ({ ...n, isRead: true }))
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['notifications'], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

// ─── ACTIVITY LOGS ────────────────────────────────────────────────────────────

export const useActivityLogs = (token) =>
  useQuery({
    queryKey: ['activityLogs'],
    queryFn: async () => {
      const { data } = await API.get('/api/notifications/activity-logs', authConfig(token));
      return data;
    },
    enabled: !!token,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
