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
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      identity.off('login', success);
      identity.off('error', failure);
    };
    const success = user => { if (user) { cleanup(); resolve(); } };
    const failure = error => {
      if (!error) return;
      cleanup();
      reject(new Error('登录验证未完成，请重新登录'));
    };
    identity.on('login', success);
    identity.on('error', failure);
  });
}
