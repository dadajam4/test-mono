import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function getFilename(importMetaURL: string) {
  return fileURLToPath(importMetaURL);
}

export function getDirname(importMetaURL: string) {
  return path.dirname(getFilename(importMetaURL));
}

const FILE_NOT_FOUND_EXCEPTION_CODES = ['ENOTDIR', 'ENOENT'] as const;

export function isFileNotFoundException(
  source: unknown,
): source is NodeJS.ErrnoException {
  return (
    !!source &&
    typeof source === 'object' &&
    FILE_NOT_FOUND_EXCEPTION_CODES.includes(
      (source as NodeJS.ErrnoException).code as any,
    )
  );
}

export async function pathExists(
  target: string,
  type?: 'file' | 'dir',
): Promise<boolean> {
  try {
    const stats = await fs.promises.stat(target);
    if (!type) return true;
    return type === 'file' ? stats.isFile() : stats.isDirectory();
  } catch (err) {
    if (isFileNotFoundException(err)) return false;
    throw err;
  }
}

export async function findFile(
  dir: string,
  matcher: string | RegExp | ((file: fs.Dirent, dir: string) => boolean),
  recursive = true,
): Promise<string | undefined> {
  const files = await fs.promises.readdir(dir, { withFileTypes: true });
  let _matcher: (file: fs.Dirent, dir: string) => boolean;
  if (typeof matcher === 'string') {
    _matcher = (file) => file.name.includes(matcher);
  } else if (typeof matcher === 'function') {
    _matcher = matcher;
  } else {
    _matcher = (file) => matcher.test(file.name);
  }

  const dirs: fs.Dirent[] | undefined = recursive ? [] : undefined;

  for (const file of files) {
    if (dirs && file.isDirectory()) {
      dirs.push(file);
      continue;
    }
    if (_matcher(file, dir)) {
      return path.join(dir, file.name);
    }
  }

  if (dirs) {
    for (const subDir of dirs) {
      const hit = await findFile(
        path.join(dir, subDir.name),
        _matcher,
        recursive,
      );
      if (hit) return hit;
    }
  }
}

export async function findConfig(
  fileName: string,
  dir = process.cwd(),
): Promise<{
  dir: string;
  path: string;
  code: string;
}> {
  const _path = path.join(dir, fileName);
  try {
    const code = await fs.promises.readFile(_path, 'utf-8');
    return {
      dir,
      path: _path,
      code,
    };
  } catch (err) {
    if (!isFileNotFoundException) {
      throw err;
    }
    const nextDir = path.dirname(dir);
    if (nextDir !== dir) {
      return findConfig(fileName, nextDir);
    }
    throw err;
  }
}

export async function findPackagesDir(cwd = process.cwd()): Promise<string> {
  const _path = cwd.endsWith('packages') ? cwd : path.join(cwd, 'packages');
  try {
    const stats = await fs.promises.stat(_path);
    if (stats.isDirectory()) return _path;

    const nextDir = path.dirname(_path);
    if (nextDir !== _path) {
      return findPackagesDir(nextDir);
    }
    throw new Error('missing "packages" directory.');
  } catch (err) {
    if (!isFileNotFoundException) {
      throw err;
    }
    const nextDir = path.dirname(_path);
    if (nextDir !== _path) {
      return findPackagesDir(nextDir);
    }
    throw err;
  }
}

function _rmrf(path: string): Promise<void> {
  return fs.promises
    .rm(path, {
      recursive: true,
      force: true,
    })
    .catch((err) => {
      if (isFileNotFoundException(err)) return;
      throw err;
    });
}

export async function rmrf(...paths: string[]): Promise<void> {
  await Promise.all(paths.map((path) => _rmrf(path)));
}
