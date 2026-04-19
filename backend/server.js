const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors({origin:'*'}));
app.use(express.json());

// Serve frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

let orders = [];

app.get('/api/orders', (req,res)=> {
  res.json(orders.sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt)));
});

app.post('/api/orders', (req,res)=>{
  const order = { id: Date.now(), ...req.body, createdAt: new Date().toISOString(), status: 'new' };
  orders.unshift(order);
  console.log('New order:', order.customerName);
  res.json({success:true, order});
});

app.post('/api/login', (req,res)=>{
  const {username,password} = req.body || {};
  if(username==='admin' && password==='147258'){
    return res.json({success:true, token:'demo'});
  }
  res.status(401).json({success:false, message:'Sai tài khoản'});
});

// Fallback for SPA
app.get('*', (req,res,next)=>{
  if(req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, ()=> console.log('Simracer running on', PORT));
