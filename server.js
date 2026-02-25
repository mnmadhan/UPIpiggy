const express = require("express");
const session = require("express-session");
const path = require("path");
const dotenv = require("dotenv");
const morgan = require("morgan");
const helmet = require("helmet");

dotenv.config();

const app = express();

/* ===============================
   ✅ ENVIRONMENT VALIDATION
================================ */
if (!process.env.SESSION_SECRET) {
  console.error("❌ SESSION_SECRET missing in .env file");
  process.exit(1);
}

/* ===============================
   ✅ MIDDLEWARE SETUP
================================ */

// Security headers

app.use(helmet());
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
    },
  })
);


// Logging requests
app.use(morgan("dev"));

// Body parsing
app.use(express.urlencoded({ extended: true }));

// Limit request body size (prevents abuse)
app.use(express.json({ limit: "1mb" }));

/* ===============================
   ✅ SESSION CONFIGURATION
================================ */
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,

    cookie: {
      httpOnly: true,
      secure: false, // true only in HTTPS production
      maxAge: 1000 * 60 * 60 * 2, // 2 hours
    },
  })
);

/* ===============================
   ✅ STATIC FILES
================================ */
app.use(express.static(path.join(__dirname, "public")));

/* ===============================
   ✅ ROUTES IMPORT
================================ */
const routes = require("./server/routes");
app.use("/", routes);

/* ===============================
   ✅ DEFAULT ROUTE
================================ */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "index.html"));
});

/* ===============================
   ✅ 404 HANDLER
================================ */
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, "views", "404.html"));
});

/* ===============================
   ✅ GLOBAL ERROR HANDLER
================================ */
app.use((err, req, res, next) => {
  console.error("🔥 Server Error:", err);

  res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
});

/* ===============================
   ✅ SERVER START
================================ */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
