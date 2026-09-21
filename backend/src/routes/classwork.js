const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// --- Uploads: worksheet attachments (therapist) and submission proof (parent) ---
const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads", "classwork");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
]);
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).slice(0, 10);
      cb(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`);
    },
  }),
  limits: { fileSize: MAX_FILE_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error("Only images or PDF files are accepted"));
    }
    cb(null, true);
  },
});

function fileUrl(filename) {
  return filename ? `/api/uploads/classwork/${filename}` : null;
}

function present(row) {
  return {
    id: row.id,
    client_id: row.client_id,
    client_name: row.client_name,
    therapist_id: row.therapist_id,
    therapist_name: row.therapist_name,
    title: row.title,
    instructions: row.instructions,
    category: row.category,
    due_date: row.due_date,
    points_possible: row.points_possible,
    attachment_name: row.attachment_original_name,
    attachment_url: fileUrl(row.attachment_filename),
    status: row.status,
    submission_note: row.submission_note,
    submission_name: row.submission_original_name,
    submission_url: fileUrl(row.submission_filename),
    submitted_at: row.submitted_at,
    points_earned: row.points_earned,
    feedback: row.feedback,
    graded_at: row.graded_at,
    created_at: row.created_at,
  };
}

const SELECT_BASE = `
  SELECT cw.*, c.name AS client_name, t.name AS therapist_name
  FROM classwork cw
  JOIN clients c ON c.id = cw.client_id
  JOIN therapists t ON t.id = cw.therapist_id
`;

function getClient(clientId) {
  return db.prepare("SELECT * FROM clients WHERE id = ?").get(clientId);
}

function canManageClient(user, client) {
  return (
    client &&
    (user.role === "admin" ||
      (user.role === "therapist" && Number(client.therapist_id) === Number(user.therapist_id)))
  );
}

// --- Parent: their own child's classwork ---
router.get("/me", requireAuth, requireRole("parent"), (req, res) => {
  const client = db.prepare("SELECT id FROM clients WHERE user_id = ? ORDER BY id ASC LIMIT 1").get(req.user.id);
  if (!client) return res.status(404).json({ error: "No patient profile is linked to this account" });

  const rows = db
    .prepare(SELECT_BASE + " WHERE cw.client_id = ? ORDER BY cw.status = 'graded', cw.due_date IS NULL, cw.due_date ASC, cw.id DESC")
    .all(client.id);
  res.json(rows.map(present));
});

// Parent marks an assignment done - optional note and/or a photo/file of the completed work.
router.post(
  "/me/:id/submit",
  requireAuth,
  requireRole("parent"),
  upload.single("file"),
  (req, res) => {
    const client = db.prepare("SELECT id FROM clients WHERE user_id = ? ORDER BY id ASC LIMIT 1").get(req.user.id);
    if (!client) return res.status(404).json({ error: "No patient profile is linked to this account" });

    const item = db.prepare("SELECT * FROM classwork WHERE id = ?").get(req.params.id);
    if (!item || item.client_id !== client.id) {
      return res.status(404).json({ error: "Classwork not found" });
    }
    if (item.status !== "assigned") {
      return res.status(400).json({ error: "This has already been marked done" });
    }

    const note = typeof req.body?.note === "string" ? req.body.note.trim().slice(0, 1000) : "";
    const file = req.file;

    db.prepare(
      `UPDATE classwork
       SET status = 'submitted', submission_note = ?, submission_filename = ?,
           submission_original_name = ?, submission_mime_type = ?, submitted_at = datetime('now')
       WHERE id = ?`
    ).run(
      note || null,
      file ? file.filename : null,
      file ? file.originalname : null,
      file ? file.mimetype : null,
      item.id
    );

    res.json(present(db.prepare(SELECT_BASE + " WHERE cw.id = ?").get(item.id)));
  }
);

// --- Admin/therapist: classwork for one client on their caseload ---
router.get("/clients/:clientId", requireAuth, (req, res) => {
  const client = getClient(req.params.clientId);
  if (!client) return res.status(404).json({ error: "Client not found" });

  const allowed =
    req.user.role === "admin" ||
    (req.user.role === "therapist" && Number(client.therapist_id) === Number(req.user.therapist_id)) ||
    (req.user.role === "parent" && Number(client.user_id) === Number(req.user.id));
  if (!allowed) return res.status(403).json({ error: "Forbidden" });

  const rows = db
    .prepare(SELECT_BASE + " WHERE cw.client_id = ? ORDER BY cw.id DESC")
    .all(client.id);
  res.json(rows.map(present));
});

router.post(
  "/clients/:clientId",
  requireAuth,
  requireRole("admin", "therapist"),
  upload.single("file"),
  (req, res) => {
    const client = getClient(req.params.clientId);
    if (!canManageClient(req.user, client)) return res.status(403).json({ error: "Forbidden" });

    const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
    const instructions = typeof req.body?.instructions === "string" ? req.body.instructions.trim() : "";
    const category = typeof req.body?.category === "string" && req.body.category.trim()
      ? req.body.category.trim()
      : client.service_type;
    const dueDate = typeof req.body?.due_date === "string" && req.body.due_date ? req.body.due_date : null;
    const pointsPossible = Number(req.body?.points_possible);

    if (!title) return res.status(400).json({ error: "A title is required" });
    if (title.length > 150 || instructions.length > 3000) {
      return res.status(400).json({ error: "Title or instructions are too long" });
    }
    if (!Number.isInteger(pointsPossible) || pointsPossible < 0 || pointsPossible > 1000) {
      return res.status(400).json({ error: "Points possible must be a whole number between 0 and 1000" });
    }

    const therapistId = req.user.role === "therapist" ? req.user.therapist_id : client.therapist_id;
    if (!therapistId) return res.status(400).json({ error: "Assign a therapist to this client first" });

    const file = req.file;
    const info = db
      .prepare(
        `INSERT INTO classwork
           (client_id, therapist_id, title, instructions, category, due_date, points_possible,
            attachment_filename, attachment_original_name, attachment_mime_type, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        client.id,
        therapistId,
        title,
        instructions || null,
        category,
        dueDate,
        pointsPossible,
        file ? file.filename : null,
        file ? file.originalname : null,
        file ? file.mimetype : null,
        req.user.id
      );

    res.status(201).json(present(db.prepare(SELECT_BASE + " WHERE cw.id = ?").get(info.lastInsertRowid)));
  }
);

// Grade a submitted assignment.
router.post("/:id/grade", requireAuth, requireRole("admin", "therapist"), (req, res) => {
  const item = db.prepare("SELECT * FROM classwork WHERE id = ?").get(req.params.id);
  if (!item) return res.status(404).json({ error: "Classwork not found" });

  const client = getClient(item.client_id);
  if (!canManageClient(req.user, client)) return res.status(403).json({ error: "Forbidden" });
  if (item.status === "assigned") {
    return res.status(400).json({ error: "The family hasn't marked this done yet" });
  }

  const pointsEarned = Number(req.body?.points_earned);
  const feedback = typeof req.body?.feedback === "string" ? req.body.feedback.trim().slice(0, 2000) : "";

  if (!Number.isInteger(pointsEarned) || pointsEarned < 0 || pointsEarned > item.points_possible) {
    return res.status(400).json({ error: `Points must be a whole number between 0 and ${item.points_possible}` });
  }

  db.prepare(
    `UPDATE classwork SET status = 'graded', points_earned = ?, feedback = ?, graded_at = datetime('now')
     WHERE id = ?`
  ).run(pointsEarned, feedback || null, item.id);

  res.json(present(db.prepare(SELECT_BASE + " WHERE cw.id = ?").get(item.id)));
});

// Friendly error for rejected uploads (wrong type / too large) instead of a raw 500.
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err) {
    return res.status(400).json({ error: err.message || "Upload failed" });
  }
  next();
});

module.exports = router;
