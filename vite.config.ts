import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { tanstackRouter } from '@tanstack/router-vite-plugin'
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({mode}) => {
    const env = loadEnv(mode, process.cwd(), "");
    return {
        plugins: [
            react(), 
            tanstackRouter({
                target: "react"
            }),
            tailwindcss()
        ],
        resolve: {
            extensions: [
                ".js", 
                ".jsx", 
                ".ts", 
                ".tsx", 
                ".json"
            ],
            alias: {
                "#shared": path.resolve(__dirname, "./shared"), 
                "#client": path.resolve(__dirname, "./src"), 
                "#server": path.resolve(__dirname, "./server"), 
            },
        },
        define: {
            process: {
                env: env,
            },
        },
        build: {
            outDir: "./build/static",
            rollupOptions: {
                input: {
                    main: "./src/index.html",
                    landing: "./src/landing.html",
                },
            },
        },
        server: {
            port: 4000,
            open: false,
            proxy: {
                "/api": {
                    target: "http://localhost:3000",
                    changeOrigin: true,
                    secure: false,
                },
            },
        }
    }
});