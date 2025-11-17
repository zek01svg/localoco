import path from 'path';
import { Hono } from 'hono';
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { serveStatic } from "hono/bun";
import { fileURLToPath } from 'url';
import announcementRouter from './routes/announcement.routes';
import bookmarkRouter from './routes/bookmark.routes';
import businessRouter from './routes/business.routes';
import forumRouter from './routes/forum.routes';
import reviewRouter from './routes/review.routes';
import fileRouter from './routes/file.routes';
import userRouter from './routes/user.routes';
import auth from './lib/auth';
import { env } from 'env';
import errorHandler from 'middleware/error-handler';

// initialize the app
const app = new Hono()

// mount the error handling middleware
app.onError(errorHandler)

// for cors
app.use(cors({
    origin: env.NODE_ENV === 'production'
        ? 'https://localoco-wad-ii.azurewebsites.net'
        : 'http://localhost:3000', 
    credentials: true,
}));

// for csp
app.use(secureHeaders({
    contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    connectSrc: [
        "'self'",
        "http://localhost:3000",
        "http://localhost:5000",
        "https://cdn.jsdelivr.net",
        "https://unpkg.com",
        "https://localoco.blob.core.windows.net",
        "https://*.googleapis.com",   
        "https://*.gstatic.com",      
        "https://maps.googleapis.com", 
        "https://maps.gstatic.com",
        "https://www.onemap.gov.sg" 
    ],
    scriptSrcAttr: ["'unsafe-inline'"],
    scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://cdn.jsdelivr.net",
        "https://unpkg.com",
        "https://maps.googleapis.com"
    ],
    styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://cdn.jsdelivr.net",
        "https://fonts.googleapis.com"
    ],
    imgSrc: [
        "'self'",
        "data:",
        "https://cdn.jsdelivr.net",
        "https://localoco.blob.core.windows.net",
        "https://maps.gstatic.com",
        "https://*.googleapis.com",
        "*.google.com",
        "https://*.ggpht.com",
        "https://images.unsplash.com",
        "https://example.com",
        "http://maps.google.com" 
    ],
    frameSrc: [
        "'self'",
        "https://*.google.com",        
        "https://www.google.com"       
    ],
    fontSrc: [
        "'self'",
        "data:",
        "https://fonts.gstatic.com"
    ],
    }
}));

app.use(logger())

// __dirname equivalent in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPath = path.resolve(__dirname, '../build/static');

// mount the routers
app.route('/api/businesses', businessRouter) 
app.route('/api/users', userRouter) 
app.route('/api/files', fileRouter) 
app.route('/api/reviews', reviewRouter)
app.route('/api/announcements', announcementRouter)
app.route('/api/bookmarks', bookmarkRouter)
app.route('/api/forum', forumRouter)

// this endpoint dynamically injects environment variables into the client at runtime
app.get("/api/runtime", async (c) => {
    return c.text(`window.__env = ${JSON.stringify(Object.fromEntries(Object.entries(env).filter(([key]) => key.startsWith("VITE_"))), null, 2)}`.trim(),
        200,
        { 
            "Content-Type": "application/javascript" 
        },
    );
});

// for dev environment only: the frontend will wait for the backend to start first before starting
app.get("/health", async (c)=>{
    return c.json({
        health: "ok"
    }, 200)
})

// handler for better-auth
app.on(["POST", "GET"], "/api/auth/*", (c) => {
    return auth.handler(c.req.raw);
})

// serve landing page at root
app.get( '/', serveStatic({
    root: frontendPath,
    path: '/src/landing.html'
}))

// serve static assets
app.use('/*', serveStatic({
    root: frontendPath,
}))

// SPA catch all route
app.get("*", serveStatic({path: path.join(frontendPath, '/src/index.html')}))

export default app