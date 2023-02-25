import { PlugboyConfig, PlugboyExport } from './types';
import {
  PlugboyPackage,
  getInScopePlugboyPackage,
  findWorkspacePlugboyPackages,
} from '../package';
import { Path } from '../path';
import { findFile, isFileNotFoundException } from '../utils';

async function toPlugboyConfig(pkg: PlugboyPackage): Promise<PlugboyConfig> {
  const dirs = {
    src: pkg.dir.join('src'),
    dist: pkg.dir.join('dist'),
  };

  const hasCSS = !!(await findFile(dirs.src.value, /\.css(\.ts)?$/));
  const hasTSX = !!(await findFile(dirs.src.value, /\.tsx?$/));
  const hasVue = pkg.dependencies.some((dep) => dep === 'vue');

  const _exports: Record<string, string> = {
    '.': 'src/index.ts',
    ...pkg.meta.exports,
  };

  const entry: Record<string, string> = {};
  const exports: PlugboyExport[] = [
    {
      id: './package.json',
      at: './package.json',
    },
  ];
  const CSS_LINK_PATH = dirs.dist.join('_.css').value;

  Object.entries(_exports).forEach(([id, src]) => {
    const isMainEntry = id === '.';
    const normalizedId = isMainEntry ? pkg.name : id.replace('./', '');
    const dest = `./dist/${normalizedId}.mjs`;
    const types = `./dist/${normalizedId}.d.ts`;

    entry[normalizedId] = src;
    exports.push({
      id,
      at: { types, import: { default: dest } },
      link: {
        from: pkg.dir.join(dest).value,
        to: pkg.dir.join(src).value,
        type: 'js',
      },
    });

    if (isMainEntry && hasCSS) {
      const cssName = `${normalizedId}.css`;
      const cssDest = `./dist/${cssName}`;
      exports.push({
        id: `./${cssName}`,
        at: `./dist/${cssName}`,
        link: {
          from: pkg.dir.join(cssDest).value,
          to: CSS_LINK_PATH,
          type: 'css',
        },
      });
    }
  });

  const settings: PlugboyConfig = {
    ...pkg,
    dirs,
    uses: {
      vue: hasVue && hasTSX,
      css: !!hasCSS,
    },
    entry,
    exports,
  };
  return settings;
}

export async function loadInScopePlugboyConfig<D = undefined>(
  searchDir?: string,
  defaults?: D,
): Promise<D extends undefined ? PlugboyConfig : PlugboyConfig | D> {
  try {
    const pkg = await getInScopePlugboyPackage(searchDir);
    return toPlugboyConfig(pkg) as any;
  } catch (err) {
    if (defaults !== undefined && isFileNotFoundException(err)) {
      return defaults as any;
    }
    throw err;
  }
}

export async function loadWorkspacePlugboyConfigs(
  cwd?: string,
): Promise<{ dir: Path; configs: PlugboyConfig[] }> {
  const { dir, pkgs } = await findWorkspacePlugboyPackages(cwd);
  const configs = await Promise.all(pkgs.map(toPlugboyConfig));
  return {
    dir,
    configs,
  };
}
