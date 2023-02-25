export function objectFromArray<R, K extends string | number | symbol, T>(
  rows: R[] | readonly R[],
  cb: (row: R, index: number) => [K, T],
): Record<K, T> {
  const entries = new Map(
    rows.map((row, index) => {
      return cb(row, index);
    }),
  );
  return Object.fromEntries(entries) as Record<K, T>;
}

objectFromArray.build =
  <R, T>(rows: R[] | readonly R[]) =>
  <K extends string | number | symbol, T>(
    cb: (row: R, index: number) => [K, T],
  ) =>
    objectFromArray(rows, cb);
