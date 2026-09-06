import express from "express";
import path from "path";
import http from "http";
import { spawn } from "child_process";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

// Start Django server process if not already running on port 8008
let djangoProcess: any = null;

function checkAndStartDjango() {
  const req = http.get("http://127.0.0.1:8008/api/health/", (res) => {
    // Already running
    res.resume();
  });

  req.on("error", () => {
    console.log("Starting Django server on port 8008...");
    djangoProcess = spawn("python3", ["manage.py", "runserver", "127.0.0.1:8008", "--noreload"], {
      stdio: "inherit",
    });

    djangoProcess.on("error", (err: any) => {
      console.error("Django process error:", err);
    });
  });
}

checkAndStartDjango();

// Transparent proxy for all /api requests to Django backend on port 8008
app.use("/api", (req, res) => {
  const options: http.RequestOptions = {
    hostname: "127.0.0.1",
    port: 8008,
    path: "/api" + req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: "127.0.0.1:8008",
    },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on("error", (err) => {
    console.error("Proxy error:", err.message);
    res.status(502).json({
      error: "Vani Django backend unavailable or starting up",
      details: err.message,
    });
  });

  req.pipe(proxyReq, { end: true });
});

// Production & Dev handling
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Vani App Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

process.on("exit", () => {
  if (djangoProcess) {
    djangoProcess.kill();
  }
});
