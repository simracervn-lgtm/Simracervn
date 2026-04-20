const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
let createClient=null; try{createClient=require('@supabase/supabase-js').createClient}catch{}
const app=express();
app.use(cors({origin:'*'}));
app.use(express.json({limit:'5mb'}));
const multer=require('multer');const upload=multer({storage:multer.memoryStorage()});
app.post('/api/upload',upload.single('file'),(req,res)=>{if(!req.file)return res.status(400).json({error:'No file'});const b64=`data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;res.json({url:b64,secure_url:b64})});
const frontend=path.join(__dirname,'..','frontend');
app.use(express.static(frontend));
const supabase=(process.env.SUPABASE_URL&&process.env.SUPABASE_SERVICE_KEY&&createClient)?createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_KEY):null;
console.log('MODE:',supabase?'SUPABASE':'MEMORY');
const memory={products:[],orders:[]};
const ADMIN_USER=process.env.ADMIN_USER||'admin';
const ADMIN_PASS=process.env.ADMIN_PASS||'147258';
const TOKEN=require('crypto').createHash('sha256').update(ADMIN_USER+':'+ADMIN_PASS).digest('hex');

app.post('/api/login',(req,res)=>{const {username,password}=req.body||{};if(username===ADMIN_USER&&password===ADMIN_PASS)return res.json({token:TOKEN});res.status(401).json({error:'Sai'})});
const auth=(req,res,next)=>{if((req.headers.authorization||'').replace('Bearer ','')===TOKEN)return next();res.status(401).end()};

app.get('/api/products',async(_,res)=>{if(supabase){const{data}=await supabase.from('products').select('*');return res.json(data||[])}res.json(memory.products)});
app.post('/api/products',auth,async(req,res)=>{if(supabase){const{data}=await supabase.from('products').insert([req.body]).select().single();return res.json(data)}const it={id:Date.now(),...req.body};memory.products.unshift(it);res.json(it)});

app.post('/api/orders',async(req,res)=>{
  console.log('=== NEW ORDER ===',new Date().toISOString());
  console.log(JSON.stringify(req.body));
  try{
    const b=req.body||{};
    const order={
      customer_name:b.customer_name||b.customerName||'Khach',
      phone:b.phone||'',
      address:b.address||'',
      note:b.note||'',
      items:Array.isArray(b.items)?b.items:[],
      total:Number(b.total)||0,
      created_at:new Date().toISOString()
    };
    if(supabase){
      const{data,error}=await supabase.from('orders').insert([order]).select().single();
      if(error){console.error('SUPABASE ERR',error);return res.status(500).json({error:error.message})}
      return res.json({ok:true,order:data});
    }else{
      order.id=Date.now();memory.orders.unshift(order);return res.json({ok:true,order});
    }
  }catch(e){console.error(e);res.status(500).json({error:e.message})}
});

app.get('/api/orders',auth,async(_,res)=>{if(supabase){const{data}=await supabase.from('orders').select('*').order('created_at',{ascending:false});return res.json(data||[])}res.json(memory.orders)});
app.get('/api/stats',auth,async(_,res)=>{const data=supabase?(await supabase.from('orders').select('total,created_at')).data||[]:memory.orders;res.json({totalOrders:data.length,revenue:data.reduce((s,o)=>s+(o.total||0),0),todayOrders:0,todayRevenue:0})});

app.get('*',(req,res)=>{if(req.path.startsWith('/api'))return res.status(404).end();res.sendFile(path.join(frontend,req.path.endsWith('.html')?req.path:'index.html'))});
app.listen(process.env.PORT||10000,()=>console.log('READY'));
