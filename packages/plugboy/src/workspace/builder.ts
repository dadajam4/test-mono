import { Options, build } from 'tsup';
import { EsbuildPlugin } from '../types';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { PlugboyWorkspace } from './workspace';

const SHEBANG_MATCH_RE = /^(#!.+?)\n/;

export class Builder {
  readonly workspace: PlugboyWorkspace;
  private _tsupOptions?: Options;

  get has() {
    return this.workspace.has;
  }

  get entry() {
    return this.workspace.entry;
  }

  constructor(workspace: PlugboyWorkspace) {
    this.workspace = workspace;
  }

  async tsupOptions(overrides?: { watch?: boolean }): Promise<Options> {
    let { _tsupOptions } = this;
    if (_tsupOptions) return _tsupOptions;

    const { has, entry } = this;

    const esbuildPlugins: EsbuildPlugin[] = [];

    console.log(this.workspace.name, has);

    if (has.vanillaExtract) {
      esbuildPlugins.push(
        (
          await import('@vanilla-extract/esbuild-plugin')
        ).vanillaExtractPlugin() as any,
      );
    }

    if (has.vue) {
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

  private async _linkJS(from: string, to: string) {
    const fromParsed = path.parse(from);
    const fromDir = fromParsed.dir;
    const toParsed = path.parse(to);
    const toRelativeDir = path.relative(fromDir, toParsed.dir);
    const location = path.join(toRelativeDir, toParsed.base);
    const source = await fs.readFile(to, 'utf-8');
    const shebang = source.match(SHEBANG_MATCH_RE)?.[1];
    const code = `export * from '${location}';`;
    const dtsPath = path.join(fromDir, `${fromParsed.name}.d.ts`);
    const dtsCode = `export * from '${location.replace(/\.ts$/, '')}';`;
    await Promise.all([
      fs.writeFile(from, `${shebang ? shebang + '\n' : ''}${code}`),
      fs.writeFile(dtsPath, dtsCode),
    ]);
  }

  private async _linkCSS(from: string) {
    const code = `/* noop */`;
    await fs.writeFile(from, code);
  }

  async link() {
    const links = this.workspace.getLinks();
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
    const options = await this.tsupOptions();
    return build(options);
  }
}
