const path = require('path');

function safeJoin(root, requestPath) {
  try {
    const decoded = decodeURIComponent(requestPath.split('?')[0].split('#')[0]);
    const resolved = path.resolve(root, `.${decoded.startsWith('/') ? decoded : `/${decoded}`}`);
    const relative = path.relative(root, resolved);
    return relative === '..' || relative.startsWith(`..${path.sep}`) ? null : resolved;
  } catch {
    return null;
  }
}

module.exports = { safeJoin };
