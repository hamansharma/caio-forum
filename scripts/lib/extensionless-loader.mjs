// Node module-resolution hook: lets build scripts import the app's src/ modules,
// which use extensionless relative imports (fine for webpack, not for Node).
export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context);
  } catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND' && /^\.{1,2}\//.test(specifier) && !/\.[cm]?js$/.test(specifier)) {
      return next(`${specifier}.js`, context);
    }
    throw error;
  }
}
