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

// Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || '147258';
const tokens = new Map();

app.get('/api/health', async (req, res) => {
  const { data, error } = await supabase.from('products').select('id').limit(1);
  res.json({ 
    ok: true, 
    supabase: !error,
    time: new Date().toISOString()
  });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const token = crypto.randomBytes(24).toString('hex');
    tokens.set(token, Date.now());
    return res.json({ token });
  }
  res.status(401).json({ error: 'Sai tài khoản hoặc mật khẩu' });
});

function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (tokens.has(token)) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

// Products
app.get('/api/products', auth, async (req, res) => {
  const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
  if (error) { console.error('Supabase error:', error); return res.status(500).json({ error: error.message }); }
  res.json(data || []);
});

app.post('/api/products', auth, async (req, res) => {
  const { data, error } = await supabase.from('products').insert([req.body]).select().single();
  if (error) { console.error('Supabase error:', error); return res.status(500).json({ error: error.message }); }
  res.json(data);
});

app.put('/api/products/:id', auth, async (req, res) => {
  const { data, error } = await supabase.from('products').update(req.body).eq('id', req.params.id).select().single();
  if (error) { console.error('Supabase error:', error); return res.status(500).json({ error: error.message }); }
  res.json(data);
});

app.delete('/api/products/:id', auth, async (req, res) => {
  const { error } = await supabase.from('products').delete().eq('id', req.params.id);
  if (error) { console.error('Supabase error:', error); return res.status(500).json({ error: error.message }); }
  res.json({ ok: true });
});

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).end();
  res.sendFile(path.join(frontend, 'index.html'));
});

app.listen(PORT, () => console.log(`✅ Running on ${PORT} | Login: ${ADMIN_USER}/${ADMIN_PASS}`));
