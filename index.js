const http = require("http");
const path = require("path");
const fs = require("fs");
const { MongoClient } = require("mongodb");

const uri =
  "mongodb+srv://bbach1_db_user:Bharath@final.ooordpi.mongodb.net/?appName=final";

const baseDir = path.join(__dirname, "portfolio");

// ---------------- HELPER ----------------
function sendJSON(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end(JSON.stringify(data));
}

// ---------------- SERVER ----------------
const server = http.createServer(async (req, res) => {

  // ✅ CORS PREFLIGHT
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });
    return res.end();
  }

  // ---------------- GET JOBS ----------------
  if (req.method === "GET" && req.url === "/api") {
    try {
      const client = new MongoClient(uri);
      await client.connect();

      const jobs = await client
        .db("Tech-Carrer")
        .collection("jobs")
        .find({})
        .toArray();

      await client.close();
      return sendJSON(res, 200, jobs);

    } catch (err) {
      console.error(err);
      return sendJSON(res, 500, { error: "Failed to fetch jobs" });
    }
  }

  // ---------------- TOGGLE BOOKMARK ----------------
  if (req.method === "POST" && req.url === "/api/bookmarks") {
    let body = "";

    req.on("data", chunk => (body += chunk));

    req.on("end", async () => {
      try {
        const job = JSON.parse(body);

        if (!job.job_id) {
          return sendJSON(res, 400, { error: "job_id is required" });
        }

        const client = new MongoClient(uri);
        await client.connect();

        const collection = client
          .db("Tech-Carrer")
          .collection("bookmarks");

        // 🔍 Check if already bookmarked
        const existing = await collection.findOne({
          job_id: job.job_id
        });

        // ❌ UNBOOKMARK
        if (existing) {
          await collection.deleteOne({ job_id: job.job_id });
          await client.close();

          return sendJSON(res, 200, {
            action: "removed",
            message: "Bookmark removed"
          });
        }

        // ✅ BOOKMARK
        await collection.insertOne({
          ...job,
          bookmarkedAt: new Date()
        });

        await client.close();

        return sendJSON(res, 201, {
          action: "added",
          message: "Bookmarked successfully"
        });

      } catch (err) {
        console.error(err);
        return sendJSON(res, 500, { error: "Bookmark toggle failed" });
      }
    });
    return;
  }

  // ---------------- GET BOOKMARKS ----------------
  if (req.method === "GET" && req.url === "/api/bookmarks") {
    try {
      const client = new MongoClient(uri);
      await client.connect();

      const bookmarks = await client
        .db("Tech-Carrer")
        .collection("bookmarks")
        .find({})
        .toArray();

      await client.close();
      return sendJSON(res, 200, bookmarks);

    } catch (err) {
      console.error(err);
      return sendJSON(res, 500, { error: "Failed to load bookmarks" });
    }
  }

  // ---------------- STATIC FILES ----------------
  if (req.method === "GET") {
    const filePath =
      req.url === "/"
        ? path.join(baseDir, "index.html")
        : path.join(baseDir, req.url);

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(404);
        return res.end("Not Found");
      }
      res.writeHead(200);
      res.end(content);
    });
    return;
  }

  res.writeHead(404);
  res.end("Not Found");
});

// ---------------- START ----------------
const PORT = process.env.PORT || 5767;
server.listen(PORT, () => {
  console.log("✅ Server running on port", PORT);
});
