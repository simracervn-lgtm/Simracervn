const express=require('express');
const cors=require('cors');
const path=require('path');
const multer=require('multer');
require('dotenv').config();
const {createClient}=require('@supabase/supabase-js');
const cloudinary=require('cloudinary').v2;

cloudinary.config({
  cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
  api_key:process.env.CLOUDINARY_API_KEY,
  api_secret:process.env.CLOUDINARY_API_SECRET
});

const app=express();
app.use(cors({origin:'*'}));
app.use(express.json({limit:'10mb'}));
const upload=multer({storage:multer.memoryStorage()});

const frontend=path.join(__dirname,'..','frontend');
app.use(express.static(frontend));

const supabase=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_KEY);
console.log('READY Supabase:',!!process.env.SUPABASE_URL,'Cloudinary:',!!process.env.CLOUDINARY_CLOUD_NAME);

const ADMIN_USER=process.env.ADMIN_USER||'admin';
const ADMIN_PASS=process.env.ADMIN_PASS||'147258';
const TOKEN=require('crypto').createHash('sha256').update(ADMIN_USER+':'+ADMIN_PASS).digest('hex');

app.post('/api/login',(req,res)=>{
  const {username,password}=req.body||{};
  if(username===ADMIN_USER && password===ADMIN_PASS) return res.json({token:TOKEN});
  res.status(401).json({error:'Sai'});
});
const auth=(req,res,next)=>{
  if((req.headers.authorization||'').replace('Bearer ','')===TOKEN) return next();
  res.status(401).json({error:'Unauthorized'});
};

// PRODUCTS
app.get('/api/products',async(_,res)=>{
  const {data,error}=await supabase.from('products').select('*').order('id',{ascending:false});
  if(error) return res.status(500).json({error:error.message});
  res.json(data);
});
app.post('/api/products',auth,async(req,res)=>{
  const {data,error}=await supabase.from('products').insert([req.body]).select().single();
  if(error) return res.status(500).json({error:error.message});
  res.json(data);
});
app.put('/api/products/:id',auth,async(req,res)=>{
  const {data,error}=await supabase.from('products').update(req.body).eq('id',req.params.id).select().single();
  if(error) return res.status(500).json({error:error.message});
  res.json(data);
});
app.delete('/api/products/:id',auth,async(req,res)=>{
  const {error}=await supabase.from('products').delete().eq('id',req.params.id);
  if(error) return res.status(500).json({error:error.message});
  res.json({ok:true});
});

// ORDERS
app.post('/api/orders',async(req,res)=>{
  const b=req.body||{};
  const order={
    customer_name:b.customer_name||b.customerName||'',
    phone:b.phone||'',
    address:b.address||'',
    note:b.note||'',
    items:Array.isArray(b.items)?b.items:[],
    total:Number(b.total)||0
  };
  const {data,error}=await supabase.from('orders').insert([order]).select().single();
  if(error) return res.status(500).json({error:error.message});
  res.json({ok:true,order:data});
});
app.get('/api/orders',auth,async(_,res)=>{
  const {data,error}=await supabase.from('orders').select('*').order('created_at',{ascending:false});
  if(error) return res.status(500).json({error:error.message});
  res.json(data);
});
app.delete('/api/orders/:id',auth,async(req,res)=>{
  const {error}=await supabase.from('orders').delete().eq('id',req.params.id);
  if(error) return res.status(500).json({error:error.message});
  res.json({ok:true});
});

// UPLOAD
app.post('/api/upload',auth,upload.single('file'),async(req,res)=>{
  try{
    if(!req.file) return res.status(400).json({error:'No file'});
    if(!process.env.CLOUDINARY_CLOUD_NAME){
      const b64=`data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      return res.json({url:b64,secure_url:b64});
    }
    const result=await new Promise((resolve,reject)=>{
      const s=cloudinary.uploader.upload_stream({folder:'simracer'},(e,r)=>e?reject(e):resolve(r));
      s.end(req.file.buffer);
    });
    res.json({url:result.secure_url,secure_url:result.secure_url});
  }catch(e){res.status(500).json({error:e.message})}
});

app.get('/api/stats',auth,async(_,res)=>{
  const {data}=await supabase.from('orders').select('total,created_at');
  const revenue=(data||[]).reduce((s,o)=>s+(o.total||0),0);
  res.json({totalOrders:data?.length||0,revenue,todayOrders:0,todayRevenue:0});
});

app.get('*',(req,res)=>{
  if(req.path.startsWith('/api')) return res.status(404).end();
  res.sendFile(path.join(frontend,req.path.endsWith('.html')?req.path:'index.html'));
});

const port=process.env.PORT||10000;
app.listen(port,()=>console.log('Server running on',port));
