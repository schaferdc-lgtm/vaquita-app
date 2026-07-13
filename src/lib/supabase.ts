import { createClient } from '@supabase/supabase-js';

/**
 * Sanitiza la URL de Supabase para evitar errores comunes como incluir /rest/v1 al final.
 */
export const sanitizeUrl = (url: string): string => {
  let clean = (url || '').trim();
  // Remover barras diagonales finales
  clean = clean.replace(/\/+$/, '');
  // Remover /rest/v1 si está presente al final
  if (clean.endsWith('/rest/v1')) {
    clean = clean.substring(0, clean.length - 8);
  }
  // Remover barras diagonales finales nuevamente tras limpiar el path
  return clean.replace(/\/+$/, '');
};

const getInitialCredentials = () => {
  // Intentar leer primero de localStorage para configuraciones en caliente desde la UI
  try {
    const localConfig = localStorage.getItem('collaborative_crowdfund_supabase_config');
    if (localConfig) {
      const parsed = JSON.parse(localConfig);
      if (parsed.url && parsed.anonKey && parsed.isConnected) {
        return {
          url: parsed.url,
          anonKey: parsed.anonKey,
        };
      }
    }
  } catch (e) {
    console.error('Error reading Supabase config from localStorage:', e);
  }

  // Fallback a variables de entorno de Vite
  return {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  };
};

const initialCredentials = getInitialCredentials();
const initialUrl = sanitizeUrl(initialCredentials.url);
const initialKey = initialCredentials.anonKey.trim();

// Instancia mutable exportada para permitir actualizaciones dinámicas sin recargar la página entera
export let supabase = (initialUrl && initialKey)
  ? createClient(initialUrl, initialKey)
  : null;

/**
 * Permite actualizar la instancia de Supabase de manera dinámica desde la UI
 */
export const updateSupabaseClient = (url: string, key: string) => {
  const cleanUrl = sanitizeUrl(url);
  const cleanKey = key.trim();
  if (cleanUrl && cleanKey) {
    supabase = createClient(cleanUrl, cleanKey);
  } else {
    supabase = null;
  }
};

/**
 * Helper to check if Supabase is properly configured
 */
export const isSupabaseConfigured = (): boolean => {
  return !!supabase;
};
