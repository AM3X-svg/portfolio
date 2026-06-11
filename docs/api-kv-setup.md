Configurer l'API globale (Upstash KV + Vercel)

Ce fichier explique comment activer l'API /api/leaderboard.js incluse dans le projet. Le code attend un store KV accessible via une REST API (ex: Upstash Redis REST) et des variables d'environnement sur Vercel.

1) Créer un compte Upstash (ou autre service KV REST)
   - Aller sur https://upstash.com et créer un compte.
   - Créer une database Redis et activer l'API REST.
   - Notez 2 valeurs : "REST API URL" (ex: https://us1-upstash-example.upstash.io) et "REST API Token".

2) Variables d'environnement (Vercel)
   - Sur Vercel (https://vercel.com), importer le repo GitHub et créer un Project.
   - Dans Project Settings > Environment Variables, ajouter :
     - KV_REST_API_URL = (la REST API URL d'Upstash, sans slash final)
     - KV_REST_API_TOKEN = (le token REST d'Upstash)
     - ADMIN_TOKEN = (un token secret arbitraire que tu choisis pour les actions admin comme DELETE)
   - Déployer la branche main (ou la branche de ton choix).

3) Test rapide (après déploiement)
   - Récupérer le site déployé (ex: https://ton-projet.vercel.app)

   - Lister le classement (GET) :
     curl -sS "https://ton-projet.vercel.app/api/leaderboard" | jq

   - Soumettre un score (POST) :
     curl -sS -X POST "https://ton-projet.vercel.app/api/leaderboard" -H "Content-Type: application/json" -d '{"user":"Alice","score":1200}' | jq

   - Effacer le classement (DELETE - admin) :
     curl -sS -X DELETE "https://ton-projet.vercel.app/api/leaderboard" -H "Content-Type: application/json" -d '{"adminToken":"VALEUR_DE_ADMIN_TOKEN"}' | jq

4) Remarques de sécurité
   - Ne pas exposer KV_REST_API_TOKEN côté client. Les variables stockées dans Vercel sont sécurisées côté serveur.
   - Par défaut l'API autorise ORIGIN *. Si besoin, remplacer '*' dans api/leaderboard.js par ton domaine pour restreindre l'accès.
   - ADMIN_TOKEN doit être long et secret.

5) Debug & logs
   - Vercel fournit les logs d'exécution (Dashboard -> Functions) pour voir erreurs lors des appels.
   - Si Upstash retourne une erreur 401/403, vérifie KV_REST_API_TOKEN.

6) Option : utiliser Supabase
   - Si tu préfères Supabase (Postgres), utilises le fichier docs/leaderboard-setup.md déjà présent qui contient la SQL et la méthode pour déployer via /api/leaderboard.js (ancienne version). Le code actuel utilise KV REST - on peut adapter pour Supabase sur demande.

Besoin d'aide ? Si tu veux, je peux :
 - Déployer depuis ce repo vers Vercel (me donne accès) — déconseillé
 - Générer les commandes exactes pour Upstash selon ton compte
 - Adapter l'API pour Supabase (Postgres) si préfères base relationnelle