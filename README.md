# Plan de Wessel

Un solveur d'équations à inconnue complexe qui trace la géométrie de la solution
dans le plan.

**https://pierremillon.github.io/plan-de-wessel/**

## Le principe

Toute condition acceptée se ramène à une seule forme :

```
A|z|² + 2Re(Wz) + K = 0
```

Droite si `A = 0`, cercle sinon.

Une équation complexe linéaire n'est pas un objet unique : c'est **deux
équations réelles**, sa partie réelle et sa partie imaginaire. Chacune trace une
droite, et la solution est leur intersection. C'est ce que l'app affiche, en plus
du tracé.

Pour `3 + 2z = iz − 4` :

| | |
|---|---|
| Partie réelle | droite `2x + y = −7` |
| Partie imaginaire | droite `x − 2y = 0` |
| Solution | `z = −14/5 − 7i/5` |

## Calculs

Les intersections droite/droite, droite/cercle et cercle/cercle sont résolues en
forme close — système 2×2, trinôme, axe radical. Jamais d'approximation
numérique. Les résultats rationnels sont réécrits en fractions par développement
en fraction continue.

## Entrées acceptées

`z`, `i`, `conj(z)`, `|...|`, `Re()`, `Im()`, produits implicites (`2z`, `iz`),
puissances entières, et une seconde condition optionnelle pour obtenir une
intersection.

Les formes hors du domaine du solveur — `z²`, ellipses `|z−a| + |z−b| = k`,
hyperboles — sont refusées avec un message explicite plutôt que résolues de
travers.

## Le nom

Caspar Wessel a publié la représentation géométrique des nombres complexes en
1797, en danois, dans une revue que personne ne lisait hors du Danemark. Argand
l'a retrouvée en 1806, Gauss en 1831, et ce sont leurs noms qui sont restés.
Celui-ci est pour Wessel.

## Technique

Un seul fichier HTML, aucune dépendance, fonctionne hors ligne. Pensé pour
l'iPhone : clavier de symboles, glisser pour déplacer, pincer pour zoomer.
