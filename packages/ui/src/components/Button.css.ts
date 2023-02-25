import { style } from '@vanilla-extract/css';
import { BUTTON_TYPES } from './schemes';

export const host = style({
  color: '#f00',
});

const types = BUTTON_TYPES();

export const _types = {
  [types[0]]: style({}),
  [types[1]]: style({}),
};
