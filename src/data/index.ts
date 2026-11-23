import { demoBackend } from './demoBackend';
import { supabaseBackend } from './supabaseBackend';
import type { Backend } from './types';

let current: Backend = supabaseBackend;

/** The active backend (Supabase, or on-device demo). Set by AuthProvider. */
export function db(): Backend {
  return current;
}

export function setBackendMode(demo: boolean) {
  current = demo ? demoBackend : supabaseBackend;
}

export * from './types';
