require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { processHierarchyData } = require("./processor");

const app = express();
const PORT = Number(process.env.PORT) || 8080;

const USER_ID = process.env.USER_ID || "fullname_ddmmyyyy";
const EMAIL_ID = process.env.EMAIL_ID || "your.college@example.edu";
const COLLEGE_ROLL_NUMBER = process.env.COLLEGE_ROLL_NUMBER || "YOUR_ROLL_NUMBER";

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "BFHL hierarchy API",
    endpoint: "POST /bfhl",
  });
});

app.post("/bfhl", (req, res) => {
  const payload = req.body;

  if (!payload || !Array.isArray(payload.data)) {
    return res.status(400).json({
      success: false,
      message: "Invalid request body. Expected: { data: string[] }",
    });
  }

  const { hierarchies, invalidEntries, duplicateEdges, summary } = processHierarchyData(payload.data);

  return res.status(200).json({
    user_id: USER_ID,
    email_id: EMAIL_ID,
    college_roll_number: COLLEGE_ROLL_NUMBER,
    hierarchies,
    invalid_entries: invalidEntries,
    duplicate_edges: duplicateEdges,
    summary,
  });
});

app.use((err, req, res, next) => {
  if (err && err.type === "entity.parse.failed") {
    return res.status(400).json({
      success: false,
      message: "Malformed JSON payload",
    });
  }

  next(err);
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});