import * as styles from './Button.css';
import { defineComponent } from 'vue';

export const Button = defineComponent({
  name: 'Button',
  props: {
    /** ボタン値 */
    value: String,
  },
  emits: {
    click: (ev: MouseEvent) => true,
  },
  setup(props, ctx) {
    return () => {
      return (
        <button
          class={[styles.host, styles._types.a, styles._types.b]}
          value={props.value}
          onClick={(ev) => ctx.emit('click', ev)}>
          {ctx.slots.default?.()}
        </button>
      );
    };
  },
});
