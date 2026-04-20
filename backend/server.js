const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();
let createClient = null;
try { createClient = require('@supabase/supabase-js').createClient } catch(e){}

const app = express();
const PORT = process.env.PORT || 10000;
app.use(cors({origin:'*'}));
app.use(express.json());

const frontend = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontend));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabase = (SUPABASE_URL && SUPABASE_KEY && createClient) ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;
const memory = { products: [
  {id:'1',name:'MOZA R9 V3',brand:'MOZA',price:11500000,image:'https://via.placeholder.com/200',created_at:new Date().toISOString()},
  {id:'2',name:'VNM Direct Drive Xtreme 32 Nm',brand:'VNM',price:35000000,image:'https://via.placeholder.com/200',created_at:new Date().toISOString()}
], orders: [] };
console.log(supabase ? 'Supabase ON' : 'Memory mode');

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || '147258';
const STATIC_TOKEN = crypto.createHash('sha256').update(ADMIN_USER + ':' + ADMIN_PASS + ':simracer2026').digest('hex');

app.get('/api/health',(req,res)=>res.json({ok:true,mode:supabase?'supabase':'memory'}));
app.post('/api/login',(req,res)=>{const {username,password}=req.body||{};if(username===ADMIN_USER&&password===ADMIN_PASS)return res.json({token:STATIC_TOKEN});res.status(401).json({error:'Sai'})});
function auth(req,res,next){const t=(req.headers.authorization||'').replace('Bearer ','');if(t===STATIC_TOKEN)return next();res.status(401).json({error:'Unauthorized'})}

app.get('/api/products',async(req,res)=>{if(supabase){const{data}=await supabase.from('products').select('*').order('created_at',{ascending:false});return res.json(data||[])}res.json(memory.products)});
app.post('/api/products',auth,async(req,res)=>{if(supabase){const{data}=await supabase.from('products').insert([req.body]).select().single();return res.json(data)}const item={id:Date.now().toString(),...req.body,created_at:new Date().toISOString()};memory.products.unshift(item);res.json(item)});
app.put('/api/products/:id',auth,async(req,res)=>{if(supabase){const{data}=await supabase.from('products').update(req.body).eq('id',req.params.id).select().single();return res.json(data)}const i=memory.products.findIndex(p=>p.id==req.params.id);if(i>=0){memory.products[i]={...memory.products[i],...req.body};return res.json(memory.products[i])}res.json({})});
app.delete('/api/products/:id',auth,async(req,res)=>{if(supabase){await supabase.from('products').delete().eq('id',req.params.id);return res.json({ok:true})}memory.products=memory.products.filter(p=>p.id!=req.params.id);res.json({ok:true})});

app.post('/api/orders',async(req,res)=>{try{const{customer_name,customerName,phone,address,note,items,total}=req.body||{};const cn=customer_name||customerName;if(!cn||!phone||!items?.length)return res.status(400).json({error:'Thiếu'});const od={customer_name:cn,phone,address,note,items,total};if(supabase){const{data,error}=await supabase.from('orders').insert([od]).select().single();if(error)throw error;return res.json({ok:true,order:data})}const data={id:Date.now(),...od,created_at:new Date().toISOString()};memory.orders.unshift(data);res.json({ok:true,order:data})}catch(e){res.status(500).json({error:e.message})}});

app.get('/api/orders',auth,async(req,res)=>{if(supabase){const{data}=await supabase.from('orders').select('*').order('created_at',{ascending:false}).limit(500);return res.json(data||[])}res.json(memory.orders)});
app.get('/api/stats',auth,async(req,res)=>{const data=supabase?(await supabase.from('orders').select('total,created_at')).data||[]:memory.orders;const totalOrders=data.length;const revenue=data.reduce((s,o)=>s+(o.total||0),0);const today=new Date().toISOString().slice(0,10);const todayOrders=data.filter(o=>o.created_at&&o.created_at.startsWith(today)).length;const todayRevenue=data.filter(o=>o.created_at&&o.created_at.startsWith(today)).reduce((s,o)=>s+(o.total||0),0);res.json({totalOrders,revenue,todayOrders,todayRevenue})});

app.get('/admin',(req,res)=>res.sendFile(path.join(frontend,'admin.html')));
app.get('*',(req,res)=>{if(req.path.startsWith('/api'))return res.status(404).end();res.sendFile(path.join(frontend,'index.html'))});
app.listen(PORT,()=>console.log('Ready on',PORT));
