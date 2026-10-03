const express = require("express");
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const { requireAuth, requireRole } = require("../middleware/auth");
const automationRoutes = require("./automation");

const router = express.Router();
const LOGO_PATH = path.join(__dirname, "..", "assets", "therafun-logo.png");

const INK = "#1F2937";
const MIST = "#6B7280";
const HARBOR = "#146B6B";
const SUNRISE = "#FF7A59";
const LINE = "#E5E7EB";

function formatDateTime(iso) {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", { dateStyle: "medium" });
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString("en-US", { timeStyle: "short" });
}

// Draws the shared letterhead (logo + title block) used on every report
// page, so the PDF always reads as an official TheraFun document.
function drawHeader(doc, subtitle) {
  const top = doc.y;
  if (fs.existsSync(LOGO_PATH)) {
    doc.image(LOGO_PATH, 40, top, { height: 48 });
  }
  doc
    .fillColor(INK)
    .font("Helvetica-Bold")
    .fontSize(16)
    .text("TheraFun Intervention Centre", 100, top, { continued: false })
    .font("Helvetica")
    .fontSize(10)
    .fillColor(MIST)
    .text("Balanga City, Bataan", 100, top + 20)
    .fontSize(13)
    .fillColor(HARBOR)
    .font("Helvetica-Bold")
    .text(subtitle, 100, top + 36);

  doc.y = top + 64;
  doc
    .strokeColor(LINE)
    .lineWidth(1)
    .moveTo(40, doc.y)
    .lineTo(555, doc.y)
    .stroke();
  doc.moveDown(1);
}

function sectionTitle(doc, text) {
  doc.moveDown(0.6);
  doc.font("Helvetica-Bold").fontSize(12).fillColor(INK).text(text, 40, doc.y, { width: 515 });
  doc.moveDown(0.3);
}

function statRow(doc, pairs) {
  const startX = 40;
  const colWidth = (555 - 40) / pairs.length;
  const y = doc.y;
  pairs.forEach((pair, index) => {
    const x = startX + index * colWidth;
    doc
      .font("Helvetica-Bold")
      .fontSize(18)
      .fillColor(HARBOR)
      .text(String(pair.value), x, y, { width: colWidth - 10 });
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(MIST)
      .text(pair.label, x, y + 22, { width: colWidth - 10 });
  });
  doc.y = y + 44;
}

function table(doc, headers, rows, colWidths) {
  const startX = 40;
  let y = doc.y;
  doc.font("Helvetica-Bold").fontSize(9).fillColor(MIST);
  let x = startX;
  headers.forEach((header, i) => {
    doc.text(header.toUpperCase(), x, y, { width: colWidths[i] });
    x += colWidths[i];
  });
  y += 14;
  doc
    .strokeColor(LINE)
    .moveTo(startX, y)
    .lineTo(startX + colWidths.reduce((a, b) => a + b, 0), y)
    .stroke();
  y += 6;

  doc.font("Helvetica").fontSize(9.5).fillColor(INK);
  if (rows.length === 0) {
    doc.fillColor(MIST).text("None for this period.", startX, y);
    y += 16;
  } else {
    for (const row of rows) {
      x = startX;
      row.forEach((cell, i) => {
        doc.fillColor(INK).text(String(cell), x, y, { width: colWidths[i] });
        x += colWidths[i];
      });
      y += 16;
    }
  }
  doc.y = y + 6;
}

// Simple horizontal percentage bars - a dependency-free stand-in for a pie
// chart inside a text-flow PDF; still gives an at-a-glance breakdown.
function barList(doc, items, labelKey, color = HARBOR) {
  const startX = 40;
  const barMaxWidth = 220;
  let y = doc.y;
  for (const item of items) {
    doc.font("Helvetica").fontSize(9.5).fillColor(INK).text(`${item[labelKey]}`, startX, y, { width: 150 });
    doc
      .font("Helvetica-Bold")
      .fontSize(9.5)
      .fillColor(MIST)
      .text(`${item.count} (${item.percentage}%)`, startX + 150, y, { width: 90 });
    doc
      .rect(startX + 245, y + 2, barMaxWidth, 7)
      .fillColor(LINE)
      .fill();
    doc
      .rect(startX + 245, y + 2, Math.max(2, (barMaxWidth * item.percentage) / 100), 7)
      .fillColor(color)
      .fill();
    y += 18;
  }
  doc.y = y + 4;
}

function buildReportPdf(res, { period }) {
  const summary = automationRoutes.buildReportSummary();
  const stats = automationRoutes.buildBusinessStats();
  const bucket = period === "weekly" ? summary.weekly : summary.daily;
  const periodLabel = period === "weekly" ? "Weekly Summary Report" : "Daily Summary Report";
  const rangeLabel =
    period === "weekly"
      ? `${formatDate(summary.range.week.start)} - ${formatDate(
          new Date(new Date(summary.range.week.end).getTime() - 86400000).toISOString()
        )}`
      : formatDate(summary.range.today.start);

  const doc = new PDFDocument({ size: "A4", margin: 40 });
  res.setHeader("Content-Type", "application/pdf");
  const stamp = new Date().toISOString().slice(0, 10);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="theraconnect-${period}-report-${stamp}.pdf"`
  );
  doc.pipe(res);

  drawHeader(doc, `${periodLabel} · ${rangeLabel}`);

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(MIST)
    .text(`Generated ${formatDateTime(summary.generated_at)}`, 40, doc.y, { width: 515 });
  doc.moveDown(0.5);

  sectionTitle(doc, period === "weekly" ? "This week at a glance" : "Today at a glance");
  statRow(doc, [
    { label: "Sessions booked", value: bucket.sessions_booked },
    { label: "New enrollments", value: bucket.new_enrollments },
    { label: "Total active clients", value: summary.totals.active_clients },
    { label: "Sessions all-time", value: summary.totals.total_sessions_all_time },
  ]);

  if (period === "weekly") {
    sectionTitle(doc, "New enrollments this week");
    table(
      doc,
      ["Patient", "Treatment", "Status", "Date"],
      bucket.new_enrollment_list.map((c) => [c.name, c.service_type, c.status, formatDate(c.created_at)]),
      [180, 160, 90, 85]
    );
  } else {
    sectionTitle(doc, "Today's sessions");
    table(
      doc,
      ["Time", "Patient", "Therapist", "Status"],
      bucket.sessions.map((s) => [
        `${formatTime(s.start_time)}`,
        s.client_name,
        s.therapist_name,
        s.status,
      ]),
      [90, 170, 170, 85]
    );
  }

  sectionTitle(doc, "Business & growth snapshot");
  statRow(doc, [
    { label: "Enrollment growth (MoM)", value: `${stats.enrollment_growth_rate_pct}%` },
    {
      label: "Attendance rate",
      value: stats.attendance_rate_pct === null ? "N/A" : `${stats.attendance_rate_pct}%`,
    },
    { label: "Active therapists", value: stats.totals.active_therapists },
    { label: "Total clients", value: stats.totals.total_clients },
  ]);

  doc.moveDown(0.4);
  doc.font("Helvetica-Bold").fontSize(10).fillColor(INK).text("Clients by treatment type", 40, doc.y, { width: 515 });
  doc.moveDown(0.2);
  barList(doc, stats.clients_by_service, "service_type", HARBOR);

  doc.moveDown(0.2);
  doc.font("Helvetica-Bold").fontSize(10).fillColor(INK).text("Sessions by status", 40, doc.y, { width: 515 });
  doc.moveDown(0.2);
  barList(
    doc,
    stats.sessions_by_status.map((s) => ({ ...s, service_type: s.status })),
    "service_type",
    SUNRISE
  );

  doc
    .fontSize(8)
    .fillColor(MIST)
    .text(
      "TheraConnect · Automated report - figures reflect the database at the moment of generation.",
      40,
      800,
      { width: 515, align: "center" }
    );

  doc.end();
}

// PDF export of the daily/weekly operations + growth summary, with the
// TheraFun letterhead - the "convertible report as PDF" the clinic asked
// for, built from the exact same numbers as the on-screen dashboard.
router.get("/summary.pdf", requireAuth, requireRole("admin"), (req, res) => {
  const period = req.query.period === "weekly" ? "weekly" : "daily";
  try {
    buildReportPdf(res, { period });
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ error: "Couldn't generate the report PDF" });
    } else {
      res.end();
    }
    throw error;
  }
});

module.exports = router;
