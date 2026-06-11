Guide rapide pour activer le leaderboard global (Supabase + Vercel)

1) Créer un projet Supabase
   - Aller sur https://supabase.com et créer un projet gratuit.

2) Créer la table SQL
   - Dans SQL editor de Supabase, exécuter :

    -- Remarque : "user" est un mot réservé en PostgreSQL. Utiliser "username" ci-dessous
    create table if not exists leaderboard (
      id bigserial primary key,
      username text not null,
      score integer not null,
      date timestamptz default now()
    );

  -- Si tu préfères garder la colonne `user`, il faut la citer :
  -- create table leaderboard ("user" text not null, score integer not null, date timestamptz default now());

   - Donner les permissions si besoin (pour tests, la clé anon peut suffire si les règles le permettent). Pour production, créer une policy permettant INSERT/SELECT depuis la clé que vous utilisez.

3) Récupérer les variables d'environnement
   - SUPABASE_URL : l'URL de votre projet (ex: https://xyz.supabase.co)
   - SUPABASE_KEY : la clé (service_role ou anon selon les règles). Pour écriture depuis le serveur, utilisez une clé avec droits d'écriture (service_role) et gardez-la secrète.

4) Déployer sur Vercel
   - Déposer ce repo sur GitHub puis connecter à Vercel.
   - Dans les Settings de la Project > Environment Variables, ajouter SUPABASE_URL et SUPABASE_KEY pour les environnements (Production).
   - Le fichier /api/leaderboard.js (présent dans le repo) agit comme proxy vers Supabase. Aucun autre changement n'est nécessaire.

5) Tester
   - Ouvrir le site déployé et dans le panneau 2048 : se connecter avec un pseudo, jouer, et cliquer "Soumettre score". Vous devriez voir le score apparaître dans le classement global (rafraîchir si besoin).

Remarques de sécurité
   - Ne publiez jamais la clé `service_role` côté client. Le fichier `api/leaderboard.js` utilise la clé côté serveur (Vercel env vars) et ne l'expose pas au client.
   - Pour un usage public, configurez des Row Level Security (RLS) afin de limiter ce que la clé publique peut faire et éviter les insertions massives.

Si tu veux, je peux :
 - Générer automatiquement la requête SQL à exécuter dans Supabase UI
 - Ajouter suppression / validation côté serveur (admin)
 - Déployer pour toi si tu me fournis les accès (non recommandé)