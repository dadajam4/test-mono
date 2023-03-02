import { Options, build } from 'tsup';
import { PlugboyConfig, PlugboyEntryLink } from './types';
import { EsbuildPlugin } from './plugins/types';
import fs from 'node:fs';
import path from 'node:path';
import sortPackageJson from 'sort-package-json';
import { rmrf } from '../utils';

const SHEBANG_MATCH_RE = /^(#!.+?)\n/;

export class Builder {
  readonly config: PlugboyConfig;
  private _tsupOptions?: Options;

  get uses() {
    return this.config.uses;
  }

  get entry() {
    return this.config.entry;
  }

  constructor(config: PlugboyConfig) {
    this.config = config;
  }

  async tsupOptions(overrides?: { watch?: boolean }): Promise<Options> {
    let { _tsupOptions } = this;
    if (_tsupOptions) return _tsupOptions;

    const { uses, entry } = this;

    const esbuildPlugins: EsbuildPlugin[] = [];

    if (uses.css) {
      esbuildPlugins.push(
        (
          await import('@vanilla-extract/esbuild-plugin')
        ).vanillaExtractPlugin() as any,
      );
    }

    if (uses.vue) {
      esbuildPlugins.push((await import('./plugins/esbuild-vue-jsx')).VueJSX());
    }

    _tsupOptions = {
      format: ['esm'],
      dts: true,
      esbuildPlugins,
      entry,
      splitting: true,
      outExtension: ({ format }) => ({
        js: `.mjs`,
      }),
      sourcemap: true,
      clean: true,
      ...overrides,
    };

    this._tsupOptions = _tsupOptions;
    return _tsupOptions;
  }

  getLinks(): PlugboyEntryLink[] {
    const links: PlugboyEntryLink[] = [];
    this.config.exports.forEach(({ link }) => {
      link && links.push(link);
    });
    return links;
  }

  clean(withDepsAndCache?: boolean) {
    const { dir, dirs } = this.config;
    const paths: string[] = [dirs.dist.value];
    if (withDepsAndCache) {
      paths.push(dir.join('node_modules').value, dir.join('.turbo').value);
    }
    return rmrf(...paths);
  }

  async preparePackageJSON() {
    const { exports, json } = this.config;
    const _exports: Record<string, any> = {};
    const typesVersions: Record<string, any> = {};
    let main: string | undefined;
    let mainTypes: string | undefined;

    exports.forEach(({ id, at }) => {
      _exports[id] = at;
      if (typeof at !== 'object') return;
      const isMainExport = id === '.';
      const trimedId = isMainExport ? id : id.replace(/^\.\//, '');
      typesVersions[trimedId] = [at.types];

      if (isMainExport) {
        main = at.import.default;
        mainTypes = at.types;
      }
    });

    const cloned: typeof json = JSON.parse(JSON.stringify(json));
    cloned.exports = _exports;
    cloned.typesVersions = {
      '*': typesVersions,
    };
    if (main) cloned.main = main;
    if (mainTypes) cloned.types = mainTypes;

    (['dependencies', 'devDependencies', 'peerDependencies'] as const).forEach(
      (prop) => {
        const deps = cloned[prop];
        if (!deps) return;
        Object.keys(deps).forEach((dep) => {
          const version = deps[dep];
          if (version.startsWith('workspace:')) {
            deps[dep] = 'workspace:*';
          }
        });
      },
    );

    cloned.files = cloned.files || [];
    if (!cloned.files.some((file) => /(\.\/)?dist\/?/.test(file))) {
      cloned.files.unshift('dist');
    }

    const sorted = sortPackageJson(cloned);
    const fromStr = JSON.stringify(cloned, null, 2);
    const toStr = JSON.stringify(sorted, null, 2);
    if (fromStr !== toStr || process) {
      await fs.promises.writeFile(
        this.config.dir.join('package.json').value,
        toStr,
      );
      this.config.json = sorted;
    }
    return sorted;
  }

  private async _linkJS(from: string, to: string) {
    const fromParsed = path.parse(from);
    const fromDir = fromParsed.dir;
    const toParsed = path.parse(to);
    const toRelativeDir = path.relative(fromDir, toParsed.dir);
    const location = path.join(toRelativeDir, toParsed.base);
    const source = await fs.promises.readFile(to, 'utf-8');
    const shebang = source.match(SHEBANG_MATCH_RE)?.[1];
    const code = `export * from '${location}';`;
    const dtsPath = path.join(fromDir, `${fromParsed.name}.d.ts`);
    const dtsCode = `export * from '${location.replace(/\.ts$/, '')}';`;
    await Promise.all([
      fs.promises.writeFile(from, `${shebang ? shebang + '\n' : ''}${code}`),
      fs.promises.writeFile(dtsPath, dtsCode),
    ]);
  }

  private async _linkCSS(from: string) {
    const code = `/* noop */`;
    await fs.promises.writeFile(from, code);
  }

  async link() {
    await this.clean();
    await fs.promises.mkdir(this.config.dirs.dist.value);
    const links = this.getLinks();
    await Promise.all(
      links.map(({ from, to, type }) => {
        if (type === 'js') {
          return this._linkJS(from, to);
        } else if (type === 'css') {
          return this._linkCSS(from);
        }
      }),
    );
  }

  async build() {
    await this.clean();
    const options = await this.tsupOptions();
    return build(options);
  }
}
