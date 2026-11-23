---
paths:
  - "services/**"
---

# Couche service

Concerne `services/`.

## Règles

- Porter les règles métier et les validations qui font autorité. Elles
  s'appliquent côté serveur, même si l'interface contrôle déjà la saisie.
- Accéder aux données persistantes uniquement par les opérations et les
  types exposés par `@/data/*`. Le store est reçu par injection
  (`createXService(store)`), avec une instance par défaut branchée sur la
  vraie couche données.
- Aucun import de React, de Next, de `app/`, de `components/` ni du pilote
  de la base. Chaque fichier commence par `import "server-only"`.
- Les tests sont écrits avant le code :
  1. écrire `services/__tests__/<nom>.test.ts` avec un faux store (objet
     littéral typé avec le type de `@/data/*`, sans base réelle ni UI) ;
  2. le lancer et le voir échouer pour la bonne raison ;
  3. écrire le code du service jusqu'à ce qu'il passe.
- Une règle métier sans test n'est pas terminée.

## Comment vérifier

```bash
pnpm test services/__tests__/<nom>.test.ts
```
À lancer avant l'implémentation (doit échouer), puis après (doit passer).

```bash
for f in services/*.ts; do t="services/__tests__/$(basename "${f%.ts}").test.ts"; [ -f "$t" ] || echo "sans test : $f"; done
```
Ne doit rien afficher : chaque service a son fichier de test.

```bash
for f in services/*.ts; do head -1 "$f" | grep -q '^import "server-only";' || echo "sans server-only : $f"; done
```
Ne doit rien afficher.

```bash
pnpm lint && pnpm test
```
