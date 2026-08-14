import { isSupabaseConfigured } from '../lib/supabase';
import type { Backend } from './backend';
import { localBackend } from './local';
import { supabaseBackend } from './supabaseBackend';

// Ponto único de troca de backend: sem variáveis de ambiente → demo local;
// com variáveis → Supabase real.
export const backend: Backend = isSupabaseConfigured ? supabaseBackend : localBackend;
export const isDemo = backend.mode === 'demo';
