const http = require("http");
const path = require("path");
const fs = require("fs");
const { MongoClient, ObjectId } = require("mongodb");

/* ---------------- CONFIG ---------------- */
const uri =
  "mongodb+srv://bbach1_db_user:Bharath@final.ooordpi.mongodb.net/?appName=final";

const baseDir = path.join(__dirname, "portfolio");

/* ---------------- HELPER: READ REQUEST BODY ---------------- */
function getRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => (body += chunk.toString()));
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

/* ---------------- SERVER ---------------- */
const server = http.createServer(async (req, res) => {
  /* ---------- CORS ---------- */
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, DELETE, OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  /* ---------------- GET JOBS ---------------- */
  if (req.url === "/api" && req.method === "GET") {
    try {
      const client = new MongoClient(uri);
      await client.connect();

      const jobs = await client
        .db("Tech-Carrer")
        .collection("jobs")
        .find({})
        .sort({ job_id: 1 })
        .toArray();

      await client.close();

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(jobs));
    } catch (error) {
      console.error("Error fetching jobs:", error);
      res.writeHead(500);
      res.end("Internal Server Error");
    }
  }

  /* ---------------- SAVE BOOKMARK ---------------- */
  else if (req.url === "/api/bookmarks" && req.method === "POST") {
    try {
      const body = await getRequestBody(req);
      const job = JSON.parse(body);

      const client = new MongoClient(uri);
      await client.connect();

      const db = client.db("Tech-Carrer");
      const bookmarks = db.collection("bookmarks");

      const exists = await bookmarks.findOne({
        job_id: job.job_id
      });

      if (exists) {
        await client.close();
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ message: "Already bookmarked" }));
      }

      await bookmarks.insertOne(job);
      await client.close();

      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Bookmark saved" }));
    } catch (error) {
      console.error("Bookmark error:", error);
      res.writeHead(500);
      res.end("Internal Server Error");
    }
  }

  /* ---------------- GET BOOKMARKS ---------------- */
  else if (req.url === "/api/bookmarks" && req.method === "GET") {
    try {
      const client = new MongoClient(uri);
      await client.connect();

      const bookmarks = await client
        .db("Tech-Carrer")
        .collection("bookmarks")
        .find({})
        .toArray();

      await client.close();

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(bookmarks));
    } catch (error) {
      console.error("Error fetching bookmarks:", error);
      res.writeHead(500);
      res.end("Internal Server Error");
    }
  }

  /* ---------------- DELETE BOOKMARK ---------------- */
  else if (req.url.startsWith("/api/bookmarks") && req.method === "DELETE") {
    try {
      const urlObj = new URL(req.url, `http://${req.headers.host}`);
      const id = urlObj.searchParams.get("id");

      const client = new MongoClient(uri);
      await client.connect();

      await client
        .db("Tech-Carrer")
        .collection("bookmarks")
        .deleteOne({ _id: new ObjectId(id) });

      await client.close();

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Bookmark deleted" }));
    } catch (error) {
      console.error("Delete error:", error);
      res.writeHead(500);
      res.end("Internal Server Error");
    }
  }

  /* ---------------- STATIC FILES ---------------- */
  else if (req.url === "/" || req.url === "/index.html") {
    fs.readFile(
      path.join(baseDir, "index.html"),
      (err, content) => {
        if (err) {
          res.writeHead(500);
          return res.end("Internal Server Error");
        }
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(content);
      }
    );
  }

  else {
    const filePath = path.join(baseDir, req.url);
    const ext = path.extname(filePath);

    const contentType = {
      ".css": "text/css",
      ".js": "application/javascript",
      ".jpg": "image/jpeg",
      ".png": "image/png"
    }[ext] || "application/octet-stream";

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(404);
        return res.end("404 - Not Found");
      }
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content);
    });
  }
});

/* ---------------- START SERVER ---------------- */
const PORT = process.env.PORT || 5767;
server.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
