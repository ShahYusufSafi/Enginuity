import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from '@svgr/rollup'; // Added for SVG support

// shadcn 
import path from "path"
import tailwindcss from "@tailwindcss/vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), svgr(), tailwindcss()], // Include SVGR plugin for SVG support
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // to make the backend files accessible to frontend
  // so static is now attached to it's parent address
  server: {
  proxy:{
    '/upload-dwg-to-svg': {  
      target: 'http://converter:8001',
      changeOrigin: true,
      secure: false,
    },
    '/SVGs': {
      target: 'http://converter:8001',
      changeOrigin: true,
      secure: false,
    },
    '/api': {
      target: 'http://converter:8001',
      changeOrigin: true,
      secure: false,
    }
  },
  host: "0.0.0.0",
  allowedHosts: ["frontend", "backend", "localhost", "converter" ]
}
})

