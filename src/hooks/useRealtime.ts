"use client";

import { useEffect, useMemo, useRef } from "react";
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";

type RealtimePayload = RealtimePostgresChangesPayload<Record<string, unknown>>;
type RealtimePayloadListener = (payload: RealtimePayload) => void | Promise<void>;
type RealtimeSubscribeStatus =
  | "SUBSCRIBED"
  | "TIMED_OUT"
  | "CLOSED"
  | "CHANNEL_ERROR";

type RealtimeTableEntry = {
  channel: RealtimeChannel | null;
  listeners: Set<RealtimePayloadListener>;
  retryAttempt: number;
  retryTimer: ReturnType<typeof setTimeout> | null;
};

const tableEntries = new Map<string, RealtimeTableEntry>();
const intentionalCloseChannels = new WeakSet<RealtimeChannel>();
const RETRY_DELAYS = [500, 1000, 2000, 5000, 10000] as const;

function getRetryDelay(attempt: number) {
  const baseDelay = RETRY_DELAYS[Math.min(attempt, RETRY_DELAYS.length - 1)] ?? 10000;
  const jitter = Math.floor(Math.random() * 250);
  return Math.min(baseDelay + jitter, 10000);
}

function createEntry(): RealtimeTableEntry {
  return {
    channel: null,
    listeners: new Set(),
    retryAttempt: 0,
    retryTimer: null,
  };
}

function getOrCreateEntry(table: string) {
  let entry = tableEntries.get(table);
  if (!entry) {
    entry = createEntry();
    tableEntries.set(table, entry);
  }
  return entry;
}

function clearRetryTimer(entry: RealtimeTableEntry) {
  if (entry.retryTimer) {
    clearTimeout(entry.retryTimer);
    entry.retryTimer = null;
  }
}

function subscribeToTable(table: string) {
  const supabase = getSupabase();
  const entry = tableEntries.get(table);
  if (!supabase || !entry || entry.channel || entry.listeners.size === 0) return;

  const channelName = `realtime-${table}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
  const channel = supabase.channel(channelName);
  entry.channel = channel;

  channel.on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table,
    },
    (payload: RealtimePayload) => {
      tableEntries.get(table)?.listeners.forEach((cb) => cb(payload));
    },
  );

  channel.subscribe((status: `${RealtimeSubscribeStatus}`, err?: Error) => {
    if (status === "CLOSED" && intentionalCloseChannels.has(channel)) {
      intentionalCloseChannels.delete(channel);
      return;
    }

    if (status === "SUBSCRIBED") {
      entry.retryAttempt = 0;
      clearRetryTimer(entry);
      logger.log(`[Realtime] realtime-${table}: SUBSCRIBED`);
      return;
    }

    if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
      handleChannelFailure(table, channel, status, err);
    }
  });
}

function scheduleResubscribe(table: string) {
  const entry = tableEntries.get(table);
  if (!entry || entry.listeners.size === 0 || entry.retryTimer) return;

  const delay = getRetryDelay(entry.retryAttempt);
  logger.log(`[Realtime] realtime-${table}: retrying in ${delay}ms`);

  entry.retryTimer = setTimeout(() => {
    const currentEntry = tableEntries.get(table);
    if (!currentEntry || currentEntry.listeners.size === 0) return;
    currentEntry.retryTimer = null;
    currentEntry.retryAttempt += 1;
    subscribeToTable(table);
  }, delay);
}

function handleChannelFailure(
  table: string,
  channel: RealtimeChannel,
  status: Exclude<RealtimeSubscribeStatus, "SUBSCRIBED">,
  err?: Error,
) {
  const supabase = getSupabase();
  const entry = tableEntries.get(table);
  if (!entry || entry.channel !== channel) return;

  entry.channel = null;
  console.warn(`[Realtime] realtime-${table}: ${status}`, err ? err.message : "");

  if (supabase) {
    intentionalCloseChannels.add(channel);
    void supabase.removeChannel(channel).catch((removeError) => {
      intentionalCloseChannels.delete(channel);
      console.error(`[Realtime] realtime-${table}: failed to remove stale channel`, removeError);
    });
  }

  scheduleResubscribe(table);
}

function removeTableListener(table: string, listener: RealtimePayloadListener) {
  const supabase = getSupabase();
  const entry = tableEntries.get(table);
  if (!entry) return;

  entry.listeners.delete(listener);
  if (entry.listeners.size > 0) return;

  clearRetryTimer(entry);
  if (entry.channel && supabase) {
    const channel = entry.channel;
    intentionalCloseChannels.add(channel);
    void supabase.removeChannel(channel).catch((removeError) => {
      intentionalCloseChannels.delete(channel);
      console.error(`[Realtime] realtime-${table}: failed to remove channel`, removeError);
    });
  }

  tableEntries.delete(table);
}

export function useRealtime(
  tables: string[],
  callback: (payload: RealtimePayload) => void,
) {
  const callbackRef = useRef(callback);
  const rawTablesKey = tables.join("\0");
  const normalizedTables = useMemo(
    () => Array.from(new Set(tables.filter(Boolean))).sort(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rawTablesKey],
  );
  const tablesKey = normalizedTables.join("\0");

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const listener = (payload: RealtimePayload) => {
      Promise.resolve(callbackRef.current(payload)).catch((error) => {
        console.warn(
          "[Realtime] listener callback failed",
          error instanceof Error ? error.message : error,
        );
      });
    };

    normalizedTables.forEach((table) => {
      const entry = getOrCreateEntry(table);
      entry.listeners.add(listener);
      subscribeToTable(table);
    });

    return () => {
      normalizedTables.forEach((table) => {
        removeTableListener(table, listener);
      });
    };
  }, [tablesKey, normalizedTables]);
}
