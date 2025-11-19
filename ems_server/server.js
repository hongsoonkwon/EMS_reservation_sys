// server.js
const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = process.env.PORT || 4000;
const DB_PATH = path.join(__dirname, "ems.db");

// ---------------- CORS ----------------
app.use(
    cors({
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"],
        allowedHeaders: ["Content-Type", "x-admin"],
    })
);

// ---------------- Body Parser ----------------
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

// ---------------- Request Logging ----------------
app.use((req, res, next) => {
    console.log(`[REQ] ${req.method} ${req.url}`, "BODY:", req.body);
    console.log("  headers.x-admin:", req.headers["x-admin"]);
    next();
});

// ---------------- DB ----------------
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) console.error("DB open error:", err);
    else console.log("EMS DB opened:", DB_PATH);
});

db.serialize(() => {
    db.run("PRAGMA foreign_keys = ON");

    db.run(`
        CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL,
            parent_admin_id INTEGER,
            created_at TEXT NOT NULL,
            FOREIGN KEY(parent_admin_id) REFERENCES admins(id) ON DELETE CASCADE
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS reservations (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            phone TEXT NOT NULL,
            "from" TEXT NOT NULL,
            "to" TEXT NOT NULL,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            notes TEXT DEFAULT '',
            createdBy INTEGER,
            createdAt TEXT NOT NULL,
            FOREIGN KEY(createdBy) REFERENCES admins(id) ON DELETE CASCADE
        )
    `);

    db.run(`
        INSERT OR IGNORE INTO admins(id, username, password, role, created_at)
        VALUES (1, 'master', 'master1234', 'master', datetime('now'))
    `);
});

// ---------------- Utility ----------------
function generateIsoId() {
    const iso = new Date().toISOString().replace(/[:.]/g, "-");
    const rand = Math.random().toString(36).slice(2, 8);
    return `${iso}--${rand}`;
}

// ---------------- Auth Middleware ----------------
app.use((req, res, next) => {
    const raw = req.headers["x-admin"];
    console.log("Auth middleware raw x-admin:", raw);

    req.admin = null;

    if (!raw) {
        return next();
    }

    try {
        if (typeof raw === "string") {
            const parsed = JSON.parse(raw);
            console.log("parsed admin:", parsed);
            req.admin = parsed;
        } else {
            console.log("x-admin not string, using as-is:", raw);
            req.admin = raw;
        }
    } catch (e) {
        console.error("x-admin parse error:", e);
        req.admin = null;
    }

    next();
});

function requireRole(roles) {
    return (req, res, next) => {
        console.log("requireRole", roles, "current admin:", req.admin);

        if (!req.admin) {
            return res.status(401).json({ message: "로그인이 필요합니다." });
        }

        if (!roles.includes(req.admin.role)) {
            return res.status(403).json({ message: "권한이 없습니다." });
        }

        next();
    };
}

// ---------------- Auth API ----------------
app.post("/auth/login", (req, res) => {
    const { username, password } = req.body ?? {};
    console.log("=== LOGIN REQUEST RECEIVED ===");
    console.log("HEADERS:", req.headers);
    console.log("BODY:", req.body);

    if (!username || !password) {
        console.log("⚠️ 로그인 요청 실패: 바디 없음 →", req.body);
        return res.status(400).json({ message: "잘못된 요청" });
    }

    db.get(
        `SELECT id, username, role FROM admins WHERE username = ? AND password = ?`,
        [username, password],
        (err, row) => {
            if (err) return res.status(500).json({ message: "DB 오류" });
            if (!row)
                return res.status(401).json({ message: "아이디 또는 비밀번호 오류" });

            res.json({ admin: row });
        }
    );
});

// ---------------- Admin / User Creation ----------------
// master → admin 생성
app.post("/admins/create-admin", requireRole(["master"]), (req, res) => {
    const { username, password } = req.body;
    const now = new Date().toISOString();

    db.run(
        `
        INSERT INTO admins (username, password, role, parent_admin_id, created_at)
        VALUES (?, ?, 'admin', 1, ?)
        `,
        [username, password, now],
        function (err) {
            if (err) {
                console.error("create-admin DB error:", err);
                return res.status(500).json({ message: "DB 오류" });
            }
            res.json({
                ok: true,
                admin: { id: this.lastID, username, role: "admin" },
            });
        }
    );
});

// master, admin → user 생성
app.post("/admins/create-user", requireRole(["master", "admin"]), (req, res) => {
    console.log("POST /admins/create-user by", req.admin, "body:", req.body);

    const { username, password } = req.body;
    const now = new Date().toISOString();

    if (!username || !password) {
        return res
            .status(400)
            .json({ message: "username과 password를 모두 입력해야 합니다." });
    }

    const parentId = req.admin.id; // master든 admin이든 자기 id

    db.run(
        `
        INSERT INTO admins (username, password, role, parent_admin_id, created_at)
        VALUES (?, ?, 'user', ?, ?)
        `,
        [username, password, parentId, now],
        function (err) {
            if (err) {
                console.error("create-user DB error:", err);
                return res.status(500).json({ message: "DB 오류" });
            }
            res.json({
                ok: true,
                user: {
                    id: this.lastID,
                    username,
                    role: "user",
                    parent_admin_id: parentId,
                },
            });
        }
    );
});

// ---------------- List Admins / Users ----------------
app.get("/admins", requireRole(["master", "admin"]), (req, res) => {
    const role = req.query.role;
    console.log("GET /admins by", req.admin, "query.role:", role);

    if (!role) {
        return res.status(400).json({ message: "role 파라미터가 필요합니다." });
    }

    // master: 주어진 role 전체 조회
    if (req.admin.role === "master") {
        db.all(
            `SELECT id, username, role, parent_admin_id FROM admins WHERE role = ? ORDER BY id ASC`,
            [role],
            (err, rows) => {
                if (err) {
                    console.error("GET /admins master DB error:", err);
                    return res.status(500).json({ message: "DB 오류" });
                }
                res.json({ admins: rows });
            }
        );
        return;
    }

    // admin: 자기 밑의 user만 조회 (role=user만 허용)
    if (req.admin.role === "admin") {
        if (role !== "user") {
            return res
                .status(403)
                .json({ message: "관리자는 user 계정만 조회할 수 있습니다." });
        }

        db.all(
            `
      SELECT id, username, role, parent_admin_id
      FROM admins
      WHERE role = 'user'
        AND parent_admin_id = ?
      ORDER BY id ASC
      `,
            [req.admin.id],
            (err, rows) => {
                if (err) {
                    console.error("GET /admins admin DB error:", err);
                    return res.status(500).json({ message: "DB 오류" });
                }
                res.json({ admins: rows });
            }
        );
    }
});

// ---------------- Delete Admin/User ----------------
// master: 누구나 삭제 가능, admin: 자기 밑 user만 삭제
app.delete("/admins/:id", requireRole(["master", "admin"]), (req, res) => {
    const targetId = req.params.id;
    const current = req.admin;

    if (current.role === "master") {
        db.run(`DELETE FROM admins WHERE id = ?`, [targetId], function (err) {
            if (err) return res.status(500).json({ message: "DB 오류" });
            return res.json({ ok: true });
        });
        return;
    }

    if (current.role === "admin") {
        db.run(
            `
      DELETE FROM admins
      WHERE id = ?
        AND role = 'user'
        AND parent_admin_id = ?
      `,
            [targetId, current.id],
            function (err) {
                if (err) return res.status(500).json({ message: "DB 오류" });

                if (this.changes === 0) {
                    return res
                        .status(403)
                        .json({ message: "삭제 권한이 없거나, 계정이 존재하지 않습니다." });
                }

                return res.json({ ok: true });
            }
        );
    }
});

// ---------------- Reservations ----------------
// 조회: master/admin/user 모두 가능, 범위만 다름
app.get(
    "/reservations",
    requireRole(["master", "admin", "user"]),
    (req, res) => {
        const admin = req.admin;

        // master: 전체 조회
        if (admin.role === "master") {
            db.all(
                `SELECT * FROM reservations ORDER BY date ASC, time ASC`,
                [],
                (_err, rows) => res.json({ reservations: rows })
            );
            return;
        }

        // admin: 자기 + 자기 밑 user들이 만든 예약
        if (admin.role === "admin") {
            db.all(
                `
            SELECT * FROM reservations
            WHERE createdBy = ?
               OR createdBy IN (SELECT id FROM admins WHERE parent_admin_id = ?)
            ORDER BY date ASC, time ASC
            `,
                [admin.id, admin.id],
                (_err, rows) => res.json({ reservations: rows })
            );
            return;
        }

        // user: 자기 + 상위 admin 이 만든 예약
        if (admin.role === "user") {
            db.get(
                `SELECT parent_admin_id FROM admins WHERE id = ?`,
                [admin.id],
                (err, row) => {
                    const parent = row?.parent_admin_id ?? -1;

                    db.all(
                        `
                    SELECT * FROM reservations
                    WHERE createdBy = ?
                       OR createdBy = ?
                    ORDER BY date ASC, time ASC
                    `,
                        [admin.id, parent],
                        (_err2, rows) => res.json({ reservations: rows })
                    );
                }
            );
        }
    }
);

// master는 예약 생성/수정/삭제 불가 → admin만 가능

// 예약 생성 (admin만)
app.post("/reservations", requireRole(["admin"]), (req, res) => {
    const { name, phone, from, to, date, time, notes = "" } = req.body;

    if (!name || !phone || !from || !to || !date || !time) {
        return res
            .status(400)
            .json({ message: "name, phone, from, to, date, time 은 필수입니다." });
    }

    const id = generateIsoId();
    const createdAt = new Date().toISOString();
    const createdBy = req.admin.id; // admin id

    db.run(
        `
        INSERT INTO reservations (id, name, phone, "from", "to", date, time, notes, createdBy, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [id, name, phone, from, to, date, time, notes, createdBy, createdAt],
        (err) => {
            if (err) {
                console.error("CREATE reservation DB error:", err);
                return res.status(500).json({ message: "DB 오류" });
            }
            res.json({
                reservation: {
                    id,
                    name,
                    phone,
                    from,
                    to,
                    date,
                    time,
                    notes,
                    createdBy,
                    createdAt,
                },
            });
        }
    );
});

// 예약 수정 (admin만)
app.put("/reservations/:id", requireRole(["admin"]), (req, res) => {
    const { id } = req.params;
    const { name, phone, from, to, date, time, notes } = req.body;

    db.get(`SELECT * FROM reservations WHERE id = ?`, [id], (err, row) => {
        if (err) {
            console.error("SELECT reservation error:", err);
            return res.status(500).json({ message: "DB 오류" });
        }

        if (!row) return res.status(404).json({ message: "예약 없음" });

        const newName = name ?? row.name;
        const newPhone = phone ?? row.phone;
        const newFrom = from ?? row.from;
        const newTo = to ?? row.to;
        const newDate = date ?? row.date;
        const newTime = time ?? row.time;
        const newNotes = notes ?? row.notes;

        db.run(
            `
            UPDATE reservations SET
                name=?, phone=?, "from"=?, "to"=?, date=?, time=?, notes=?
            WHERE id=?
            `,
            [newName, newPhone, newFrom, newTo, newDate, newTime, newNotes, id],
            (err2) => {
                if (err2) {
                    console.error("UPDATE reservation error:", err2);
                    return res.status(500).json({ message: "DB 오류" });
                }

                res.json({
                    reservation: {
                        ...row,
                        name: newName,
                        phone: newPhone,
                        from: newFrom,
                        to: newTo,
                        date: newDate,
                        time: newTime,
                        notes: newNotes,
                    },
                });
            }
        );
    });
});

// 예약 삭제 (admin만)
app.delete("/reservations/:id", requireRole(["admin"]), (req, res) => {
    const id = req.params.id;

    db.run(`DELETE FROM reservations WHERE id=?`, [id], function (err) {
        if (err) {
            console.error("DELETE reservation error:", err);
            return res.status(500).json({ message: "DB 오류" });
        }
        res.json({ ok: true });
    });
});

// ---------------- Server Start ----------------
app.listen(PORT, "0.0.0.0", () => {
    console.log(`EMS server running on port ${PORT}`);
});
