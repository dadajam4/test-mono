import { defineComponent } from 'vue';
import { Button } from '@dadajam4/ui';

export const App = defineComponent({
  name: 'App',
  setup() {
    return () => {
      return (
        <div>
          <h1>Hello</h1>
          <Button
            onClick={(ev) => {
              console.log(ev);
            }}>
            ボタン
          </Button>
        </div>
      );
    };
  },
});
