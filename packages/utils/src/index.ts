import './styles.css';

export * from './schemes';
export * from './utils';

/**
 * Say Hello.
 *
 * @param name - name
 * @returns Hello string.
 */
export function sayHelloByName<T extends string>(name: T) {
  return `Hello ${name}.` as const;
}
