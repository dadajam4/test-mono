import { style, globalStyle } from '@vanilla-extract/css';
import { COLORS } from './schemes';
import { objectFromArray } from './utils';

const colors = objectFromArray.build(COLORS);

globalStyle('a', {
  textDecoration: 'underline',
});

export const colorStyles = colors((color) => [
  color,
  style({
    color,
  }),
]);
