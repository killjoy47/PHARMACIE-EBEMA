require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

// Configuration Supabase (À remplacer par tes vraies clés dans un fichier .env plus tard)
// Pour le test, tu peux mettre tes clés ici directement si tu ne publies pas le code.
const supabaseUrl = process.env.SUPABASE_URL || 'https://nlznhqhctfudsyncspaf.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'sb_publishable_nE53cew4TVs_1UtXAY3Dqg_B4MIars3';
const supabase = createClient(supabaseUrl, supabaseKey);

// --- 1. AUTHENTIFICATION ---
app.post('/api/auth', async (req, res) => {
    const { role, password } = req.body;
    const { data, error } = await supabase.from('users').select('*').eq('role', role).single();
    
    if (error || !data) return res.status(401).json({ error: 'Utilisateur non trouvé' });
    if (data.password === password) return res.json({ success: true, role: data.role });
    return res.status(401).json({ error: 'Mot de passe incorrect' });
});

app.post('/api/auth/change', async (req, res) => {
    const { masterPwd, targetRole, newPwd } = req.body;
    // Vérifier le mot de passe maître
    const { data: master } = await supabase.from('users').select('password').eq('role', 'master').single();
    if (master.password !== masterPwd) return res.status(401).json({ error: 'Mot de passe maître incorrect' });
    
    // Mettre à jour
    await supabase.from('users').update({ password: newPwd }).eq('role', targetRole);
    res.json({ success: true });
});

// --- 2. RÉGLAGES ---
app.get('/api/settings', async (req, res) => {
    const { data } = await supabase.from('settings').select('*');
    const settings = {};
    data.forEach(s => settings[s.key] = s.value);
    res.json(settings);
});

app.post('/api/settings', async (req, res) => {
    const { key, value } = req.body;
    await supabase.from('settings').update({ value }).eq('key', key);
    res.json({ success: true });
});

// --- 3. PRODUITS ---
app.get('/api/products', async (req, res) => {
    const { data } = await supabase.from('products').select('*').order('name');
    // Formatage pour correspondre au Frontend
    const formatted = data.map(p => ({
        id: p.id, name: p.name, ps: p.price_sale, pb: p.price_buy, qty: p.stock_qty, min: p.min_qty
    }));
    res.json(formatted);
});

app.post('/api/products', async (req, res) => {
    const { name, ps, pb, qty, min } = req.body;
    const { data, error } = await supabase.from('products').insert([
        { name, price_sale: ps, price_buy: pb, stock_qty: qty, min_qty: min }
    ]).select();
    res.json(data[0]);
});

app.put('/api/products/:id', async (req, res) => {
    const { name, ps, pb, qty, min } = req.body;
    const { data } = await supabase.from('products')
        .update({ name, price_sale: ps, price_buy: pb, stock_qty: qty, min_qty: min })
        .eq('id', req.params.id).select();
    res.json(data[0]);
});

app.delete('/api/products/:id', async (req, res) => {
    await supabase.from('products').delete().eq('id', req.params.id);
    res.json({ success: true });
});

// --- 4. VENTES (Transaction complexe) ---
app.get('/api/sales', async (req, res) => {
    const { data } = await supabase.from('sales').select(`
        *, sale_items ( quantity, price_unit, products ( id, name ) )
    `).order('created_at', { ascending: false });

    const formatted = data.map(s => ({
        id: s.id.toString(),
        date: s.sale_date,
        dt: s.sale_time,
        total: s.total_amount,
        versee: s.amount_paid,
        monnaie: s.change_returned,
        items: s.sale_items.map(i => ({
            id: i.products?.id,
            name: i.products?.name || 'Produit supprimé',
            ps: i.price_unit,
            qty: i.quantity
        }))
    }));
    res.json(formatted);
});

app.post('/api/sales', async (req, res) => {
    const { items, total, versee, monnaie, date, dt, vendor } = req.body;
    
    // 1. Créer la vente
    const { data: saleData } = await supabase.from('sales').insert([{
        total_amount: total, amount_paid: versee, change_returned: monnaie, sale_date: date, sale_time: dt, vendor_role: vendor
    }]).select();
    const saleId = saleData[0].id;

    // 2. Insérer les articles et déduire le stock
    for (const item of items) {
        await supabase.from('sale_items').insert([{
            sale_id: saleId, product_id: item.id, quantity: item.qty, price_unit: item.ps
        }]);
        // Baisse du stock
        const { data: prod } = await supabase.from('products').select('stock_qty').eq('id', item.id).single();
        await supabase.from('products').update({ stock_qty: Math.max(0, prod.stock_qty - item.qty) }).eq('id', item.id);
    }
    
    res.json({ success: true });
});

// --- 5. LOGS ---
app.get('/api/logs', async (req, res) => {
    const { data } = await supabase.from('logs').select('*').order('id', { ascending: false }).limit(100);
    const formatted = data.map(l => ({ id: l.id, action: l.action, color: l.color, time: l.created_at }));
    res.json(formatted);
});

app.post('/api/logs', async (req, res) => {
    const { action, color, time } = req.body;
    await supabase.from('logs').insert([{ action, color, created_at: time }]);
    res.json({ success: true });
});

if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Serveur API demarre sur http://localhost:${PORT}`));
}

module.exports = app;