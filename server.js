// server.js
import express from 'express';
import session from 'express-session';
import path from 'node:path';                // ✅ Using node: protocol for built-in module
import bodyParser from 'body-parser';
import { fileURLToPath } from 'node:url';    // ✅ Built-in URL module
import routes from './server/routes.js';     // ✅ Include .js extension for ESM imports

// For __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ✅ Sessions
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-secret-key', // Use env in production
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true only if HTTPS
  })
);

// ✅ Serve static files (CSS, JS, images)
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Serve uploaded profile pictures
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ Register routes
app.use('/', routes);

// ✅ Serve HTML files from views folder
app.use(express.static(path.join(__dirname, 'views')));

// ✅ Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Error stack:', err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
