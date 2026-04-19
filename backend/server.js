const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 10000;
app.use(cors({origin:'*'}));
app.use(express.json());

const frontend = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontend));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabase = (SUPABASE_URL && SUPABASE_KEY) ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;
const memory = { products: [], orders: [] };
console.log(supabase ? 'Using Supabase' : 'Using in-memory storage');
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || '147258';
const STATIC_TOKEN = crypto.createHash('sha256').update(ADMIN_USER + ':' + ADMIN_PASS + ':simracer2026').digest('hex');

app.get('/api/health', async (req,res)=>{ res.json({ok:true}) });
app.post('/api/login', (req,res)=>{ const {username,password}=req.body||{}; if(username===ADMIN_USER&&password===ADMIN_PASS) return res.json({token:STATIC_TOKEN}); res.status(401).json({error:'Sai'}); });
function auth(req,res,next){ const t=(req.headers.authorization||'').replace('Bearer ',''); if(t===STATIC_TOKEN) return next(); res.status(401).json({error:'Unauthorized'}); }

app.get('/api/products', async (req,res)=>{ 
  if(supabase){ const {data}=await supabase.from('products').select('*').order('created_at',{ascending:false}); return res.json(data||[]); }
  res.json(memory.products);
});
app.post('/api/products', auth, async (req,res)=>{ 
  if(supabase){ const {data}=await supabase.from('products').insert([req.body]).select().single(); return res.json(data); }
  const item = {id: Date.now().toString(), ...req.body, created_at: new Date().toISOString()};
  memory.products.unshift(item);
  res.json(item);
});
app.put('/api/products/:id', auth, async (req,res)=>{ 
  if(supabase){ const {data}=await supabase.from('products').update(req.body).eq('id',req.params.id).select().single(); return res.json(data); }
  const idx = memory.products.findIndex(p=>p.id==req.params.id);
  if(idx>=0){ memory.products[idx] = {...memory.products[idx], ...req.body}; return res.json(memory.products[idx]); }
  res.json({});
});
app.delete('/api/products/:id', auth, async (req,res)=>{ 
  if(supabase){ await supabase.from('products').delete().eq('id',req.params.id); return res.json({ok:true}); }
  memory.products = memory.products.filter(p=>p.id!=req.params.id);
  res.json({ok:true});
});

// ORDERS
app.post('/api/orders', async (req,res)=>{
  try{
    const {customer_name, customerName, phone, address, note, items, total} = req.body||{};
    const customer_name_final = customer_name || customerName;
    if(!customer_name_final || !phone || !items?.length) return res.status(400).json({error:'Thiếu thông tin'});
    const orderData = {customer_name: customer_name_final, phone, address, note, items, total};
    if(supabase){
      const {data, error} = await supabase.from('orders').insert([orderData]).select().single();
      if(error) throw error;
      return res.json({ok:true, order:data});
    } else {
      const data = {id: Date.now(), ...orderData, created_at: new Date().toISOString()};
      memory.orders.unshift(data);
      return res.json({ok:true, order:data});
    }
  }catch(e){ res.status(500).json({error:e.message}); }
});

app.get('/api/orders', auth, async (req,res)=>{
  if(supabase){
    const {data} = await supabase.from('orders').select('*').order('created_at',{ascending:false}).limit(500);
    return res.json(data||[]);
  } else {
    return res.json(memory.orders);
  }
});

app.get('/api/stats', auth, async (req,res)=>{
  const data = supabase ? (await supabase.from('orders').select('total,created_at,items')).data || [] : memory.orders;
  const totalOrders = data.length;
  const revenue = data.reduce((s,o)=>s+(o.total||0),0);
  const today = new Date().toISOString().slice(0,10);
  const todayOrders = data.filter(o=>o.created_at && o.created_at.startsWith(today)).length;
  const todayRevenue = data.filter(o=>o.created_at && o.created_at.startsWith(today)).reduce((s,o)=>s+(o.total||0),0);
  res.json({totalOrders, revenue, todayOrders, todayRevenue});
});

// SEO product page
app.get('/product/:slug', async (req,res)=>{
  const slug = req.params.slug;
  let { data: p } = await supabase.from('products').select('*').eq('id', slug).single();
  if(!p){
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
app.listen(PORT,()=>console.log('SEO+Orders ready'));
