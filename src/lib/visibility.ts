// Regras de visibilidade/permissão do perfil e de mensagens (§12–14, §19, §31).
// Validação acontece no backend (local e Supabase) — nunca só no frontend.
import type { PublicProfile } from './types';

export type FieldVis = 'public' | 'followers' | 'mutual' | 'private';
export type ProfileVis = 'all' | 'registered' | 'followers' | 'none';
export type MessageVis = 'all' | 'following' | 'followers' | 'mutual' | 'none';

export interface PrivacySettings {
  profile: ProfileVis;
  messages: MessageVis;
  fields: Record<string, FieldVis>;
  [k: string]: any;
}

export interface Viewer {
  isSelf: boolean;
  viewerFollowsTarget: boolean; // quem vê segue o dono
  targetFollowsViewer: boolean; // o dono segue quem vê
}

export const DEFAULT_FIELDS: Record<string, FieldVis> = {
  name: 'public', photo: 'public', cover: 'public', bio: 'public',
  location: 'private', website: 'public', about: 'public',
  books: 'followers', authors: 'public', music: 'public', interests: 'public',
  activity: 'followers', discussions: 'public', followers: 'public', following: 'public',
};

export function defaultPrivacy(): PrivacySettings {
  return { profile: 'all', messages: 'all', fields: { ...DEFAULT_FIELDS } };
}

export function normalizePrivacy(p: any): PrivacySettings {
  const d = defaultPrivacy();
  if (!p || typeof p !== 'object') return d;
  return {
    profile: (['all', 'registered', 'followers', 'none'].includes(p.profile) ? p.profile : d.profile) as ProfileVis,
    messages: (['all', 'following', 'followers', 'mutual', 'none'].includes(p.messages) ? p.messages : d.messages) as MessageVis,
    fields: { ...d.fields, ...(p.fields || {}) },
  };
}

export function profileAccessible(priv: PrivacySettings, v: Viewer): boolean {
  if (v.isSelf) return true;
  switch (priv.profile) {
    case 'all': case 'registered': return true;
    case 'followers': return v.viewerFollowsTarget;
    case 'none': return false;
    default: return true;
  }
}

export function fieldVisible(priv: PrivacySettings, field: string, v: Viewer): boolean {
  if (v.isSelf) return true;
  const f = priv.fields?.[field] ?? DEFAULT_FIELDS[field] ?? 'public';
  switch (f) {
    case 'public': return true;
    case 'followers': return v.viewerFollowsTarget;
    case 'mutual': return v.viewerFollowsTarget && v.targetFollowsViewer;
    case 'private': return false;
    default: return true;
  }
}

// aplica a visibilidade a um perfil público completo
export function filterProfile(full: PublicProfile, priv: PrivacySettings, v: Viewer): PublicProfile {
  const out = { ...full };
  if (!profileAccessible(priv, v)) {
    // perfil restrito: só identidade mínima (nome/foto) ou nada além do próprio
    return { ...out, about: '', location: '', website: '', genres: [], authors: [], books: [], music: [], interests: [], followers: 0, following: 0, discussionsCount: 0 };
  }
  const hide = (field: string) => !fieldVisible(priv, field, v);
  if (hide('about')) out.about = '';
  if (hide('location')) out.location = '';
  if (hide('website')) out.website = '';
  if (hide('bio')) out.bio = '';
  if (hide('books')) out.books = [];
  if (hide('authors')) out.authors = [];
  if (hide('music')) out.music = [];
  if (hide('interests')) out.interests = [];
  if (hide('genres')) out.genres = [];
  if (hide('followers')) out.followers = 0;
  if (hide('following')) out.following = 0;
  if (hide('discussions')) out.discussionsCount = 0;
  return out;
}

// quem pode enviar mensagem para o dono (regra do dono + bloqueio)
export function canMessage(priv: PrivacySettings, v: Viewer, blockedByTarget: boolean): boolean {
  if (v.isSelf) return true;
  if (blockedByTarget) return false; // dono bloqueou o remetente
  switch (priv.messages) {
    case 'all': return true;
    case 'following': return v.targetFollowsViewer; // dono segue o remetente
    case 'followers': return v.viewerFollowsTarget; // remetente segue o dono
    case 'mutual': return v.viewerFollowsTarget && v.targetFollowsViewer;
    case 'none': return false;
    default: return true;
  }
}
