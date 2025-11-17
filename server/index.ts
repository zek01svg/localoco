import app from "./app";
import { env } from "env";

const port = env.PORT;
const url = env.VITE_APP_URL
const start = Date.now();
const server = {
    port: port,
    fetch: app.fetch,
};

console.log(`🚀 Server is running on ${url}:${port}`);
console.log(`✅ Ready in ${Date.now() - start} ms`);
console.log(`🧠 Bun v${Bun.version}`);

export default server;