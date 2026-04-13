const express = require('express');
const { createClient } = require('@supabase/supabase-app'); // Assurez-vous d'utiliser le bon package
const app = express();

app.use(express.json());

// Configuration Supabase via les variables d'environnement Vercel
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
// const supabase = createClient(supabaseUrl, supabaseKey); 

// Vos routes API ici...
app.get('/api/settings', async (req, res) => {
    // Logique pour récupérer les réglages
    res.json({ phn: "Pharmacie Plus Pro" });
});

// IMPORTANT : Pour Vercel, on n'utilise pas app.listen()
// On exporte l'application
module.exports = app;