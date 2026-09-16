import fs from 'fs';
import path from 'path';
import type { ModuleLoader } from './api-route-policy';

/** Only follow source modules within the application's real source directory. */
export function createApiModuleLoader(sourceRoot: string): ModuleLoader {
  const root = fs.realpathSync(sourceRoot);
  const inside = (filename: string) => {
    const relative = path.relative(root, filename);
    return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
  };
  return (specifier, from) => {
    if (!specifier || !from) return null;
    const base = specifier.startsWith('@/')
      ? path.resolve(root, specifier.slice(2))
      : specifier.startsWith('.')
        ? path.resolve(path.dirname(from), specifier)
        : null;
    if (!base || !inside(base)) return null;
    for (const candidate of [base, `${base}.ts`, path.join(base, 'index.ts')]) {
      if (!fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) continue;
      const filename = fs.realpathSync(candidate);
      if (!inside(filename)) return null;
      return { filename, content: fs.readFileSync(filename, 'utf8') };
    }
    return null;
  };
}
