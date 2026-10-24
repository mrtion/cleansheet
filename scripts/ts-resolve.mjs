// 测试用 ESM loader：将无扩展相对导入解析为 .ts（Node 类型剥离不支持无扩展导入）
export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context);
  } catch (e) {
    if (specifier.startsWith('.') || specifier.startsWith('/')) {
      for (const ext of ['.ts', '/index.ts']) {
        try {
          return await next(specifier + ext, context);
        } catch { /* try next */ }
      }
    }
    throw e;
  }
}
