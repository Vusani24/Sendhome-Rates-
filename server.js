const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const port = process.env.PORT || 3200;
const sendhomeBase = "https://auto.sendhome.co.za";

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp"
};

const server = http.createServer((req, res) => {
  const cleanUrl = decodeURIComponent(req.url.split("?")[0]);
  if (cleanUrl === "/api/sendhome/countries") {
    proxySendHome("/api/rate/countrylist", "GET", null, res);
    return;
  }

  if (cleanUrl === "/api/sendhome/calculate" && req.method === "POST") {
    readBody(req, (body) => {
      proxySendHome("/api/rate/calculateRemittance/", "POST", body, res);
    });
    return;
  }

  const requested = cleanUrl === "/" ? "/index.html" : cleanUrl;
  const filePath = path.join(root, requested);

  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    res.writeHead(200, {
      "Content-Type": types[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    res.end(data);
  });
});

function readBody(req, callback) {
  let data = "";
  req.on("data", (chunk) => {
    data += chunk;
  });
  req.on("end", () => callback(data));
}

function proxySendHome(apiPath, method, body, res) {
  const url = new URL(apiPath, sendhomeBase);
  const request = https.request(
    url,
    {
      method,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": body ? Buffer.byteLength(body) : 0
      }
    },
    (apiRes) => {
      let data = "";
      apiRes.on("data", (chunk) => {
        data += chunk;
      });
      apiRes.on("end", () => {
        res.writeHead(apiRes.statusCode || 502, {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store"
        });
        res.end(data);
      });
    }
  );

  request.on("error", () => {
    res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ message: "Could not reach live rates." }));
  });

  if (body) {
    request.write(body);
  }
  request.end();
}

server.listen(port, () => {
  console.log(`SendHome rate calculator running at http://localhost:${port}`);
});
