import {execSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

// Commit hash for feedback context; CONTRA_COMMIT overrides it.
function commit() {
  if (process.env.CONTRA_COMMIT) return process.env.CONTRA_COMMIT;
  try {
    return execSync('git rev-parse --short HEAD', {stdio: ['ignore', 'pipe', 'ignore']}).toString().trim();
  } catch {
    return 'unknown';
  }
}

// Keep the timing experiment separate from production dance sampling.
export default {
  build: {
    rollupOptions: {
      input: {
        studio: fileURLToPath(new URL('./index.html', import.meta.url)),
        timing: fileURLToPath(new URL('./timing-lab.html', import.meta.url)),
        figures: fileURLToPath(new URL('./figures.html', import.meta.url)),
      },
    },
  },
};
