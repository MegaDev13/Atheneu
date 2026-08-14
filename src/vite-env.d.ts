/// <reference types="vite/client" />

declare module 'epubjs' {
  const ePub: any;
  export default ePub;
}

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_AI_ENDPOINT?: string;
}
