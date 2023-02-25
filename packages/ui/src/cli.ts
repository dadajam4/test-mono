import fs from 'node:fs';
import path from 'node:path';

export function createMock() {
  return {
    fs,
    path,
  };
}
