// server.js
const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = process.env.PORT || 4000;
const DB_PATH = path.join(__dirname, "ems.db");

// --------- 공통 미들웨어 ---------
app.use(cors());
app.use(express.json());

// --------- SQLite 초기화 ---------
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("Failed to open SQLite DB:", err);
  } else {
    console.log("SQLite DB opened at", DB_PATH);
  }
});

db.serialize(() => {
  db.run("PRAGMA foreign_keys = ON");

  // 관리자 테이블
  db.run(
    `
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at TEXT NOT NULL
    )
  `,
    (err) => {
      if (err) console.error("CREATE TABLE admins error:", err);
      else console.log("admins table ready");
    }
  );

  // 🔥 예약 테이블 (date = datetime TEXT)
  db.run(
    `
    CREATE TABLE IF NOT EXISTS reservations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      "from" TEXT NOT NULL,
      "to" TEXT NOT NULL,
      date TEXT NOT NULL,   -- 'YYYY-MM-DD HH:mm'
      notes TEXT DEFAULT '',
      createdAt TEXT NOT NULL
    )
  `,
    (err) => {
      if (err) console.error("CREATE TABLE reservations error:", err);
      else console.log("reservations table ready");
    }
  );

  // 기본 관리자 계정
  const now = new Date().toISOString();
  db.run(
    `
    INSERT OR IGNORE INTO admins (id, username, password, role, created_at)
    VALUES (1, 'master', 'master1234', 'master', ?)
  `,
    [now],
    (err) => {
      if (err) console.error("INSERT default admin error:", err);
      else console.log("default master admin ready");
    }
  );
});

// --------- 헬스 체크 ---------
app.get("/", (req, res) => {
  res.send("EMS local server is running ✅");
});

app.get("/health", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// --------- 로그인 ---------
app.post("/auth/login", (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({
      message: "username과 password를 모두 보내야 합니다.",
    });
  }

  db.get(
    `SELECT id, username, role FROM admins WHERE username = ? AND password = ?`,
    [username, password],
    (err, row) => {
      if (err) {
        console.error("login query error:", err);
        return res.status(500).json({ message: "DB 오류" });
      }
      if (!row) {
        return res
          .status(401)
          .json({ message: "아이디 또는 비밀번호가 올바르지 않습니다." });
      }

      res.json({ admin: row });
    }
  );
});

// --------- 유틸 ---------
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// --------- 예약 목록 조회 (🔥 datetime 정렬 ASC) ---------
app.get("/reservations", (req, res) => {
  db.all(
    `SELECT * FROM reservations ORDER BY date ASC, createdAt ASC`,
    (err, rows) => {
      if (err) {
        console.error("GET /reservations error:", err);
        return res.status(500).json({ message: "DB 오류" });
      }
      res.json({ reservations: rows });
    }
  );
});

// --------- 개별 조회 ---------
app.get("/reservations/:id", (req, res) => {
  const { id } = req.params;

  db.get(`SELECT * FROM reservations WHERE id = ?`, [id], (err, row) => {
    if (err) {
      console.error("GET /reservations/:id error:", err);
      return res.status(500).json({ message: "DB 오류" });
    }
    if (!row) {
      return res.status(404).json({ message: "예약을 찾을 수 없습니다." });
    }
    res.json({ reservation: row });
  });
});

// --------- 예약 생성 (🔥 datetime 허용) ---------
app.post("/reservations", (req, res) => {
  const { name, phone, from, to, date, notes = "" } = req.body || {};

  if (!name || !phone || !from || !to || !date) {
    return res.status(400).json({ message: "필수 필드가 비어 있습니다." });
  }

  const id = generateId();
  const createdAt = new Date().toISOString();

  db.run(
    `
    INSERT INTO reservations (id, name, phone, "from", "to", date, notes, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `,
    [id, name, phone, from, to, date, notes, createdAt],
    (err) => {
      if (err) {
        console.error("POST /reservations error:", err);
        return res.status(500).json({ message: "DB 오류" });
      }

      res.status(201).json({
        reservation: { id, name, phone, from, to, date, notes, createdAt },
      });
    }
  );
});

// --------- 예약 수정 (🔥 datetime 포함) ---------
app.put("/reservations/:id", (req, res) => {
  const { id } = req.params;
  const { name, phone, from, to, date, notes } = req.body || {};

  db.get(`SELECT * FROM reservations WHERE id = ?`, [id], (err, row) => {
    if (err) {
      console.error("PUT /reservations/:id select error:", err);
      return res.status(500).json({ message: "DB 오류" });
    }
    if (!row) {
      return res.status(404).json({ message: "예약을 찾을 수 없습니다." });
    }

    const next = {
      name: name ?? row.name,
      phone: phone ?? row.phone,
      from: from ?? row.from,
      to: to ?? row.to,
      date: date ?? row.date, // "YYYY-MM-DD HH:mm"
      notes: notes ?? row.notes,
    };

    db.run(
      `
      UPDATE reservations
      SET name = ?, phone = ?, "from" = ?, "to" = ?, date = ?, notes = ?
      WHERE id = ?
    `,
      [next.name, next.phone, next.from, next.to, next.date, next.notes, id],
      (err2) => {
        if (err2) {
          console.error("PUT /reservations/:id update error:", err2);
          return res.status(500).json({ message: "DB 오류" });
        }
        res.json({ reservation: { ...row, ...next } });
      }
    );
  });
});

// --------- 예약 삭제 ---------
app.delete("/reservations/:id", (req, res) => {
  const { id } = req.params;

  db.run(`DELETE FROM reservations WHERE id = ?`, [id], function (err) {
    if (err) {
      console.error("DELETE /reservations/:id error:", err);
      return res.status(500).json({ message: "DB 오류" });
    }
    if (this.changes === 0) {
      return res.status(404).json({ message: "삭제할 예약을 찾을 수 없습니다." });
    }
    res.json({ ok: true });
  });
});

// --------- 서버 시작 ---------
app.listen(PORT, () => {
  console.log(`EMS local server listening on http://localhost:${PORT}`);
  console.log("DB file:", DB_PATH);
});

process.on("SIGINT", () => {
  console.log("Shutting down server...");
  db.close(() => {
    console.log("SQLite DB closed.");
    process.exit(0);
  });
});
