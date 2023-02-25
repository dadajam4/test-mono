import path from 'node:path';
import fs from 'node:fs';
import { PlugboyPackageJson, PlugboyMeta } from './types';
import { WORKSPACE_SPEC_PREFIX } from './constants';
import { Path } from './path';
import { findConfig, findPackagesDir, isFileNotFoundException } from './utils';

export interface PlugboyPackage {
  name: string;
  dir: Path;
  json: PlugboyPackageJson;
  dependencies: string[];
  workspaceDependencies: string[];
  meta: PlugboyMeta;
}

export async function getPlugboyPackage<D = undefined>(
  targetDir: string,
  code?: string,
  defaults?: D,
): Promise<D extends undefined ? PlugboyPackage : PlugboyPackage | D> {
  try {
    if (!code) {
      code = await fs.promises.readFile(
        path.join(targetDir, 'package.json'),
        'utf-8',
      );
    }
    const dir = new Path(targetDir);
    const json: PlugboyPackageJson = JSON.parse(code);
    const { dependencies, peerDependencies, optionalDependencies } = json;
    const allDeps = {
      ...dependencies,
      ...peerDependencies,
      ...optionalDependencies,
    };

    const _dependencies = Object.keys(allDeps);

    const workspaceDependencies = Object.entries(allDeps)
      .filter(([dep, spec]) => spec.startsWith(WORKSPACE_SPEC_PREFIX))
      .map(([dep]) => dep);

    const info: PlugboyPackage = {
      name: dir.basename,
      dir,
      json,
      dependencies: _dependencies,
      workspaceDependencies,
      meta: json.plugboy || {},
    };
    return info as any;
  } catch (err) {
    if (defaults !== undefined && isFileNotFoundException(err)) {
      return defaults as any;
    }
    throw err;
  }
}

export async function getInScopePlugboyPackage<D = undefined>(
  searchDir?: string,
  defaults?: D,
): Promise<D extends undefined ? PlugboyPackage : PlugboyPackage | D> {
  try {
    const hit = await findConfig('package.json', searchDir);
    return getPlugboyPackage(hit.dir, hit.code, defaults);
  } catch (err) {
    if (defaults !== undefined && isFileNotFoundException(err)) {
      return defaults as any;
    }
    throw err;
  }
}

export async function findWorkspacePlugboyPackages(cwd?: string): Promise<{
  dir: Path;
  pkgs: PlugboyPackage[];
}> {
  const pkgs: PlugboyPackage[] = [];
  const PACKAGES_DIR = new Path(await findPackagesDir(cwd));

  const dirs = await PACKAGES_DIR.readdir();
  for (const dir of dirs) {
    const pkg = await getPlugboyPackage(dir.value, undefined, null);
    if (!pkg) continue;
    pkgs.push(pkg);
  }

  return {
    dir: PACKAGES_DIR,
    pkgs,
  };
}
