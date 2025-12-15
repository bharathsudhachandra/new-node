const http = require("http");
const path = require("path");
const fs = require("fs");
const { MongoClient } = require("mongodb");

const uri =
  "mongodb+srv://bbach1_db_user:Bharath@final.ooordpi.mongodb.net/?appName=final";

const baseDir = path.join(__dirname, "portfolio");

const server = http.createServer(async (req, res) => {
  // ================= CORS =================
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  // ================= GET JOBS =================
  if (req.url === "/api" && req.method === "GET") {
    try {
      const client = new MongoClient(uri);
      await client.connect();

      const jobs = await client
        .db("Tech-Carrer")
        .collection("jobs")
        .find({})
        .toArray();

      await client.close();

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(jobs));
    } catch (err) {
      console.error(err);
      res.writeHead(500);
      res.end(JSON.stringify({ message: "Failed to fetch jobs" }));
    }
  }

  // ================= ADD BOOKMARK =================
  else if (req.url === "/api/bookmarks" && req.method === "POST") {
    let body = "";

    req.on("data", chunk => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      try {
        const job = JSON.parse(body);

        if (!job.job_id) {
          res.writeHead(400);
          return res.end(
            JSON.stringify({ message: "job_id is required" })
          );
        }

        const client = new MongoClient(uri);
        await client.connect();

        const db = client.db("Tech-Carrer");
        const collection = db.collection("bookmarks");

        // Prevent duplicates
        const exists = await collection.findOne({
          job_id: job.job_id
        });

        if (exists) {
          await client.close();
          res.writeHead(409);
          return res.end(
            JSON.stringify({ message: "Job already bookmarked" })
          );
        }

        await collection.insertOne(job);

        await client.close();

        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Bookmarked successfully" }));
      } catch (err) {
        console.error(err);
        res.writeHead(500);
        res.end(JSON.stringify({ message: "Bookmark failed" }));
      }
    });
  }

  // ================= STATIC FILES =================
  else if (req.url === "/" || req.url === "/index.html") {
    fs.readFile(
      path.join(__dirname, "portfolio", "index.html"),
      (err, content) => {
        if (err) {
          res.writeHead(500);
          return res.end("Internal Server Error");
        }
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(content);
      }
    );
  } else {
    const filePath = path.join(baseDir, req.url);
    const ext = path.extname(filePath);

    const contentType = {
      ".css": "text/css",
      ".js": "application/javascript",
      ".jpg": "image/jpeg",
      ".png": "image/png"
    }[ext];

    if (!contentType) {
      res.writeHead(404);
      return res.end("Not Found");
    }

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(404);
        return res.end("Not Found");
      }
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content);
    });
  }
});

const PORT = process.env.PORT || 5767;
server.listen(PORT, () =>
  console.log(`✅ Server running on port ${PORT}`)
);
