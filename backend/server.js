const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();
console.log("[DEBUG] EMAIL_USER:", process.env.EMAIL_USER);
console.log("[DEBUG] EMAIL_PASS:", process.env.EMAIL_PASS ? "Loaded ✔️" : "Missing ❌");
console.log("[DEBUG] SUPABASE_URL:", process.env.SUPABASE_URL);
console.log("[DEBUG] SUPABASE_KEY:", process.env.SUPABASE_KEY ? "Loaded ✔️" : "Missing ❌");

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.url} - Body:`, req.body);
  next();
});

const PORT = process.env.PORT || 3000;

function debugLog(label, data) {
  console.log(`\n--- DEBUG: ${label} ---`);
  console.log(data);
  console.log("------------------------\n");
}

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});

const nodemailer = require("nodemailer");
const supabase = require("./supabaseClient");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify((err, success) => {
  if (err) {
    console.error("[ERROR] Transporter verification failed:", err);
  } else {
    console.log("[DEBUG] Nodemailer transporter verified:", success);
  }
});

app.post("/send-otp", async (req, res) => {
  console.log("[DEBUG] /send-otp endpoint hit");
  const { email } = req.body;
  debugLog("Received OTP Request", req.body);

  if (!email || !email.endsWith("@dtu.ac.in")) {
    return res.status(400).json({ message: "Invalid DTU email address." });
  }

  const otp = Math.floor(100000 + Math.random() * 900000);
  const expiresAt = Date.now() + 5 * 60 * 1000;

  const mailOptions = {
    from: `"DTU Hostel Voting" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your OTP for Hostel Voting",
    text: `Your OTP is: ${otp}. It is valid for 5 minutes.`,
  };

  try {
    const emailResult = await transporter.sendMail(mailOptions);
    debugLog("Email Sent Result", emailResult);

    const { data: existingOtp } = await supabase
      .from("otp_verification")
      .select("has_voted")
      .eq("email", email)
      .single();

    const hasVoted = existingOtp?.has_voted === true;

    const { data, error } = await supabase.from("otp_verification").upsert(
      {
        email,
        otp: otp.toString(),
        expires_at: new Date(expiresAt),
        has_voted: hasVoted,
      },
      { onConflict: ["email"] }
    ).select();
    
    debugLog("OTP Stored in Supabase", { data, error });

    if (error) {
        throw error;
    }

    res.json({ message: "OTP sent successfully." });
  } catch (error) {
    debugLog("Error sending OTP", error);
    res.status(500).json({ message: "Failed to send OTP." });
  }
});

app.post("/submit-vote", async (req, res) => {
  // ✅ CHANGE: Destructure 'ballot' instead of 'candidate'
  const { name, email, room, otp, ballot } = req.body;
  debugLog("Vote Submission Request", req.body);

  // ✅ CHANGE: Updated validation to check for a complete ballot
  if (!name || !email || !room || !otp || !ballot || Object.keys(ballot).length < 10) {
    return res.status(400).json({ message: "All fields and all 10 votes are required." });
  }

  try {
    const { data, error } = await supabase
      .from("otp_verification")
      .select("*")
      .eq("email", email)
      .single();
    debugLog("OTP Retrieved from DB", { data, error });

    const trimmedOtp = otp.trim();

    if (
      error ||
      !data ||
      data.otp != trimmedOtp ||
      Date.now() > new Date(data.expires_at).getTime()
    ) {
      return res.status(401).json({ message: "Invalid or expired OTP." });
    }

    if (data.has_voted) {
      return res.status(403).json({ message: "You have already voted." });
    }
    
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    debugLog("Client IP", ip);

    const { data: existingVotes, error: ipError } = await supabase
      .from("votes")
      .select("id")
      .eq("ip", ip);
      
    if (ipError) return res.status(500).json({ message: "Error checking IP address." });
    if (existingVotes.length > 0) return res.status(403).json({ message: "Vote already submitted from this IP address." });

    // ✅ CHANGE: Insert the 'ballot' object into the database
    const { error: voteError } = await supabase
      .from("votes")
      .insert([{ name, email, room, ip, ballot }]);
    debugLog("Vote Insert Result", voteError || "Success");

    if (voteError) {
      return res.status(500).json({ message: "Vote submission failed." });
    }

    const { data: updateData, error: updateError } = await supabase
      .from("otp_verification")
      .update({ has_voted: true })
      .eq("email", email)
      .select();
    
    debugLog("OTP has_voted Updated", { data: updateData, error: updateError });

    res.json({ message: "Vote submitted successfully!" });
  } catch (err) {
    debugLog("Server Error during Vote Submission", err);
    res.status(500).json({ message: "Internal server error." });
  }
});

app.get("/admin-votes", async (req, res) => {
  try {
    // ✅ CHANGE: Select the 'ballot' column instead of 'candidate'
    const { data, error } = await supabase
      .from("votes")
      .select("ballot");

    console.log("--- DEBUG: Raw Ballots ---");
    console.log("DATA:", data);
    console.log("ERROR:", error);
    console.log("-------------------------");

    if (error) {
      return res.status(500).json({ error: "Failed to fetch vote data.", details: error.message });
    }

    // ✅ CHANGE: New aggregation logic for multiple positions
    const resultsByPosition = {};

    for (const vote of data) {
      const ballot = vote.ballot;
      for (const position in ballot) {
        const candidate = ballot[position];
        if (!candidate) continue;

        if (!resultsByPosition[position]) {
          resultsByPosition[position] = {};
        }
        if (!resultsByPosition[position][candidate]) {
          resultsByPosition[position][candidate] = 0;
        }
        resultsByPosition[position][candidate]++;
      }
    }
    
    const formattedResults = {};
    for (const position in resultsByPosition) {
        formattedResults[position] = Object.entries(resultsByPosition[position]).map(
            ([candidate, count]) => ({ candidate, count })
        );
    }
    
    res.json(formattedResults);
  } catch (err) {
    console.error("Admin vote fetch failed:", err);
    res.status(500).json({ error: "Unexpected error fetching votes." });
  }
});


app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Unexpected server error." });
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("[UNHANDLED REJECTION]", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[UNCAUGHT EXCEPTION]", err);
});