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
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const LEADS_FILE = path.join(__dirname, 'leads.json');
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
4. Are they a candidate or employer

Once you have all 4 details, at the very END of your response add EXACTLY this block:
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
    const completion = await groq.chat.completions.create({
      model: 'llama3-8b-8192',
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      max_tokens: 500,
      temperature: 0.7,
    });

    let reply = completion.choices[0]?.message?.content || 'Sorry, please try again.';

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
    console.error('Groq error:', error.message);
    res.status(500).json({ error: 'AI error. Please try again.' });
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

app.get('/admin', (req, res) => {
  res.send(`<!DOCTYPE html>
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
table{width:100%;border-collapse:collapse;table-layout:fixed}
th{padding:10px 14px;text-align:left;font-size:10px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #334155}
td{padding:11px 14px;font-size:12px;border-bottom:1px solid #1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
tr:last-child td{border-bottom:none}
tr:hover td{background:#0f172a}
.badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600}
.bc{background:#0c4a6e;color:#38bdf8}
.be{background:#14532d;color:#4ade80}
.bs{background:#1e1b4b;color:#818cf8}
.bm{background:#1c1917;color:#a8a29e}
.wa{display:inline-block;padding:3px 9px;background:#166534;color:#4ade80;border-radius:5px;font-size:11px;text-decoration:none}
.wa:hover{background:#15803d}
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
      <table>
        <thead><tr><th style="width:36px">#</th><th style="width:140px">Name</th><th style="width:130px">Phone</th><th>Job / Role</th><th style="width:90px">Type</th><th style="width:80px">Source</th><th style="width:110px">Date</th><th style="width:90px">Action</th></tr></thead>
        <tbody id="tb"></tbody>
      </table>
      <div class="empty" id="em" style="display:none">No leads found</div>
    </div>
  </div>
</div>
<script>
let all=[],pw='';
function go(){
  pw=document.getElementById('pw').value;
  console.log('Login button clicked, password:', pw);
  load();
}
async function load(){
  try {
    console.log('Fetching leads with password:', pw);
    const r=await fetch('/admin/leads?password='+encodeURIComponent(pw));
    console.log('Response received, status:', r.status);
    if(r.status===401){
      console.log('Unauthorized - wrong password');
      document.getElementById('err').style.display='block';
      return;
    }
    const d=await r.json();
    console.log('Leads received:', d);
    all=d.leads||[];
    document.getElementById('lv').style.display='none';
    document.getElementById('dv').style.display='block';
    document.getElementById('err').style.display='none';
    document.getElementById('ts').textContent='Updated: '+new Date().toLocaleTimeString();
    stats();render();
  } catch(e) {
    console.error('Load error:', e);
    document.getElementById('err').style.display='block';
  }
}
function stats(){
  const t=all.length,c=all.filter(l=>l.type==='candidate').length,e=all.filter(l=>l.type==='employer').length;
  const td=all.filter(l=>new Date(l.timestamp).toDateString()===new Date().toDateString()).length;
  document.getElementById('stats').innerHTML=
    '<div class="stat"><div class="lbl">Total leads</div><div class="val">'+t+'</div></div>'+
    '<div class="stat"><div class="lbl">Candidates</div><div class="val" style="color:#38bdf8">'+c+'</div></div>'+
    '<div class="stat"><div class="lbl">Employers</div><div class="val" style="color:#4ade80">'+e+'</div></div>'+
    '<div class="stat"><div class="lbl">Today</div><div class="val" style="color:#f59e0b">'+td+'</div></div>';
}
function render(){
  const ft=document.getElementById('ft').value,fs=document.getElementById('fs').value.toLowerCase();
  const f=all.filter(l=>(!ft||l.type===ft)&&(!fs||(l.name||'').toLowerCase().includes(fs)||(l.job||'').toLowerCase().includes(fs)||(l.phone||'').includes(fs)));
  const tb=document.getElementById('tb'),em=document.getElementById('em');
  if(!f.length){tb.innerHTML='';em.style.display='block';return;}
  em.style.display='none';
  tb.innerHTML=f.map((l,i)=>{
    const dt=new Date(l.timestamp);
    const ds=dt.toLocaleDateString('en-IN',{day:'2-digit',month:'short'})+'<br><span style="font-size:10px;color:#475569">'+dt.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})+'</span>';
    const wn=l.type==='employer'?'385993665624':'919384747101';
    const wm=encodeURIComponent('Hi '+l.name+', I am from SIS International. You enquired about '+l.job+' jobs in Europe. Are you still interested?');
    return '<tr><td style="color:#475569">'+(i+1)+'</td><td style="font-weight:500">'+escape(l.name||'—')+'</td><td>'+escape(l.phone||'—')+'</td><td>'+escape(l.job||'—')+'</td><td><span class="badge '+(l.type==='employer'?'be':'bc')+'">'+((l.type||'candidate').toUpperCase())+'</span></td><td><span class="badge '+(l.source==='chatbot'?'bs':'bm')+'">'+escape(l.source||'chatbot')+'</span></td><td>'+ds+'</td><td><a class="wa" href="https://wa.me/'+wn+'?text='+wm+'" target="_blank">💬 WhatsApp</a></td></tr>';
  }).join('');
}
function escape(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');}
function csv(){
  const h=['Name','Phone','Job','Type','Source','Timestamp'];
  const rows=all.map(l=>[l.name,l.phone,l.job,l.type,l.source,l.timestamp]);
  const c=[h,...rows].map(r=>r.map(v=>['"', String(v ?? '').replace(/"/g,'""'), '"'].join('')).join(',')).join('\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([c],{type:'text/csv'}));
  a.download='sis-leads-'+Date.now()+'.csv';a.click();
}
setInterval(()=>{if(pw)load();},60000);
</script>
</body>
</html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('✅ SIS Chatbot running on port', PORT);
  console.log('📊 Admin:', 'http://localhost:' + PORT + '/admin');
  console.log('🔑 Password:', ADMIN_PASS);
});
