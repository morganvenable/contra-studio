import {fileURLToPath} from 'node:url';

// Keep the timing experiment separate from production dance sampling.
export default {
  build: {
    rollupOptions: {
      input: {
        studio: fileURLToPath(new URL('./index.html', import.meta.url)),
        timing: fileURLToPath(new URL('./timing-lab.html', import.meta.url)),
      },
    },
  },
};
