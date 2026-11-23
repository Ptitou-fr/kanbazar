# Lots de Kanbazar

Découpage de la première version (voir `INTENT.md`) en lots verticaux : un
lot est une chose que l'utilisateur fait de bout en bout, de l'écran à la
base. Les lots se livrent dans l'ordre ; le lot 1 est le plus petit.

Référence visuelle : [Kanbazar — maquette](https://claude.ai/artifact/1BSeZtNKtCjuhUqubGnsBD)
(canevas Claude Design, thème Menthe). Chaque lot cite les artboards qu'il
reproduit.

## Décisions produit

- États : À faire, En cours, Terminé. Une carte créée arrive en bas de
  « À faire ».
- Une carte a un titre obligatoire et une description facultative. Elle
  n'affiche ni identifiant ni date.
- Carte active : ni archivée ni supprimée. Le tableau n'affiche que les
  cartes actives. Pas d'écran des archives.
- Suppression définitive, après confirmation. L'archivage couvre le
  « retirer sans perdre ».
- Déplacement et tri par glisser-déposer, avec une alternative clavier
  (Espace pour saisir et déposer, flèches pour déplacer, Échap pour
  annuler). À la souris, une carte prend la position où on la lâche ; au
  clavier, vers une autre colonne, elle arrive en bas.
- Barre latérale limitée à : logo, « Nouvelle carte », « Tableau »,
  raccourcis vers les colonnes avec leur nombre de cartes, état de
  l'enregistrement, replier. Sur mobile : barre du haut et menu en tiroir.

## Utiliser le canevas

- Avant de coder l'écran d'un lot, lire ses artboards dans le canevas
  (`project/<Nom>.dc.html`) et la feuille de style de la maquette :
  disposition, textes, états, comportement clavier.
- Les traduire en composants shadcn (`components/ui/`, ajoutés avec
  `pnpm dlx shadcn@latest add …`) et en tokens de `app/globals.css`, sans
  recopier le HTML ni le CSS de la maquette.
- Un écart volontaire avec le canevas est noté dans la PR du lot ; s'il est
  validé, le canevas est mis à jour pour rester la référence.
- Un changement de design se fait d'abord dans le canevas, puis dans le code.

## Définition de « terminé » (tous les lots)

- Les critères d'acceptation du lot passent.
- Les modifications s'enregistrent automatiquement, sans bouton
  « Enregistrer » ; un échec est signalé et la modification n'est pas
  présentée comme enregistrée.
- L'écran reproduit les artboards du lot en clair, en sombre et à 390 px de
  large : même disposition, mêmes textes, mêmes états, aux détails des
  composants shadcn près. Vérifié par captures comparées aux artboards.
- Les règles de `.claude/rules/` sont respectées (sections « Comment
  vérifier ») ; les tests des services sont écrits avant le code.
- `pnpm lint`, `pnpm test` et `pnpm build` passent.

## Lot 1 · Créer une carte et la voir sur le tableau

Artboards : Main (tableau, barre latérale, « Ajouter une carte »), Dark,
Editing (formulaire de création et erreur de titre), Mobile, MobileMenu.

J'ouvre Kanbazar et vois la barre latérale et les trois colonnes. Je saisis
un titre, je valide, et la carte apparaît en bas de « À faire ». Elle y est
toujours après rechargement.

- Étant donné un tableau vide, quand j'ouvre l'app, alors je vois la barre
  latérale et les colonnes À faire, En cours et Terminé, sans carte.
- Étant donné le formulaire de création, quand je valide un titre non vide,
  alors la carte apparaît en bas de « À faire » sans action « Enregistrer ».
- Étant donné un titre vide ou fait d'espaces, quand je valide, alors la
  création est refusée avec « Le titre est obligatoire. », côté interface et
  côté service.
- Étant donné une carte créée, quand je recharge la page ou redémarre le
  serveur, alors elle est toujours là, au même endroit.
- Étant donné une base injoignable, quand je crée une carte, alors « Échec
  de l'enregistrement » s'affiche et la carte n'apparaît pas comme
  enregistrée.

## Lot 2 · Modifier le titre et la description d'une carte

Artboards : Editing (panneau d'édition, « Enregistrement… »), Delete (toast
d'échec).

J'ouvre une carte et je change son titre ou j'écris une description. Les
changements s'enregistrent seuls, et la carte affiche le nouveau contenu.

- Étant donné une carte, quand je modifie son titre puis quitte le champ,
  alors le nouveau titre s'affiche et est conservé après rechargement.
- Étant donné une carte, quand j'ajoute ou efface sa description, alors la
  modification est enregistrée automatiquement et conservée après
  rechargement.
- Étant donné une carte, quand je vide son titre, alors la modification est
  refusée avec un message et l'ancien titre reste enregistré.
- Étant donné un enregistrement en échec, quand je modifie une carte, alors
  l'interface signale l'échec et n'affiche pas la modification comme
  enregistrée.

## Lot 3 · Déplacer une carte vers un autre état

Artboards : Main (interactif : glisser-déposer et clavier), Dragging,
Keyboard.

Je fais glisser une carte de « À faire » vers « En cours », ou je la déplace
au clavier. Elle apparaît dans sa nouvelle colonne et y reste après
rechargement.

- Étant donné une carte dans « À faire », quand je la dépose dans « En
  cours », alors elle apparaît dans « En cours » à l'endroit du dépôt.
- Étant donné une carte saisie au clavier avec Espace, quand j'appuie sur →
  puis Espace, alors elle arrive en bas de la colonne suivante et le
  déplacement est annoncé aux lecteurs d'écran.
- Étant donné une carte déplacée, quand je recharge, alors elle est dans sa
  nouvelle colonne, à la même position.
- Étant donné un enregistrement en échec, quand je déplace une carte, alors
  l'erreur est signalée et la carte revient à son état enregistré.

## Lot 4 · Réordonner les cartes d'une colonne

Artboards : Main (interactif), Dragging, Keyboard (↑ ↓).

Dans une colonne, je fais glisser une carte au-dessus d'une autre, ou je la
monte au clavier. Le nouvel ordre s'enregistre et se retrouve après
rechargement.

- Étant donné trois cartes A, B, C dans une colonne, quand je dépose C
  au-dessus de A, alors l'ordre affiché devient C, A, B.
- Étant donné une carte saisie au clavier, quand j'appuie sur ↑ ou ↓, alors
  elle change de position d'un rang ; Échap rétablit l'ordre de départ.
- Étant donné un ordre modifié, quand je recharge, alors l'ordre est le même.
- Étant donné un enregistrement en échec, quand je réordonne, alors l'erreur
  est signalée et l'ordre enregistré est réaffiché.

## Lot 5 · Archiver une carte

Artboards : Main (menu « … » de la carte), Editing (bouton « Archiver » du
panneau), Delete (toast « n'a pas été archivée »).

Sur une carte, je choisis « Archiver ». Elle disparaît du tableau mais reste
enregistrée en base.

- Étant donné une carte active, quand je l'archive, alors elle disparaît du
  tableau sans action « Enregistrer ».
- Étant donné une carte archivée, quand je recharge, alors elle n'apparaît
  plus sur le tableau.
- Étant donné une carte archivée, quand on consulte la base, alors elle y
  est toujours, marquée archivée, avec son contenu, son état et sa position.
- Étant donné un enregistrement en échec, quand j'archive, alors l'erreur est
  signalée et la carte reste sur le tableau.

## Lot 6 · Supprimer une carte définitivement

Artboards : Delete (dialogue de confirmation), Editing (bouton « Supprimer »
du panneau), Main (menu « … »).

Je choisis « Supprimer » sur une carte et je confirme. Elle disparaît du
tableau et de la base ; l'opération n'est pas réversible.

- Étant donné une carte, quand je choisis « Supprimer », alors une
  confirmation indique que la suppression est définitive et propose
  d'archiver à la place.
- Étant donné la confirmation, quand j'annule, alors la carte reste
  inchangée.
- Étant donné la confirmation, quand je confirme, alors la carte disparaît
  du tableau et n'existe plus en base, y compris après rechargement.
- Étant donné un enregistrement en échec, quand je confirme, alors l'erreur
  est signalée et la carte reste sur le tableau.

## Hors lots : préalable au premier déploiement

Déployer sur Vercel avec la base Turso distante, et mettre en place la
restriction d'accès externe (protection Vercel) sur toutes les URL, pour les
pages comme pour les opérations sur les données. Ce n'est pas un parcours
utilisateur, mais aucun lot n'est livré en production sans elle.
