const express    = require("express");
const session    = require("express-session");
const path       = require("path");
const dotenv     = require("dotenv");
const morgan     = require("morgan");
const helmet     = require("helmet");
const rateLimit  = require("express-rate-limit");

dotenv.config();

const app = express();

/* ===============================
   ENVIRONMENT VALIDATION
================================ */
const required = ["SESSION_SECRET", "DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`❌ Missing required env var: ${key}`);
    process.exit(1);
  }
}

/* ===============================
   SECURITY HEADERS
   FIX: Added font/icon CDN sources to CSP so Google Fonts
        and Font Awesome load correctly in the browser.
================================ */
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc:  ["'self'"],
        scriptSrc:   ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
        styleSrc:    ["'self'", "'unsafe-inline'",
                      "https://fonts.googleapis.com",
                      "https://cdnjs.cloudflare.com"],
        fontSrc:     ["'self'", "https://fonts.gstatic.com",
                      "https://cdnjs.cloudflare.com"],
        imgSrc:      ["'self'", "data:", "https:"],
        connectSrc:  ["'self'"],
      },
    },
  })
);

/* ===============================
   RATE LIMITING
================================ */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: "Too many attempts. Try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders:   false,
});

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
});

app.use(globalLimiter);
app.use("/login",           authLimiter);
app.use("/verify-otp",      authLimiter);
app.use("/forgot-password", authLimiter);

/* ===============================
   LOGGING
================================ */
app.use(morgan("dev"));

/* ===============================
   BODY PARSING
================================ */
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: "1mb" }));

/* ===============================
   SESSION CONFIGURATION
================================ */
app.use(
  session({
    secret:            process.env.SESSION_SECRET,
    resave:            false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge:   1000 * 60 * 60 * 2, // 2 hours
    },
  })
);

/* ===============================
   STATIC FILES
================================ */
app.use(express.static(path.join(__dirname, "public")));

/* ===============================
   ROUTES
================================ */
const routes      = require("./server/routes");
const adminRoutes = require("./server/adminRoutes");

app.use("/",      routes);
app.use("/admin", adminRoutes);

/* ===============================
   404 HANDLER
================================ */
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, "views", "404.html"));
});

/* ===============================
   GLOBAL ERROR HANDLER
================================ */
app.use((err, req, res, next) => {
  console.error("🔥 Server Error:", err);
  res.status(500).json({ success: false, message: "Internal Server Error" });
});

/* ===============================
   SERVER START
================================ */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
