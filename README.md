# 💊 PHARMACIE-EBEMA

**PHARMACIE-EBEMA** est une Progressive Web App (PWA) de gestion d'officine conçue pour simplifier le suivi des stocks, des ventes et des utilisateurs. Ce projet a été développé dans le cadre d'un cursus d'Ingénierie de la Logistique.

## 🚀 Fonctionnalités
- **Gestion du Stock** : Suivi en temps réel des médicaments.
- **Ventes** : Interface pour l'enregistrement des transactions.
- **Administration** : Configuration des paramètres de la pharmacie et gestion des utilisateurs via la base de données.
- **Architecture PWA** : Accessible sur mobile et desktop avec des capacités hors-ligne (en cours).

## 🛠️ Stack Technique
- **Frontend** : HTML5, CSS3, JavaScript (Vanilla).
- **Backend** : Node.js avec le framework Express.
- **Base de Données** : PostgreSQL / Supabase (configuré dans `server.js`).
- **Déploiement** : Prêt pour Vercel via `vercel.json`.

## 📂 Structure du Projet
```text
Pharmacie-main/
├── api/                # Backend (Node.js/Express)
│   ├── server.js       # Serveur principal et routes API
│   └── index.js        # Point d'entrée pour le déploiement
├── public/             # Fichiers statiques et assets
├── pharmacie.html      # Interface utilisateur principale
├── sql.sql             # Script de création des tables (Settings, Users, etc.)
└── vercel.json         # Configuration du déploiement cloud# PHARMACIE-EBEMA
