// Identity's external login returns to the site's root. Route only recognized
// authentication fragments to the admin SDK before other page scripts run.
hexo.extend.injector.register('head_begin', '<script src="/admin/assets/identity-redirect.js"></script>', 'default');
