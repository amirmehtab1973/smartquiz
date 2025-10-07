// SmartQuiz AI - Glitch-ready backend (combined with frontend folder)
import express from "express";
import multer from "multer";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import fs from "fs";
import pdf from "pdf-parse";
import OpenAI from "openai";
import jwt from "jsonwebtoken";
import path from "path";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
const upload = multer({ dest: "uploads/" });

// Serve frontend static files
const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, "frontend")));

// MongoDB Model
const quizSchema = new mongoose.Schema({
  title: String,
  questions: [
    {
      question: String,
      options: [String],
      correctAnswer: String,
    },
  ],
});
const Quiz = mongoose.model("Quiz", quizSchema);

// OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Connect MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ Mongo error:", err));

// Parse text from PDF (fallback for simple text files as well)
async function extractTextFromFile(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  try {
    const data = await pdf(dataBuffer);
    if (data && data.text && data.text.trim().length>0) return data.text;
  } catch (e) {
    // ignore pdf parse error, try utf8 read
  }
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (e) {
    return "";
  }
}

// Detect MCQs naive
function detectMCQ(text) {
  if (!text) return false;
  const sample = text.slice(0, 5000);
  const patterns = [/\bQ\s*\d/i, /Question\s*\d/i, /\n\s*[A-D][\).]/i, /\(A\)/i];
  return patterns.some((re) => re.test(sample));
}

// Parse MCQs naive
function parseMCQs(text) {
  const lines = text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  const questions = [];
  let i = 0;
  while(i<lines.length){
    const line = lines[i];
    if (/^(?:Q\.?\s*\d+[:.)]?|Question\s*\d+[:.)]?)/i.test(line) || /\?$/.test(line)){
      let q = line.replace(/^(?:Q\.?\s*\d+[:.)]?|Question\s*\d+[:.)]?)/i,'').trim();
      i++;
      const options = [];
      while(i<lines.length && options.length<6){
        const m = lines[i].match(/^([A-Da-d])\s*[\).:-]?\s*(.*)/);
        if(m){ options.push(m[2].trim()); i++; continue; }
        const m2 = lines[i].match(/^\(\s*([A-Da-d])\s*\)\s*(.*)/);
        if(m2){ options.push(m2[2].trim()); i++; continue; }
        break;
      }
      // detect answer line
      let correct = null;
      if(i<lines.length && /^(Answer|Ans|Key)\s*[:\-]/i.test(lines[i])){
        const mm = lines[i].match(/([A-D])/i);
        if(mm) correct = mm[1].toUpperCase();
        i++;
      }
      if(options.length>=2){
        while(options.length<4) options.push("N/A");
        questions.push({ question: q, options, correctAnswer: correct||"A" });
      }
    } else { i++; }
  }
  return questions;
}

// Generate MCQs via OpenAI (best-effort)
async function generateMCQsFromText(text, numQuestions=10){
  const prompt = `You are an AI quiz generator. From the text below, create ${numQuestions} multiple-choice questions with 4 options (A,B,C,D). Mark the correct option. Return valid JSON array of objects: { "question": "...", "options": ["...","...","...","..."], "correct": "A" } Only return JSON.\n\nText:\n"""${text}\n"""`;
  const resp = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 1200,
    temperature: 0.1
  });
  const raw = resp.choices?.[0]?.message?.content || resp.choices?.[0]?.text || "";
  // attempt to extract JSON
  const jstart = raw.indexOf('[');
  const jsonString = jstart>=0 ? raw.slice(jstart) : raw;
  try {
    const parsed = JSON.parse(jsonString);
    return parsed.map(q=>({
      question: q.question || q.q || "",
      options: q.options || q.opts || [],
      correctAnswer: (q.correct || q.correct_option || q.correctAnswer || "A")
    }));
  } catch(e){
    console.error("OpenAI parse error", e);
    return [];
  }
}

// Middleware verifyAdmin
function verifyAdmin(req,res,next){
  const auth = req.headers.authorization;
  if(!auth) return res.status(401).json({ error: "Unauthorized" });
  const token = auth.split(" ")[1];
  jwt.verify(token, process.env.JWT_SECRET || "secret", (err, user)=>{
    if(err) return res.status(403).json({ error: "Forbidden" });
    req.user = user;
    next();
  });
}

// Admin login
app.post("/admin/login", (req,res)=>{
  const { username, password } = req.body;
  if(username===process.env.ADMIN_USER && password===process.env.ADMIN_PASS){
    const token = jwt.sign({ username }, process.env.JWT_SECRET || "secret", { expiresIn: "2h" });
    return res.json({ token });
  }
  return res.status(401).json({ error: "Invalid credentials" });
});

// Upload route (admin only)
app.post("/upload", verifyAdmin, upload.single("file"), async (req,res)=>{
  try{
    const filePath = req.file.path;
    const text = await extractTextFromFile(filePath);
    let questions = null;
    if(detectMCQ(text)){
      questions = parseMCQs(text);
    } else {
      questions = await generateMCQsFromText(text, 10);
    }
    const quiz = await Quiz.create({ title: req.body.title || req.file.originalname, questions });
    fs.unlinkSync(filePath);
    return res.json({ message: "Quiz created", id: quiz._id });
  }catch(e){
    console.error(e);
    return res.status(500).json({ error: "Upload failed" });
  }
});

// Public get quiz
app.get("/quiz/:id", async (req,res)=>{
  try{
    const q = await Quiz.findById(req.params.id).lean();
    if(!q) return res.status(404).json({ error: "Not found" });
    return res.json(q);
  }catch(e){ return res.status(500).json({ error: "Server error" }); }
});

// Submit quiz (public)
app.post("/quiz/:id/submit", async (req,res)=>{
  try{
    const { answers, email } = req.body;
    const quiz = await Quiz.findById(req.params.id);
    if(!quiz) return res.status(404).json({ error: "Not found" });
    let score = 0;
    for(let i=0;i<quiz.questions.length;i++){
      const q = quiz.questions[i];
      const ans = (answers?.[i]||"").toString().trim().toLowerCase();
      if(ans && ans === (q.correctAnswer||"").toString().trim().toLowerCase()) score++;
    }
    // send email
    try{
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
      });
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: `Your Quiz Score - ${quiz.title}`,
        text: `Your score: ${score}/${quiz.questions.length}`
      });
    }catch(e){
      console.error("Email error", e);
    }
    return res.json({ score, total: quiz.questions.length });
  }catch(e){
    console.error(e);
    return res.status(500).json({ error: "Submit failed" });
  }
});

// fallback to frontend
app.get("*", (req,res)=> {
  res.sendFile(path.join(__dirname, "frontend", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log("🚀 SmartQuiz AI running on port", PORT));
