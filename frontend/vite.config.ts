import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(() => {
  const disableHmr = process.env.VITE_DISABLE_HMR === '1'

  return {
    plugins: [react()],
    server: disableHmr ? { hmr: false } : undefined,
  }
})
