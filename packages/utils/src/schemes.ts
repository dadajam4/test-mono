export const COLORS = ['blue', 'red', 'green'] as const;

export type Color = (typeof COLORS)[number];

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Variants {}

type ExtractKeys<T> = keyof T extends never ? string : keyof T;

export type Variant = ExtractKeys<Variants>;
