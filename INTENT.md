# Intention - projet Kanbazar

Auteur : Patrick (le « je » de ce fichier)
Portée : tout le dépôt du projet Kanbazar
Dernière vérification par Patrick du texte source : 2026-11-22
Statut : proposition de révision du 2026-11-22, à valider par Patrick

## Produit

Kanbazar est un mini Kanban destiné à une petite équipe de développeurs.
Une carte représente une tâche ; une colonne représente un état de son avancement.

Pour sa première version, l’application permet uniquement de :
- créer et modifier une carte ;
- visualiser les cartes selon leur état ;
- déplacer une carte d’un état à un autre ;
- ordonner les cartes ;
- archiver ou supprimer une carte ;
- enregistrer automatiquement les modifications.

« Mini » signifie que le périmètre fonctionnel est strictement limité à cette liste.

## Architecture

Trois couches, dépendances dans un seul sens : présentation → service → données.

- **Présentation** : 

    - Gère l’affichage, les interactions et les états d’attente ou d’erreur.
    - Ne contient aucune règle métier.
    - Passe par la couche service pour lire ou modifier les données ; n’accède jamais directement à la couche données ni à la base.
    - Respecte cette séparation même lorsque des composants de présentation s’exécutent côté serveur.
    - Les points d’entrée Next.js éventuellement utilisés, tels que les Server Actions ou les Route Handlers, adaptent les requêtes et les réponses et délèguent aux services. Ils ne contiennent ni règles métier ni accès direct à la couche données.

- **Service** : 

    - Contient les règles métier et les validations qui font autorité.
    - Fait appliquer ces règles côté serveur, même lorsqu’un contrôle de saisie existe aussi dans l’interface.
    - Utilise exclusivement la couche données pour accéder aux données persistantes.
    - Ne dépend pas de la présentation et n’accède jamais directement à la base.

- **Données** :

    - Est la seule couche qui communique avec la base SQLite via Turso.
    - S’exécute exclusivement côté serveur.
    - Regroupe les requêtes, le pilote et les éléments spécifiques au moteur de stockage ou à un éventuel ORM.
    - Expose aux services des opérations et des types indépendants du moteur de stockage.
    - Ne dépend ni de la couche service ni de la présentation.

La base doit pouvoir être remplacée sans modifier la présentation ni les règles métier.
Les adaptations concernent la couche données et, si nécessaire, la configuration et la migration des données.

Au minimum, les règles métier mises en œuvre sont couvertes par des tests unitaires exécutables sans interface utilisateur ni base de données réelle.

## Contraintes

Imposé :

- framework : Next.js ;
- composants de présentation : shadcn/ui ;
- base de données : SQLite via Turso ;
- déploiement : Vercel ;
- accès : application non publique, avec une restriction assurée en dehors du code de l’application.

La restriction externe doit couvrir les pages et les points d’entrée de lecture et de modification des données, sur toutes les URL permettant d’accéder à l’application déployée.

En environnement déployé, les données enregistrées sont conservées dans la base distante hébergée sur Turso, indépendamment des instances et des redéploiements de l’application. L’intégration doit être compatible avec Vercel.

Les choix techniques non imposés par ce fichier sont laissés à l’agent, dans le respect du périmètre et des contraintes.

## Hors périmètre

- Gestion des utilisateurs dans la première version.
- Authentification dans le code de l’application.
- gestion de droits
- Toute fonctionnalité qui n’est pas explicitement prévue dans la section « Produit ».

Ne pas ajouter ces fonctionnalités de sa propre initiative, même partiellement ou par précaution.
Les détails produit non définis seront décidés avec Patrick au fil des itérations.

## Critères d'acceptation

Fonctionnement: 

- Lorsque je crée une carte, elle apparaît dans la colonne correspondant à son état initial convenu.
- Lorsque je modifie une carte, son contenu affiché reflète la modification enregistrée.
- Lorsque je change l’état d’une carte, elle apparaît dans la colonne correspondant à son nouvel état.
- Le tableau affiche toutes les cartes actives, selon la définition validée avec Patrick, dans les colonnes correspondant à leur état.
- Lorsque je change l’ordre des cartes, le nouvel ordre est conservé après rechargement.
- Lorsque j’archive une carte, elle est retirée du tableau actif tout en restant enregistrée.
- Lorsque je supprime une carte, elle n’apparaît plus dans le tableau actif, y compris après rechargement. Le caractère définitif ou réversible de cette suppression reste à définir.
- Les modifications sont enregistrées automatiquement, sans action distincte « Enregistrer ».
- Si un enregistrement échoue, l’interface le signale et ne présente pas la modification comme enregistrée.
- Après rechargement, redémarrage ou redéploiement, les données enregistrées sont conservées : cartes, contenu, états, ordre et archivage.

Architecture et qualité: 

- Aucun code situé hors de la couche données n’importe le pilote ou les types spécifiques à la base et n’exécute de requête vers celle-ci.
- La présentation passe par les services, y compris pour la lecture des données.
- Les règles métier mises en œuvre disposent de tests unitaires.
- Tous les tests et la compilation de production passent.
- L’application déployée respecte la restriction d’accès externe, pour les pages comme pour les opérations sur les données.