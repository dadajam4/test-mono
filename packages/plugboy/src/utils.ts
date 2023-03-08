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

type FileMatcherFn = (
  file: fs.Dirent,
  dir: string,
) => boolean | Promise<boolean>;

type FileMatcher = string | RegExp | FileMatcherFn;

function normalizeFileMatcher(matcher: FileMatcher): FileMatcherFn {
  if (typeof matcher === 'function') {
    return matcher;
  }
  if (typeof matcher === 'string') {
    return (file) => file.name.includes(matcher);
  }
  return (file) => matcher.test(file.name);
}

export async function findFile(
  dir: string,
  matcher: FileMatcher,
  recursive = true,
): Promise<string | undefined> {
  const files = await fs.promises.readdir(dir, { withFileTypes: true });
  const _matcher = normalizeFileMatcher(matcher);

  const dirs: fs.Dirent[] | undefined = recursive ? [] : undefined;

  for (const file of files) {
    if (dirs && file.isDirectory()) {
      dirs.push(file);
      continue;
    }
    if (await _matcher(file, dir)) {
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

export interface FindConfigResult {
  dir: string;
  path: string;
  code: string;
}

interface FindConfigSettings<AllowMissing extends boolean | undefined> {
  fileName: string;
  allowMissing?: AllowMissing;
  test?: (result: FindConfigResult) => boolean;
  /**
   * Trace up to how many directories above
   * @default 10
   */
  depth?: number;
}

export async function findConfig<
  AllowMissing extends boolean | undefined = false,
>(
  fileNameOrSettings: string | FindConfigSettings<AllowMissing>,
  dir = process.cwd(),
  currentDepth = 0,
): Promise<
  AllowMissing extends true ? FindConfigResult | null : FindConfigResult
> {
  const settings: FindConfigSettings<AllowMissing> =
    typeof fileNameOrSettings === 'object'
      ? fileNameOrSettings
      : { fileName: fileNameOrSettings };

  const { fileName, test, depth = 10, allowMissing } = settings;
  if (depth && currentDepth === depth) {
    if (allowMissing) return null as any;
    throw new Error(
      `Failed to retrieve the "${fileName}" file because the maximum depth was reached.`,
    );
  }
  const _path = path.join(dir, fileName);

  const next = (err?: unknown) => {
    const nextDir = path.dirname(dir);
    if (nextDir !== dir) {
      return findConfig(fileName, nextDir, currentDepth + 1);
    }
    if (allowMissing) return null as any;
    throw err || new Error(`missing config "${fileName}"`);
  };

  try {
    const code = await fs.promises.readFile(_path, 'utf-8');
    const result: FindConfigResult = {
      dir,
      path: _path,
      code,
    };
    if (test && !test(result)) {
      return next();
    }
    return result;
  } catch (err) {
    if (!isFileNotFoundException(err)) {
      throw err;
    }
    return next(err);
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
