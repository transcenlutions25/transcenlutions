// Local review candidate. Provider enablement and publication require separate approval.
const PROVIDERS = new Set(['google', 'github']);
const PENDING = 'tay_oauth_pkce_pending_v1';
const TTL = 5 * 60 * 1000;
const cleanSession = s => ({access_token:s.access_token,refresh_token:s.refresh_token,
  expires_in:s.expires_in,expires_at:s.expires_at,token_type:'bearer'});
const b64url = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');

export function createOAuthController({supabaseUrl, publicKey, redirectTo, allowedRedirects,
  storage, crypto, fetch, now=Date.now}) {
  const base = new URL(supabaseUrl);
  const callback = new URL(redirectTo);
  if(base.protocol!=='https:' || base.username || base.password || base.pathname!=='/') throw new Error('Invalid auth origin.');
  if(callback.protocol!=='https:' || callback.username || callback.password || callback.search || callback.hash ||
    !allowedRedirects.includes(callback.href)) throw new Error('OAuth callback is not approved.');
  if(!crypto?.getRandomValues || !crypto?.subtle?.digest || !storage?.getItem || !storage?.setItem || !storage?.removeItem) throw new Error('Secure browser sign-in is unavailable. Use email.');
  let starting=false, consuming=false;
  const readPending = () => {try {return JSON.parse(storage.getItem(PENDING)||'null');} catch {return null;}};
  const clear = () => storage.removeItem(PENDING);
  async function request(path,options={}) {
    const response=await fetch(base.origin+'/auth/v1/'+path,{...options,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(15000),
      headers:{apikey:publicKey,'content-type':'application/json',...(options.headers||{})}});
    const data=await response.json().catch(()=>({}));
    if(!response.ok) throw new Error('Authentication could not be completed. Start sign-in again.');
    return data;
  }
  async function providers() {
    const settings=await request('settings',{method:'GET'});
    return Object.fromEntries([...PROVIDERS].map(p=>[p,settings.external?.[p]===true]));
  }
  function hasPending(){return Boolean(readPending());}
  async function begin(provider) {
    if(!PROVIDERS.has(provider)) throw new Error('Unsupported sign-in provider.');
    if(starting||consuming) throw new Error('Sign-in is already in progress.');
    starting=true;
    try {
      if(!(await providers())[provider]) throw new Error('This sign-in provider is not configured. Use email for now.');
      const pending=readPending();
      if(pending && now()-pending.createdAt>=0 && now()-pending.createdAt<TTL) throw new Error('A sign-in is already pending. Cancel it before trying again.');
      clear();
      const verifier=b64url(crypto.getRandomValues(new Uint8Array(32)));
      const challenge=b64url(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));
      storage.setItem(PENDING,JSON.stringify({verifier,provider,createdAt:now(),redirectTo:callback.href}));
      const url=new URL(base.origin+'/auth/v1/authorize');
      url.searchParams.set('provider',provider);url.searchParams.set('redirect_to',callback.href);
      url.searchParams.set('code_challenge',challenge);url.searchParams.set('code_challenge_method','s256');
      // Identity only: no repository, Gmail, Drive or offline provider access scopes.
      if(provider==='google') url.searchParams.set('scopes','openid email profile');
      return url.href;
    } finally {starting=false;}
  }
  async function consume(urlString) {
    if(consuming) throw new Error('Sign-in is already being completed.');
    const url=new URL(urlString);
    if(url.origin!==callback.origin || url.pathname!==callback.pathname || url.username || url.password)
      throw new Error('Unexpected sign-in callback.');
    const pending=readPending();
    if(!pending || pending.redirectTo!==callback.href || !PROVIDERS.has(pending.provider) ||
      !/^[A-Za-z0-9_-]{43}$/.test(pending.verifier) || !Number.isFinite(pending.createdAt) ||
      now()-pending.createdAt<0 || now()-pending.createdAt>=TTL) {clear();throw new Error('Sign-in expired or started in another browser. Start again here.');}
    const hash=new URLSearchParams(url.hash.slice(1));
    if(url.searchParams.has('error')||url.searchParams.has('error_code')||hash.has('error')||hash.has('error_code')) {
      clear();throw new Error('Provider sign-in was cancelled or denied. You can still use email.');
    }
    const codes=url.searchParams.getAll('code');
    if(codes.length!==1 || !codes[0] || codes[0].length>4096 || hash.has('access_token') || hash.has('refresh_token')) {
      clear();throw new Error('Invalid sign-in callback. Start again.');
    }
    consuming=true;clear(); // One attempt only. Never replay a potentially consumed authorization code.
    try {
      const session=await request('token?grant_type=pkce',{method:'POST',body:JSON.stringify({auth_code:codes[0],code_verifier:pending.verifier})});
      if(typeof session.access_token!=='string'||!session.access_token||typeof session.refresh_token!=='string'||!session.refresh_token)
        throw new Error('No usable sign-in session was returned.');
      const user=await request('user',{method:'GET',headers:{authorization:'Bearer '+session.access_token}});
      if(typeof user.id!=='string'||!user.id || (session.user?.id && session.user.id!==user.id))
        throw new Error('Could not verify the signed-in account.');
      // Never infer privileges from email/provider/metadata. Existing tay-api determines profile/roles.
      return {session:cleanSession(session),userId:user.id};
    } finally {consuming=false;}
  }
  return {providers,begin,consume,hasPending,cancel:clear};
}
