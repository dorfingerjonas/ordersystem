// Supabase Edge Function: user management for admins.
//
// The Auth admin API needs the service_role key, which must never reach the
// browser. This function holds it, checks that the caller is an admin and
// then performs the requested action.
//
// Deploy:  supabase functions deploy admin-users
// (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.)

import { createClient, type User } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

/** effectively forever – GoTrue has no "permanent" ban */
const BAN_FOREVER = '876000h';
const MIN_PASSWORD_LENGTH = 6;

/**
 * Root account: always admin, hidden from the list and cannot be changed by
 * other admins (only its own password, when logged in as itself).
 */
const PROTECTED_EMAIL = 'admin@ordersystem.at';

function isProtected(user: User): boolean {
  return user.email?.toLowerCase() === PROTECTED_EMAIL;
}

type Action =
  | { action: 'list' }
  | { action: 'create'; email: string; password: string; admin?: boolean }
  | { action: 'setRole'; id: string; admin: boolean }
  | { action: 'setPassword'; id: string; password: string }
  | { action: 'ban'; id: string }
  | { action: 'unban'; id: string }
  | { action: 'delete'; id: string };

class HttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

function isAdmin(user: User): boolean {
  return user.app_metadata?.['role'] === 'admin';
}

function isBanned(user: User): boolean {
  const until = (user as User & { banned_until?: string | null }).banned_until;
  return !!until && new Date(until).getTime() > Date.now();
}

function toDto(user: User) {
  return {
    id: user.id,
    email: user.email ?? '',
    admin: isAdmin(user),
    banned: isBanned(user),
    createdAt: user.created_at,
    lastSignInAt: user.last_sign_in_at ?? null
  };
}

function requirePassword(password: unknown): string {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    throw new HttpError(400, `Das Passwort muss mindestens ${ MIN_PASSWORD_LENGTH } Zeichen lang sein.`);
  }
  return password;
}

function requireId(id: unknown): string {
  if (typeof id !== 'string' || !id) {
    throw new HttpError(400, 'Benutzer-ID fehlt.');
  }
  return id;
}

/** an admin may never demote, ban or delete themselves */
function requireOther(caller: User, id: string): void {
  if (caller.id === id) {
    throw new HttpError(400, 'Das eigene Konto kann hier nicht geändert werden.');
  }
}

/** loads the target and rejects changes to the protected root account by anyone else */
async function requireChangeable(caller: User, id: string): Promise<User> {
  const { data, error } = await admin.auth.admin.getUserById(id);
  if (error || !data.user) throw new HttpError(404, 'Benutzer wurde nicht gefunden.');

  if (isProtected(data.user) && data.user.id !== caller.id) {
    throw new HttpError(403, 'Dieses Konto kann nicht geändert werden.');
  }

  return data.user;
}

async function authenticate(req: Request): Promise<User> {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw new HttpError(401, 'Nicht angemeldet.');

  // getUser reads the current user from the DB, so a revoked admin role or a
  // ban takes effect immediately here even while the caller's JWT is still valid
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, 'Sitzung abgelaufen. Bitte neu anmelden.');
  if (!isAdmin(data.user) || isBanned(data.user)) throw new HttpError(403, 'Keine Berechtigung für diese Aktion.');

  return data.user;
}

async function listAll(): Promise<User[]> {
  const users: User[] = [];

  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1000) return users;
  }
}

async function handle(caller: User, body: Action): Promise<unknown> {
  switch (body.action) {
    case 'list': {
      const users = await listAll();
      return users.filter(u => !isProtected(u)).map(toDto).sort((a, b) => a.email.localeCompare(b.email));
    }

    case 'create': {
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Ungültige E-Mail-Adresse.');

      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: requirePassword(body.password),
        email_confirm: true,
        app_metadata: body.admin || email === PROTECTED_EMAIL ? { role: 'admin' } : {}
      });
      if (error) throw error;
      return toDto(data.user);
    }

    case 'setRole': {
      const id = requireId(body.id);
      requireOther(caller, id);
      await requireChangeable(caller, id);

      // GoTrue merges app_metadata (other keys stay); a null value removes the key
      const { data, error } = await admin.auth.admin.updateUserById(id, {
        app_metadata: { role: body.admin ? 'admin' : null }
      });
      if (error) throw error;
      return toDto(data.user);
    }

    case 'setPassword': {
      const id = requireId(body.id);
      await requireChangeable(caller, id);
      const { data, error } = await admin.auth.admin.updateUserById(id, { password: requirePassword(body.password) });
      if (error) throw error;
      return toDto(data.user);
    }

    case 'ban':
    case 'unban': {
      const id = requireId(body.id);
      requireOther(caller, id);
      await requireChangeable(caller, id);

      const { data, error } = await admin.auth.admin.updateUserById(id, {
        ban_duration: body.action === 'ban' ? BAN_FOREVER : 'none'
      });
      if (error) throw error;
      return toDto(data.user);
    }

    case 'delete': {
      const id = requireId(body.id);
      requireOther(caller, id);
      await requireChangeable(caller, id);

      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) throw error;
      return { id };
    }

    default:
      throw new HttpError(400, 'Unbekannte Aktion.');
  }
}

/** translate common GoTrue errors into German */
function describe(error: unknown): string {
  const msg = (error as { message?: string })?.message ?? String(error);

  if (/already been registered|already registered|email_exists/i.test(msg)) {
    return 'Für diese E-Mail-Adresse gibt es schon ein Konto.';
  }
  if (/weak|password should/i.test(msg)) {
    return 'Das Passwort ist zu schwach.';
  }
  if (/not found/i.test(msg)) {
    return 'Benutzer wurde nicht gefunden.';
  }

  return msg;
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const caller = await authenticate(req);
    const body = await req.json().catch(() => null) as Action | null;
    if (!body || typeof body !== 'object') throw new HttpError(400, 'Ungültige Anfrage.');

    return json(await handle(caller, body));
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 400;
    if (!(e instanceof HttpError)) console.error(e);
    return json({ error: describe(e) }, status);
  }
});
