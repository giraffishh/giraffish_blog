const tokenKeys = ['access_token', 'confirmation_token', 'invite_token', 'recovery_token', 'email_change_token'];

export function isIdentityCallback(hash) {
  const params = new URLSearchParams(hash.replace(/^#\/?/, ''));
  return tokenKeys.some(key => Boolean(params.get(key))) || params.get('error') === 'access_denied';
}

export function callbackDestination({ pathname, hash }) {
  if (pathname.startsWith('/admin/') || !isIdentityCallback(hash)) return null;
  // Keep credentials in the fragment, on this origin, and out of query strings.
  return `/admin/${hash}`;
}

export function waitForIdentityLogin(identity) {
  return new Promise(resolve => {
    const success = user => {
      if (user) { identity.off('login', success); resolve(); }
    };
    // The widget displays errors and allows retries. A wrong password or a
    // transient request failure must not permanently stop CMS startup.
    identity.on('login', success);
  });
}
