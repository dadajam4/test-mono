import { sayHelloByName } from '@dadajam4/utils';

export * from './components';

export function logHelloByName<T extends string>(name: T) {
  console.log(sayHelloByName(name));
}

logHelloByName(2);
