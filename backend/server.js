const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 10000;
app.use(cors());
app.use(express.json());

const frontend = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontend));

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || '147258';
const STATIC_TOKEN = crypto.createHash('sha256').update(ADMIN_USER + ':' + ADMIN_PASS + ':simracer2026').digest('hex');

app.get('/api/health', async (req,res)=>{ res.json({ok:true}) });
app.post('/api/login', (req,res)=>{ const {username,password}=req.body||{}; if(username===ADMIN_USER&&password===ADMIN_PASS) return res.json({token:STATIC_TOKEN}); res.status(401).json({error:'Sai'}); });
function auth(req,res,next){ const t=(req.headers.authorization||'').replace('Bearer ',''); if(t===STATIC_TOKEN) return next(); res.status(401).json({error:'Unauthorized'}); }

app.get('/api/products', async (req,res)=>{ const {data}=await supabase.from('products').select('*').order('created_at',{ascending:false}); res.json(data||[]); });
app.post('/api/products', auth, async (req,res)=>{ const {data}=await supabase.from('products').insert([req.body]).select().single(); res.json(data); });
app.put('/api/products/:id', auth, async (req,res)=>{ const {data}=await supabase.from('products').update(req.body).eq('id',req.params.id).select().single(); res.json(data); });
app.delete('/api/products/:id', auth, async (req,res)=>{ await supabase.from('products').delete().eq('id',req.params.id); res.json({ok:true}); });

// SEO product page
app.get('/product/:slug', async (req,res)=>{
  const slug = req.params.slug;
  const { data: p } = await supabase.from('products').select('*').eq('id', slug).single();
  if(!p){
    // try find by name
    const { data: all } = await supabase.from('products').select('*');
    const found = (all||[]).find(x=> x.name.toLowerCase().replace(/[^a-z0-9]+/g,'-')===slug);
    if(!found) return res.status(404).send('Not found');
    p = found;
  }
  const title = `${p.name} - ${p.brand} | SimRacer Vietnam`;
  const desc = p.desc_vi || p.desc_en || 'Direct Drive Wheelbase chính hãng';
  const img = p.image || '';
  const html = `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"><title>${title}</title>
<meta name="description" content="${desc}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:image" content="${img}">
<meta property="og:type" content="product">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="canonical" href="https://simracer.onrender.com/product/${p.id}">
<script>window.location.replace('/?product=${p.id}#${p.id}')</script>
</head><body>Đang chuyển...</body></html>`;
  res.send(html);
});

app.get('/admin',(req,res)=>res.sendFile(path.join(frontend,'admin.html')));
app.get('*',(req,res)=>{ if(req.path.startsWith('/api')) return res.status(404).end(); res.sendFile(path.join(frontend,'index.html')); });
app.listen(PORT,()=>console.log('SEO ready'));
