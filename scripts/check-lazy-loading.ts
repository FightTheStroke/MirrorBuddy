import { basename, relative, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { inventoryFiles, isTestFile, sourceFiles } from './lib/source-inventory';
import { runtimeModule, type ImportEdge, type RuntimeModule } from './lib/lazy-import-graph';

export function checkLazyLoading(root: string) {
  const files = sourceFiles(root).filter((file) => !isTestFile(file) && !file.endsWith('.d.ts'));
  const configPath = resolve(root, 'apps/web/tsconfig.json');
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  if (config.error) throw new Error('Cannot read apps/web/tsconfig.json');
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, resolve(root, 'apps/web'));
  if (parsed.errors.length) throw new Error('Invalid apps/web/tsconfig.json');
  const program = ts.createProgram(
    files.map((file) => resolve(root, file)),
    {
      ...parsed.options,
      noResolve: true,
      noLib: true,
    },
  );
  const checker = program.getTypeChecker();
  const modules = new Map<string, RuntimeModule>();
  for (const file of files) {
    const path = resolve(root, file);
    const source = program.getSourceFile(path);
    if (!source) throw new Error(`Source not inspected: ${file}`);
    const syntax = program.getSyntacticDiagnostics(source);
    if (syntax.length) throw new Error(`Invalid TypeScript syntax: ${file}`);
    modules.set(path, runtimeModule(source, checker));
  }
  const aliases = Object.keys(parsed.options.paths ?? {});
  const workspaceNames = inventoryFiles(root, 'packages')
    .filter((file) => file.endsWith('/package.json'))
    .map((file) => {
      const metadata: unknown = JSON.parse(readFileSync(resolve(root, file), 'utf8'));
      if (
        !metadata ||
        typeof metadata !== 'object' ||
        !('name' in metadata) ||
        typeof metadata.name !== 'string'
      )
        throw new Error(`Invalid workspace manifest: ${file}`);
      return metadata.name;
    });
  const cache = ts.createModuleResolutionCache(root, (path) => path, parsed.options);
  const target = (file: string, specifier: string): string | undefined => {
    if (!specifier)
      throw new Error(`Non-literal runtime import cannot be resolved: ${relative(root, file)}`);
    // Styles and media are not JavaScript dependency edges.
    if (/\.(?:css|scss|svg|png|jpg|webp|woff2?)$/.test(specifier)) return undefined;
    const result = ts.resolveModuleName(
      specifier,
      file,
      parsed.options,
      ts.sys,
      cache,
    ).resolvedModule;
    const local =
      specifier.startsWith('.') ||
      specifier.startsWith('/') ||
      workspaceNames.some((name) => specifier === name || specifier.startsWith(`${name}/`)) ||
      aliases.some((alias) =>
        alias.includes('*')
          ? specifier.startsWith(alias.split('*')[0]) && specifier.endsWith(alias.split('*')[1])
          : specifier === alias,
      );
    if (!result) {
      if (local)
        throw new Error(`Unresolved local import: ${relative(root, file)} -> ${specifier}`);
      return undefined;
    }
    const path = ts.sys.realpath?.(result.resolvedFileName) ?? result.resolvedFileName;
    if (modules.has(path)) return path;
    if (
      local &&
      !result.resolvedFileName.endsWith('.d.ts') &&
      !result.resolvedFileName.endsWith('.json')
    ) {
      throw new Error(
        `Resolved local module outside inspected inventory: ${relative(root, file)} -> ${specifier}`,
      );
    }
    return undefined;
  };
  const hasExport = (file: string, name: string, visited = new Set<string>()): boolean => {
    const key = `${file}:${name}`;
    if (visited.has(key)) return false;
    visited.add(key);
    const info = modules.get(file)!;
    if (name === '*' || info.exports.has(name)) return true;
    return info.stars.some((specifier) => {
      if (specifier === 'recharts' || specifier.startsWith('recharts/')) return true;
      const destination = target(file, specifier);
      return destination ? hasExport(destination, name, visited) : false;
    });
  };
  const reached = new Map<string, Set<string>>();
  const eager = new Set<string>();
  const lazy = new Set<string>();
  const errors = new Set<string>();
  function follow(file: string, edge: ImportEdge, mode: 'eager' | 'lazy') {
    const nextMode = edge.dynamic ? 'lazy' : mode;
    if (edge.specifier === 'recharts' || edge.specifier.startsWith('recharts/')) {
      (nextMode === 'eager' ? eager : lazy).add(file);
      return;
    }
    const destination = target(file, edge.specifier);
    if (destination) visit(destination, edge.name, nextMode);
  }
  function visit(file: string, name: string, mode: 'eager' | 'lazy') {
    if (!hasExport(file, name)) {
      throw new Error(`Unresolved runtime export: ${relative(root, file)} -> ${name}`);
    }
    const key = `${mode}:${file}`;
    const names = reached.get(key) ?? new Set<string>();
    if (names.has(name)) return;
    names.add(name);
    reached.set(key, names);
    const info = modules.get(file)!;
    for (const edge of info.edges) follow(file, edge, mode);
    if (name === '*') {
      for (const edge of info.exports.values()) if (edge) follow(file, edge, mode);
    } else {
      const edge = info.exports.get(name);
      if (edge) follow(file, edge, mode);
    }
    for (const specifier of info.stars) {
      if (specifier === 'recharts' || specifier.startsWith('recharts/')) {
        follow(file, { specifier, name }, mode);
        continue;
      }
      const destination = target(file, specifier);
      if (destination && hasExport(destination, name)) visit(destination, name, mode);
    }
  }
  const frameworkEntries = new Set([
    'page',
    'layout',
    'route',
    'loading',
    'error',
    'global-error',
    'not-found',
    'default',
    'template',
  ]);
  const entries = files.filter(
    (file) =>
      /^apps\/web\/src\/(?:index|proxy|instrumentation(?:-client)?)\.tsx?$/.test(file) ||
      (file.startsWith('apps/web/src/app/') &&
        frameworkEntries.has(basename(file).replace(/\.tsx?$/, ''))),
  );
  if (!entries.length) throw new Error('No application entry modules found');
  for (const entry of entries) {
    try {
      visit(resolve(root, entry), '*', 'eager');
    } catch (error) {
      errors.add(error instanceof Error ? error.message : 'Graph traversal failed');
    }
  }
  const katex = [...modules]
    .filter(([, module]) => module.katex)
    .map(([file]) => relative(root, file));
  const heavy = [...modules].filter(([, module]) => module.heavy).map(([file]) => file);
  const unreferenced = heavy.filter((file) => !eager.has(file) && !lazy.has(file));
  return {
    eager: [...eager].map((file) => relative(root, file)),
    lazy: lazy.size,
    unreferenced: unreferenced.map((file) => relative(root, file)),
    katex,
    errors: [...errors],
  };
}

try {
  const result = checkLazyLoading(process.cwd());
  for (const file of result.katex) console.error(`Static KaTeX import: ${file}`);
  for (const file of result.eager) console.error(`Eager Recharts runtime path: ${file}`);
  for (const file of result.unreferenced) console.log(`Unreferenced Recharts module: ${file}`);
  for (const error of result.errors) console.error(error);
  console.log(
    `Recharts: ${result.eager.length} eager, ${result.lazy} behind dynamic boundaries, ${result.unreferenced.length} unreferenced modules.`,
  );
  console.log('Source reachability only; unreferenced modules are not claimed to be lazy-loaded.');
  process.exitCode = result.katex.length || result.eager.length || result.errors.length ? 1 : 0;
} catch (error) {
  console.error(
    'Lazy-loading scan failed:',
    error instanceof Error ? error.message : 'unknown error',
  );
  process.exitCode = 1;
}
