
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors({ origin: '*' }));
app.use(express.json());

// In-memory storage (Render free will reset on restart - use DB for production)
let orders = [];
let products = [];

// Health
app.get('/', (req,res)=> res.send('Simracer API running'));

// ORDERS
app.get('/api/orders', (req,res)=> {
  res.json(orders.sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt)));
});

app.post('/api/orders', (req,res)=> {
  const order = { id: Date.now(), ...req.body, createdAt: new Date().toISOString(), status: 'new' };
  orders.unshift(order);
  console.log('New order:', order.customerName, order.phone);
  res.json({ success: true, order });
});

app.delete('/api/orders/:id', (req,res)=> {
  orders = orders.filter(o => String(o.id) !== req.params.id);
  res.json({ success: true });
});

// Simple login (for admin)
app.post('/api/login', (req,res)=> {
  const { username, password } = req.body;
  if(username === 'admin' && password === '147258'){
    res.json({ success: true, token: 'demo-token' });
  } else {
    res.status(401).json({ success: false, message: 'Sai tÃ i khoáº£n' });
  }
});

// PRODUCTS (keep existing)
app.get('/api/products', (req,res)=> res.json(products));
app.post('/api/products', (req,res)=> { products.push(req.body); res.json({success:true}); });

app.listen(PORT, ()=> console.log('API listening on', PORT));
