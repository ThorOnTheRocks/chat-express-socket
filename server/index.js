import express from "express";
import { httpLogger } from "../middlewares/logger.js";
import path from "node:path";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { fileURLToPath } from "node:url";
import { db } from "../db/db.js";

const PORT = process.env.PORT ?? 8000;

const app = express();
const server = createServer(app);
const io = new Server(server, {
  connectionStateRecovery: {},
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(httpLogger);
app.use(express.static("client"));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/index.html"));
});

await db.execute(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT,
      user TEXT
    )
  `);

io.on("connection", async (socket) => {
  console.log("User a is connected!");

  socket.on("disconnect", () => {
    console.log("User a is disconnected");
  });

  socket.on("chat message", async (msg) => {
    let result;
    const username = socket.handshake.auth.username ?? "anonymous";
    try {
      result = await db.execute({
        sql: `INSERT INTO messages (content, user) VALUES (:msg, :username)`,
        args: { msg, username },
      });
    } catch (error) {
      console.error(error);
      return;
    }
    io.emit(
      "chat message",
      msg,
      result.lastInsertRowid.toString(),
      username
    );
  });

  console.log("auth ⬇️");
  console.log(socket.handshake.auth);

  if (!socket.recovered) {
    try {
      const results = await db.execute({
        sql: "SELECT id, content, user FROM messages WHERE id > ?",
        args: [socket.handshake.auth.serverOffset ?? 0],
      });

      results.rows.forEach((row) => {
        socket.emit(
          "chat message",
          row.content,
          row.id.toString(),
          row.user
        );
      });
    } catch (error) {
      console.error(error);
      return;
    }
  }
});

server.listen(PORT, () => {
  console.log(`Server is listening on http://localhost:${PORT}`);
});
