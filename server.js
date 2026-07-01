import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Groq from 'groq-sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const allowedOrigins = [
  'https://www.sisinternationalcorp.com',
  'https://sisinternationalcorp.com'
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy: Origin not allowed'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || __dirname;
const LEADS_FILE = path.join(DATA_DIR, 'leads.json');
if (!fs.existsSync(LEADS_FILE)) fs.writeFileSync(LEADS_FILE, '[]');

function readLeads() {
  try {
    return JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveLead(lead) {
  const leads = readLeads();
  const exists = leads.find((item) => item.phone === lead.phone);
  if (!exists) {
    leads.unshift(lead);
    fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2));
    console.log('✅ Lead saved:', lead.name, lead.phone);
    return true;
  }
  return false;
}

function normalizeEnv(value) {
  return String(value || '')
    .trim()
    .replace(/^['"]|['"]$/g, '');
}

const GROQ_API_KEY = normalizeEnv(process.env.GROQ_API_KEY);
const groqKeyIsValid = typeof GROQ_API_KEY === 'string' && GROQ_API_KEY.length > 0 && GROQ_API_KEY !== 'your_existing_key_here';
if (!groqKeyIsValid) {
  console.error('ERROR: GROQ_API_KEY is missing or still a placeholder. Set GROQ_API_KEY in environment.');
}
const groq = groqKeyIsValid ? new Groq({ apiKey: GROQ_API_KEY }) : null;
console.log('🔑 GROQ_API_KEY configured:', groqKeyIsValid);

const SYSTEM_PROMPT = `You are an AI Recruitment Assistant for SIS International Recruiters — a company that places Indian and Nepali workers in Europe (Croatia, Serbia, Bulgaria, North Macedonia, Albania, Montenegro).

Your job:
1. Help candidates find jobs and help employers find workers
2. Naturally collect lead information during conversation
3. Answer questions about salary, visa, required documents

Salary ranges:
- Unskilled jobs: €800–900/month
- Skilled jobs: €900–1200/month
- Healthcare/Nursing: €1000–1500/month

Required documents: Passport, Education Certificate, Experience Certificate, Trade Certificate, PCC
Visa processing time: 30–90 days
Document email: info@sisinternationalcorp.com

Contact numbers:
- India candidates: +91 93847 47101
- Employers in Croatia: +385 99 366 5624

LEAD COLLECTION RULE:
When any user shows interest in jobs or hiring, naturally ask for their:
1. Full name
2. Phone number with country code
3. Job role they want (or workers they need)

CRITICAL: Once you have collected name, phone, and job role:
- IMMEDIATELY reply: "Thank you [name]! Our team will contact you at [phone] within 24 hours. WhatsApp: +91 93847 47101"
- Then add the lead data block
- STOP ASKING MORE QUESTIONS - conversation is COMPLETE. Do not ask follow-up questions about experience, documents, or anything else.

SPECIAL RESPONSES:
- If user says "thank you" or similar: Reply with "You're welcome! Best of luck with your Europe job. Feel free to contact us anytime."
- Never ask the same question twice
- Keep responses short (2-3 lines max)
- Stay relevant to recruitment only

LEAD DATA FORMAT:
Once you have name, phone, and job, add EXACTLY this block at the very END:
[LEAD_DATA]{"name":"FULLNAME","phone":"PHONENUMBER","job":"JOBROLE","type":"candidate or employer"}[/LEAD_DATA]

Rules:
- Keep responses under 5 lines
- Be friendly and professional
- Simple English only
- Never show the [LEAD_DATA] block to the user — it gets removed automatically`;

app.post('/chat', async (req, res) => {
  const { messages, sessionId } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  try {
    if (!groq) {
      return res.status(503).json({ error: 'AI service is not configured. Please set a valid GROQ_API_KEY.' });
    }

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      max_tokens: 500,
      temperature: 0.7,
    });

    let reply = completion.choices?.[0]?.message?.content || 'Sorry, please try again.';

    const leadMatch = reply.match(/\[LEAD_DATA\](.*?)\[\/LEAD_DATA\]/s);
    let leadCaptured = false;

    if (leadMatch) {
      try {
        const leadData = JSON.parse(leadMatch[1]);
        leadData.timestamp = new Date().toISOString();
        leadData.sessionId = sessionId || 'unknown';
        leadData.source = 'chatbot';
        leadCaptured = saveLead(leadData);
      } catch (error) {
        console.error('Lead parse error:', error.message);
      }
      reply = reply.replace(/\[LEAD_DATA\].*?\[\/LEAD_DATA\]/s, '').trim();
    }

    res.json({ reply, leadCaptured });
  } catch (error) {
    const errorMessage = error?.message || String(error || 'Unknown error');
    console.error('[/chat] exact error:', errorMessage);
    if (error?.stack) {
      console.error('[/chat] stack:', error.stack);
    }
    res.status(500).json({ error: 'AI service is temporarily unavailable. Please try again later.' });
  }
});

app.post('/api/lead', (req, res) => {
  const { name, phone, job, type } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'Name and phone required' });

  const lead = {
    name: name.trim(),
    phone: phone.trim(),
    job: job || 'Not specified',
    type: type || 'candidate',
    timestamp: new Date().toISOString(),
    source: 'manual',
  };

  saveLead(lead);
  res.json({ success: true });
});

function normalizePassword(value) {
  return String(value || '')
    .trim()
    .replace(/^['"]|['"]$/g, '');
}

const ADMIN_PASS = normalizePassword(process.env.ADMIN_PASSWORD || 'sis2024admin');
console.log('🔐 ADMIN_PASSWORD env:', JSON.stringify(process.env.ADMIN_PASSWORD));
console.log('🔐 ADMIN_PASSWORD effective:', JSON.stringify(ADMIN_PASS));

app.get('/admin/leads', (req, res) => {
  const providedPassword = normalizePassword(req.query.password);
  console.log('🔐 admin login received password:', JSON.stringify(req.query.password));
  console.log('🔐 admin login normalized password:', JSON.stringify(providedPassword));
  if (providedPassword !== ADMIN_PASS) return res.status(401).json({ error: 'Unauthorized' });
  const leads = readLeads();
  res.json({ total: leads.length, leads });
});

// DELETE LEAD
app.delete('/admin/lead', (req, res) => {
  const { password, phone } = req.body;
  if (password !== ADMIN_PASS) return res.status(401).json({ error: 'Unauthorized' });
  const leads = readLeads();
  const filtered = leads.filter(l => l.phone !== phone);
  fs.writeFileSync(LEADS_FILE, JSON.stringify(filtered, null, 2));
  res.json({ success: true, deleted: leads.length - filtered.length });
});

app.get('/admin', (req, res) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>SIS Lead Dashboard</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0f172a;color:#e2e8f0;min-height:100vh}
.hdr{background:#1e3a5f;padding:18px 28px;display:flex;align-items:center;gap:10px}
.hdr h1{font-size:18px;font-weight:600;color:#fff}
.hdr span{font-size:12px;color:#93c5fd;margin-left:auto}
.login{max-width:360px;margin:100px auto;background:#1e293b;border-radius:14px;padding:28px;border:1px solid #334155}
.login h2{font-size:17px;margin-bottom:16px;color:#f1f5f9}
.login p{font-size:12px;color:#64748b;margin-bottom:18px}
input,select{width:100%;padding:9px 13px;background:#0f172a;border:1px solid #334155;border-radius:8px;color:#e2e8f0;font-size:13px;margin-bottom:10px}
button{width:100%;padding:10px;background:#0ea5e9;border:none;border-radius:8px;color:#fff;font-size:13px;font-weight:600;cursor:pointer}
button:hover{background:#0284c7}
.cnt{max-width:1080px;margin:0 auto;padding:24px 18px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:24px}
.stat{background:#1e293b;border-radius:10px;padding:16px;border:1px solid #334155}
.stat .lbl{font-size:11px;color:#64748b;margin-bottom:5px}
.stat .val{font-size:26px;font-weight:700;color:#0ea5e9}
.tbl-wrap{background:#1e293b;border-radius:12px;border:1px solid #334155;overflow:hidden}
.tbl-hdr{padding:14px 18px;border-bottom:1px solid #334155;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.tbl-hdr h3{font-size:14px;font-weight:600;margin-right:auto}
.tbl-hdr select,.tbl-hdr input{width:auto;margin:0;padding:6px 10px;font-size:12px}
.rbtn{width:auto;padding:7px 14px;font-size:12px;background:#1e293b;border:1px solid #334155;color:#94a3b8;border-radius:7px}
.ebtn{width:auto;padding:7px 14px;font-size:12px;background:#0ea5e9;border:none;color:#fff;border-radius:7px;font-weight:600}
table{width:100%;border-collapse:collapse;table-layout:fixed}.tbl-scroll{overflow-x:auto}
th{padding:10px 14px;text-align:left;font-size:10px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #334155}
td{padding:11px 14px;font-size:12px;border-bottom:1px solid #1e293b;white-space:nowrap}td.act{overflow:visible}
tr:last-child td{border-bottom:none}
tr:hover td{background:#0f172a}
.badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600}
.bc{background:#0c4a6e;color:#38bdf8}
.be{background:#14532d;color:#4ade80}
.bs{background:#1e1b4b;color:#818cf8}
.bm{background:#1c1917;color:#a8a29e}
.wa{display:inline-block;padding:3px 8px;background:#166534;color:#4ade80;border-radius:5px;font-size:10px;text-decoration:none;white-space:nowrap}
.wa:hover{background:#15803d}.del{background:none;border:none;cursor:pointer;font-size:13px;margin-left:6px;padding:3px 6px;border-radius:5px}.del:hover{background:#7f1d1d}
.empty{text-align:center;padding:50px;color:#475569}
</style>
</head>
<body>
<div id="lv">
  <div class="login">
    <h2>🔐 SIS Lead Dashboard</h2>
    <p>Enter admin password to view leads from chatbot</p>
    <input type="password" id="pw" placeholder="Admin password" onkeydown="if(event.key==='Enter')go()"/>
    <button onclick="go()">Login</button>
    <p id="err" style="color:#f87171;font-size:12px;margin-top:8px;display:none">Wrong password</p>
  </div>
</div>
<div id="dv" style="display:none">
  <div class="hdr"><span>🌍</span><h1>SIS International — Lead Dashboard</h1><span id="ts">Loading...</span></div>
  <div class="cnt">
    <div class="stats" id="stats"></div>
    <div class="tbl-wrap">
      <div class="tbl-hdr">
        <h3>All Leads</h3>
        <select id="ft" onchange="render()"><option value="">All types</option><option value="candidate">Candidates</option><option value="employer">Employers</option></select>
        <input type="text" id="fs" placeholder="Search..." oninput="render()" style="width:160px"/>
        <button class="rbtn" onclick="load()">↺ Refresh</button>
        <button class="ebtn" onclick="csv()">⬇ Export CSV</button>
      </div>
      <div class="tbl-scroll"><table>
        <thead><tr><th style="width:36px">#</th><th style="width:100px">Name</th><th style="width:110px">Phone</th><th style="width:90px">Job / Role</th><th style="width:90px">Type</th><th style="width:80px">Source</th><th style="width:66px">Date</th><th style="width:170px">Action</th></tr></thead>
        <tbody id="tb"></tbody>
      </table></div>
      <div class="empty" id="em" style="display:none">No leads found</div>
    </div>
  </div>
</div>
<script>
let allLeads = [];
let adminPassword = '';

function go() {
  adminPassword = document.getElementById('pw').value;
  console.log('Login button clicked');
  load();
}

async function load() {
  try {
    console.log('Fetching leads...');
    const response = await fetch('/admin/leads?password=' + encodeURIComponent(adminPassword));
    console.log('Response status:', response.status);
    
    if (response.status === 401) {
      console.log('Unauthorized - wrong password');
      document.getElementById('err').style.display = 'block';
      return;
    }
    
    const data = await response.json();
    console.log('Leads received:', data);
    
    allLeads = data.leads || [];
    document.getElementById('lv').style.display = 'none';
    document.getElementById('dv').style.display = 'block';
    document.getElementById('err').style.display = 'none';
    document.getElementById('ts').textContent = 'Updated: ' + new Date().toLocaleTimeString();
    
    stats();
    render();
  } catch (error) {
    console.error('Load error:', error);
    document.getElementById('err').style.display = 'block';
  }
}

function stats() {
  const total = allLeads.length;
  const candidates = allLeads.filter(l => l.type === 'candidate').length;
  const employers = allLeads.filter(l => l.type === 'employer').length;
  const today = allLeads.filter(l => new Date(l.timestamp).toDateString() === new Date().toDateString()).length;
  
  document.getElementById('stats').innerHTML = 
    '<div class="stat"><div class="lbl">Total leads</div><div class="val">' + total + '</div></div>' +
    '<div class="stat"><div class="lbl">Candidates</div><div class="val" style="color:#38bdf8">' + candidates + '</div></div>' +
    '<div class="stat"><div class="lbl">Employers</div><div class="val" style="color:#4ade80">' + employers + '</div></div>' +
    '<div class="stat"><div class="lbl">Today</div><div class="val" style="color:#f59e0b">' + today + '</div></div>';
}

async function deleteLead(phone) {
  if (!confirm('Delete this lead?')) return;
  try {
    const r = await fetch('/admin/lead', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: adminPassword, phone: phone })
    });
    if (r.ok) { load(); } else { alert('Delete failed'); }
  } catch (e) { alert('Error deleting lead'); }
}

function render() {
  const filterType = document.getElementById('ft').value;
  const searchTerm = document.getElementById('fs').value.toLowerCase();
  
  const filtered = allLeads.filter(l => {
    const typeMatch = !filterType || l.type === filterType;
    const searchMatch = !searchTerm || 
      (l.name || '').toLowerCase().includes(searchTerm) || 
      (l.job || '').toLowerCase().includes(searchTerm) || 
      (l.phone || '').includes(searchTerm);
    return typeMatch && searchMatch;
  });
  
  const tbody = document.getElementById('tb');
  const empty = document.getElementById('em');
  
  if (!filtered.length) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  
  empty.style.display = 'none';
  tbody.innerHTML = filtered.map((lead, idx) => {
    const dt = new Date(lead.timestamp);
    const dateStr = dt.toLocaleDateString('en-IN', {day: '2-digit', month: 'short'}) + 
                    '<br><span style="font-size:10px;color:#475569">' + 
                    dt.toLocaleTimeString('en-IN', {hour: '2-digit', minute: '2-digit'}) + '</span>';
    const whatsappNum = lead.type === 'employer' ? '385993665624' : '919384747101';
    const whatsappMsg = encodeURIComponent('Hi ' + lead.name + ', I am from SIS International. You enquired about ' + lead.job + ' jobs in Europe. Are you still interested?');
    
    return '<tr>' +
      '<td style="color:#475569">' + (idx + 1) + '</td>' +
      '<td style="font-weight:500">' + escapeHtml(lead.name || '—') + '</td>' +
      '<td>' + escapeHtml(lead.phone || '—') + '</td>' +
      '<td>' + escapeHtml(lead.job || '—') + '</td>' +
      '<td><span class="badge ' + (lead.type === 'employer' ? 'be' : 'bc') + '">' + (lead.type || 'candidate').toUpperCase() + '</span></td>' +
      '<td><span class="badge ' + (lead.source === 'chatbot' ? 'bs' : 'bm') + '">' + escapeHtml(lead.source || 'chatbot') + '</span></td>' +
      '<td>' + dateStr + '</td>' +
      '<td><a class="wa" href="https://wa.me/' + whatsappNum + '?text=' + whatsappMsg + '" target="_blank">💬 WhatsApp</a> <button class="del" onclick="deleteLead(&quot;' + lead.phone + '&quot;)">🗑️</button></td>' +
      '</tr>';
  }).join('');
}

function escapeHtml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;');
}

function csv() {
  const headers = ['Name', 'Phone', 'Job', 'Type', 'Source', 'Timestamp'];
  const rows = allLeads.map(l => [l.name, l.phone, l.job, l.type, l.source, l.timestamp]);
  const csvContent = [headers, ...rows].map(row => 
    row.map(cell => '"' + String(cell || '').replace(/"/g, '""') + '"').join(',')
  ).join('\\n');
  
  const blob = new Blob([csvContent], {type: 'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sis-leads-' + Date.now() + '.csv';
  a.click();
}

setInterval(() => {
  if (adminPassword) load();
}, 60000);
</script>
</body>
</html>`;
  res.send(html);
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('✅ SIS Chatbot running on port', PORT);
  console.log('📊 Admin:', 'http://localhost:' + PORT + '/admin');
  console.log('🔑 Password:', ADMIN_PASS);
});




