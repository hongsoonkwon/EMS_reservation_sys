const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = process.env.PORT || 4000;
const DB_PATH = path.join(__dirname, "ems.db");

app.use(cors());
app.use(express.json());

// ●─────────────── DB ───────────────●
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) console.error("DB open error:", err);
    else console.log("EMS DB opened:", DB_PATH);
});

db.serialize(() => {
    db.run("PRAGMA foreign_keys = ON");

    // 관리자 계정
    db.run(`
        CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL,                -- master/admin/user
            parent_admin_id INTEGER,
            created_at TEXT NOT NULL,
            FOREIGN KEY(parent_admin_id) REFERENCES admins(id) ON DELETE CASCADE
        )
    `);

    // 예약 테이블
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

    // MASTER 기본 계정
    db.run(`
        INSERT OR IGNORE INTO admins(id, username, password, role, created_at)
        VALUES (1, 'master', 'master1234', 'master', datetime('now'))
    `);
});

// ●────────────── utility ──────────────●
function generateIsoId() {
    const iso = new Date().toISOString().replace(/[:.]/g, "-");
    const rand = Math.random().toString(36).slice(2, 8);
    return `${iso}--${rand}`;
}

// ●────────────── AUTH MIDDLEWARE ──────────────●
app.use((req, res, next) => {
    const adminHeader = req.headers["x-admin"];
    if (adminHeader) {
        try {
            req.admin = JSON.parse(adminHeader); // {id, username, role}
        } catch (_) { }
    }
    next();
});

function requireRole(roles) {
    return (req, res, next) => {
        if (!req.admin)
            return res.status(401).json({ message: "로그인이 필요합니다." });

        if (!roles.includes(req.admin.role))
            return res.status(403).json({ message: "권한이 없습니다." });

        next();
    };
}

// ●────────────── AUTH API ──────────────●
app.post("/auth/login", (req, res) => {
    const { username, password } = req.body ?? {};

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

// ●────────────── ADMIN & USER 생성 ──────────────●

// MASTER → ADMIN 생성
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
            if (err) return res.status(500).json({ message: "DB 오류" });

            res.json({ ok: true, admin: { id: this.lastID, username, role: "admin" } });
        }
    );
});

// MASTER or ADMIN → USER 생성
app.post("/admins/create-user", requireRole(["master", "admin"]), (req, res) => {
    const { username, password } = req.body;
    const now = new Date().toISOString();

    db.run(
        `
        INSERT INTO admins (username, password, role, parent_admin_id, created_at)
        VALUES (?, ?, 'user', ?, ?)
        `,
        [username, password, req.admin.id, now],
        function (err) {
            if (err) return res.status(500).json({ message: "DB 오류" });
            res.json({ ok: true, user: { id: this.lastID, username, role: "user" } });
        }
    );
});

// ●────────────── 계정 목록 조회 ──────────────●
app.get("/admins", requireRole(["master", "admin"]), (req, res) => {
    const role = req.query.role;

    db.all(
        `SELECT id, username, role FROM admins WHERE role = ? ORDER BY id ASC`,
        [role],
        (err, rows) => {
            if (err) return res.status(500).json({ message: "DB 오류" });
            res.json({ admins: rows });
        }
    );
});

// ●────────────── ADMIN 삭제 (CASCADE 적용됨) ──────────────●
app.delete("/admins/:id", requireRole(["master"]), (req, res) => {
    db.run(`DELETE FROM admins WHERE id = ?`, [req.params.id], function (err) {
        if (err) return res.status(500).json({ message: "DB 오류" });
        res.json({ ok: true });
    });
});

// ●────────────── RESERVATION 조회 ──────────────●
app.get("/reservations", requireRole(["master", "admin", "user"]), (req, res) => {
    const admin = req.admin;

    if (admin.role === "master") {
        db.all(`SELECT * FROM reservations ORDER BY date ASC, time ASC`, [], (_err, rows) =>
            res.json({ reservations: rows })
        );
        return;
    }

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
});

// ●────────────── 예약 생성 ──────────────●
app.post("/reservations", requireRole(["master", "admin"]), (req, res) => {
    const { name, phone, from, to, date, time, notes = "" } = req.body;

    const id = generateIsoId();
    const createdAt = new Date().toISOString();
    const createdBy = req.admin.id;

    db.run(
        `
        INSERT INTO reservations (id, name, phone, "from", "to", date, time, notes, createdBy, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [id, name, phone, from, to, date, time, notes, createdBy, createdAt],
        (err) => {
            if (err) return res.status(500).json({ message: "DB 오류" });
            res.json({ reservation: { id, name, phone, from, to, date, time, notes, createdBy, createdAt } });
        }
    );
});

// ●────────────── 예약 수정 ──────────────●
app.put("/reservations/:id", requireRole(["master", "admin"]), (req, res) => {
    const { id } = req.params;
    const { name, phone, from, to, date, time, notes } = req.body;

    db.get(`SELECT * FROM reservations WHERE id = ?`, [id], (err, row) => {
        if (!row) return res.status(404).json({ message: "예약 없음" });

        db.run(
            `
            UPDATE reservations SET
                name=?, phone=?, "from"=?, "to"=?, date=?, time=?, notes=?
            WHERE id=?
            `,
            [
                name ?? row.name,
                phone ?? row.phone,
                from ?? row.from,
                to ?? row.to,
                date ?? row.date,
                time ?? row.time,
                notes ?? row.notes,
                id,
            ],
            () => res.json({ reservation: { ...row, name, phone, from, to, date, time, notes } })
        );
    });
});

// ●────────────── 예약 삭제 ──────────────●
app.delete("/reservations/:id", requireRole(["master", "admin"]), (req, res) => {
    db.run(`DELETE FROM reservations WHERE id=?`, [req.params.id], () =>
        res.json({ ok: true })
    );
});

// ●────────────── Start Server ──────────────●
app.listen(PORT, () => {
    console.log(`EMS server running at http://localhost:${PORT}`);
});
