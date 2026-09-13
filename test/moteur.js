/* Tests du moteur de calcul de Plan de Wessel.
 *
 *   node test/moteur.js
 *
 * Le moteur vit dans index.html, entre le « use strict » et la section
 * « 9. Ecran ». On l'extrait tel quel et on l'exécute hors navigateur :
 * il ne touche ni au DOM ni au canevas. Si les repères de découpe ne sont
 * plus trouvés, le test s'arrête net plutôt que de tester le vide.
 */
"use strict";

const fs = require("fs");
const vm = require("vm");
const path = require("path");

/* ---------- extraction ---------- */
function moteur() {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const reperes = ['"use strict";', "   9. Ecran", "/* --- écriture d'un complexe entier", "const caseDe ="];
  for (const r of reperes) {
    if (html.indexOf(r) < 0) throw new Error("repère introuvable dans index.html : " + r);
  }
  const debut = html.indexOf('"use strict";');
  const finCalcul = html.lastIndexOf("/* ===", html.indexOf("   9. Ecran"));
  const g0 = html.indexOf("/* --- écriture d'un complexe entier");
  const g1 = html.indexOf("const caseDe =");
  const source = html.slice(debut, finCalcul) +
    "\nconst ZONE = { min: -4.5, n: 9 };\n" +
    html.slice(g0, g1) +
    "\n;({ analyse, solveAll, kKind, kCircle, conicEq2html, K, entiers, Err, tirerExercice })";
  return vm.runInThisContext(source, { filename: "moteur-extrait.js" });
}
const M = moteur();

/* ---------- utilitaires ---------- */
let reussis = 0, echoues = 0;
const arrondi = (x, n) => Math.round(x * Math.pow(10, n)) / Math.pow(10, n);

function titre(t) { console.log("\n-- " + t + " --"); }
function verifie(nom, obtenu, attendu) {
  const a = JSON.stringify(obtenu), b = JSON.stringify(attendu);
  if (a === b) { reussis++; console.log("  ok    " + nom); }
  else { echoues++; console.log("  ÉCHEC " + nom + "\n        obtenu  " + a + "\n        attendu " + b); }
}
function refuse(nom, src) {
  try { M.analyse(src); echoues++; console.log("  ÉCHEC " + nom + " : accepté alors qu'il fallait refuser"); }
  catch (e) { reussis++; console.log("  ok    " + nom + " (" + (e.message || e) + ")"); }
}

const resous = (...srcs) => M.solveAll(srcs.filter(Boolean).map(M.analyse));
const nature = (...srcs) => { try { return resous(...srcs).kind; } catch (e) { return "refus"; } };
function points(sol, n) {
  if (sol.kind !== "points") return sol.kind;
  return sol.pts.map(z => [arrondi(z.re, n || 6), arrondi(z.im, n || 6)])
                .sort((u, v) => u[0] - v[0] || u[1] - v[1]);
}
const p = (...couples) => couples.map(c => [arrondi(c[0], 6), arrondi(c[1], 6)]).sort((u, v) => u[0] - v[0] || u[1] - v[1]);
const R3 = Math.sqrt(3), R2 = Math.SQRT2;

/* ================================================================== */
titre("équations linéaires : le cœur du cours");
verifie("3 + 2z = iz - 4", points(resous("3 + 2z = iz - 4")), p([-2.8, -1.4]));
verifie("(1+i)z + conj(z) = 3 + i", points(resous("(1+i)z + conj(z) = 3 + i")), p([1, -1]));
verifie("z = 3 + 4i", points(resous("z = 3 + 4i")), p([3, 4]));
verifie("2(z+1) = 4i", points(resous("2(z+1) = 4i")), p([-1, 2]));
verifie("z/(1+i) = 2", points(resous("z/(1+i) = 2")), p([2, 2]));
verifie("conj(z) = 2 - 3i", points(resous("conj(z) = 2 - 3i")), p([2, 3]));
verifie("décomposition en deux droites",
  M.analyse("3 + 2z = iz - 4").curves.map(k => k.part), ["Partie réelle", "Partie imaginaire"]);

titre("racines n-ièmes et second degré : exacts");
verifie("z^2 = 4", points(resous("z^2 = 4")), p([-2, 0], [2, 0]));
verifie("z^3 = 8", points(resous("z^3 = 8")), p([2, 0], [-1, R3], [-1, -R3]));
verifie("z^4 = -1 : quatre racines", resous("z^4 = -1").pts.length, 4);
verifie("z^4 = -1 : annoncé exact", resous("z^4 = -1").approx, false);
verifie("z^5 = 1 : toutes de module 1",
  resous("z^5 = 1").pts.every(z => Math.abs(Math.hypot(z.re, z.im) - 1) < 1e-12), true);
verifie("z^2 + z + 1 = 0", points(resous("z^2 + z + 1 = 0")), p([-0.5, R3 / 2], [-0.5, -R3 / 2]));
verifie("z^2 = 0", points(resous("z^2 = 0")), p([0, 0]));
verifie("z^2 = 4 trace deux hyperboles", M.analyse("z^2 = 4").curves.map(M.kKind), ["hyperbole", "hyperbole"]);

titre("degré 3 général : approché, et annoncé comme tel");
verifie("z^3 + z + 1 = 0 : trois racines", resous("z^3 + z + 1 = 0").pts.length, 3);
verifie("z^3 + z + 1 = 0 : marqué approché", resous("z^3 + z + 1 = 0").approx, true);
verifie("z^3 + z + 1 = 0 : racine réelle",
  arrondi(resous("z^3 + z + 1 = 0").pts.filter(z => Math.abs(z.im) < 1e-9)[0].re, 6), -0.682328);

titre("droites et cercles");
verifie("|z-1| = 2 et Re(z) = 1", points(resous("|z-1| = 2", "Re(z) = 1")), p([1, 2], [1, -2]));
verifie("|z-1| = |z-i| et |z| = 2", points(resous("|z-1| = |z-i|", "|z| = 2")), p([R2, R2], [-R2, -R2]));
verifie("z conj(z) = 4 et Im(z) = 1", points(resous("z*conj(z) = 4", "Im(z) = 1")), p([R3, 1], [-R3, 1]));
verifie("droites parallèles", nature("Re(z) = 1", "Re(z) = 2"), "empty");
verifie("|z-1| = -1 : impossible", nature("|z-1| = -1"), "empty");
verifie("|z-1| = 0 : un point", M.kKind(M.analyse("|z-1| = 0").curves[0]), "point");
verifie("z + conj(z) = i : impossible", nature("z + conj(z) = i"), "empty");
verifie("|z| = 2 et |z| = 3", nature("|z| = 2", "|z| = 3"), "empty");
verifie("|z| = 2 et |z| = 2", nature("|z| = 2", "|z| = 2"), "curve");

titre("coniques");
verifie("ellipse |z-1| + |z+1| = 4", M.kKind(M.analyse("|z-1| + |z+1| = 4").curves[0]), "ellipse");
verifie("ellipse et Im(z) = 1", points(resous("|z-1| + |z+1| = 4", "Im(z) = 1")),
  p([Math.sqrt(8 / 3), 1], [-Math.sqrt(8 / 3), 1]));
verifie("ellipse impossible |z-1| + |z+1| = 1", nature("|z-1| + |z+1| = 1"), "empty");
verifie("parabole |z| = Re(z) + 2", M.kKind(M.analyse("|z| = Re(z) + 2").curves[0]), "parabole");
verifie("parabole et Im(z) = 2", points(resous("|z| = Re(z) + 2", "Im(z) = 2")), p([0, 2]));
verifie("hyperbole |z-2| - |z+2| = 2", M.kKind(M.analyse("|z-2| - |z+2| = 2").curves[0]), "hyperbole");
verifie("hyperbole : une seule branche", points(resous("|z-2| - |z+2| = 2", "Im(z) = 0")), p([-1, 0]));
verifie("cercle x ellipse : quatre points", resous("|z| = 1.8", "|z-1| + |z+1| = 4").pts.length, 4);
verifie("cercle x ellipse : approché", resous("|z| = 1.8", "|z-1| + |z+1| = 4").approx, true);
verifie("cercle intérieur à l'ellipse", nature("|z| = 1", "|z-1| + |z+1| = 4"), "empty");

titre("tangences : le point de contact doit être trouvé");
verifie("cercle et droite tangente", points(resous("|z| = 1", "Re(z) = 1")), p([1, 0]));
verifie("cercle et droite tangente (haut)", points(resous("|z| = 2", "Im(z) = 2")), p([0, 2]));
verifie("deux cercles tangents", points(resous("|z| = 1", "|z - 2| = 1")), p([1, 0]));
verifie("ellipse et droite tangente", points(resous("|z-1| + |z+1| = 4", "Re(z) = 2")), p([2, 0]));
verifie("lemniscate et sa tangente au sommet",
  points(resous("|z-1| * |z+1| = 1", "Re(z) = 1.414213562373095"), 3), p([1.414214, 0]).map(c => [arrondi(c[0], 3), arrondi(c[1], 3)]));

titre("repli numérique : accepté, et annoncé approché");
verifie("poids différents |z-1| + 2|z+1| = 4",
  points(resous("|z-1| + 2|z+1| = 4", "Im(z) = 0"), 4), p([-5 / 3, 0], [1, 0]).map(c => [arrondi(c[0], 4), arrondi(c[1], 4)]));
verifie("  marqué approché", resous("|z-1| + 2|z+1| = 4", "Im(z) = 0").approx, true);
verifie("sans solution |z-1| + |z+1| = Re(z)", nature("|z-1| + |z+1| = Re(z)", "Im(z) = 0"), "empty");
verifie("lemniscate |z-1| |z+1| = 1",
  points(resous("|z-1| * |z+1| = 1", "Im(z) = 0"), 4), p([-R2, 0], [0, 0], [R2, 0]).map(c => [arrondi(c[0], 4), arrondi(c[1], 4)]));
verifie("Cassini |z-1| |z+1| = 2",
  points(resous("|z-1| * |z+1| = 2", "Im(z) = 0"), 4), p([-R3, 0], [R3, 0]).map(c => [arrondi(c[0], 4), arrondi(c[1], 4)]));
verifie("racine double (|z|-1)^2 = 0", points(resous("(|z| - 1)^2 = 0", "Im(z) = 0"), 4), p([-1, 0], [1, 0]));

titre("inégalités et régions");
verifie("|z-1| <= 2 seul", nature("|z-1| <= 2"), "region");
verifie("|z-1| <= 2 et Re(z) = 1", nature("|z-1| <= 2", "Re(z) = 1"), "arc");
verifie("anneau 1 <= |z| <= 2", nature("|z| <= 2", "|z| >= 1"), "region");
verifie("z^2 = 4 et Re(z) > 0", points(resous("z^2 = 4", "Re(z) > 0")), p([2, 0]));
verifie("z^3 = 8 et Im(z) < 0", resous("z^3 = 8", "Im(z) < 0").pts.length, 1);
verifie("cercle, droite, moitié haute",
  points(resous("|z-1| = 2", "Re(z) = 1", "Im(z) > 0")), p([1, 2]));
verifie("arc vide : Re(z) = 1 et Re(z) > 5", nature("Re(z) = 1", "Re(z) > 5"), "empty");
verifie("arc réel : |z-1| = 2 et Im(z) > 0", nature("|z-1| = 2", "Im(z) > 0"), "arc");
verifie("région impossible |z| < |z|", nature("|z| < |z|"), "empty");
verifie("région impossible |z| < -1", nature("|z| < -1"), "empty");
verifie("régions disjointes", nature("|z| <= 2", "|z| >= 5"), "empty");
verifie("demi-plan Re(z) > 0", nature("Re(z) > 0"), "region");
verifie("disque lointain |z - 100| <= 1", nature("|z - 100| <= 1"), "region");
verifie("disque très lointain |z - 5000| <= 2", nature("|z - 5000| <= 2"), "region");
verifie("demi-plan lointain Re(z) > 900", nature("Re(z) > 900"), "region");
verifie("disques disjoints", nature("|z - 100| <= 1", "|z| <= 1"), "empty");

titre("écriture des résultats");
const propre = (h) => h.replace(/<[^>]+>/g, " ").replace(/&minus;/g, "-").replace(/&sup2;/g, "2").replace(/\s+/g, " ").trim();
verifie("coefficients ramenés à des entiers", M.entiers([1, -1.125, -0.875]), [8, -9, -7]);
verifie("droite écrite en entiers", propre(M.conicEq2html(M.K(0, 0, 0, 1, -1.125, 0.875))), "8x - 9y = -7");
verifie("les deux droites de 3 + 2z = iz - 4",
  M.analyse("3 + 2z = iz - 4").curves.map(k => propre(M.conicEq2html(k))), ["2x + y = -7", "x - 2y = 0"]);
verifie("ellipse réduite", propre(M.conicEq2html(M.analyse("|z-1| + |z+1| = 4").curves[0])), "3x2 + 4y2 = 12");

titre("refus explicites");
refuse("symbole inconnu", "z^2*conj(z) = 1x");
refuse("pas de comparateur", "3z");
refuse("deux comparateurs", "2 = = 3");
refuse("caractère inattendu", "|z| = ?");
refuse("comparaison de complexes", "z < 1");
refuse("expression incomplète", "z =");
refuse("parenthèse non fermée", "Re() = 1");

titre("le générateur du quiz");
let tires = 0, bons = 0;
for (let i = 0; i < 300; i++) {
  const ex = M.tirerExercice();
  if (!ex) continue;
  tires++;
  const sol = M.solveAll([M.analyse(ex.src1)].concat(ex.src2 ? [M.analyse(ex.src2)] : []));
  const juste = sol.kind === "points" && sol.pts.length === ex.sols.length &&
    ex.sols.every(w => sol.pts.some(z => Math.hypot(z.re - w.re, z.im - w.im) < 1e-9));
  if (juste) bons++;
  else console.log("  ÉCHEC tirage : " + ex.src1 + (ex.src2 ? "  et  " + ex.src2 : ""));
}
verifie("300 tirages tous résolubles", tires, 300);
verifie("300 tirages tous justes", bons, 300);

titre("robustesse : expressions aléatoires");
const pioche = (t) => t[Math.floor(Math.random() * t.length)];
function atome(prof) {
  const t = Math.floor(Math.random() * 6);
  if (t === 0) return "z";
  if (t === 1) return "conj(z)";
  if (t === 2) return String(Math.floor(Math.random() * 9) - 4);
  if (t === 3) return pioche(["i", "2i", "-i", "3i"]);
  if (t === 4) return prof > 0 ? "|" + expression(prof - 1) + "|" : "z";
  return prof > 0 ? pioche(["Re(", "Im("]) + expression(prof - 1) + ")" : "1";
}
function expression(prof) {
  if (prof <= 0 || Math.random() < 0.3) return atome(prof);
  const g = expression(prof - 1), d = expression(prof - 1), op = pioche(["+", "-", "*", "+", "-"]);
  return Math.random() < 0.3 ? "(" + g + " " + op + " " + d + ")" : g + " " + op + " " + d;
}
let plantages = 0, aberrants = 0;
for (let i = 0; i < 1500; i++) {
  const srcs = [];
  const combien = Math.random() < 0.45 ? 2 : 1;
  for (let k = 0; k < combien; k++)
    srcs.push(expression(2) + " " + pioche(["=", "=", "=", "<=", ">=", "<", ">"]) + " " + expression(2));
  let conds;
  try { conds = srcs.map(M.analyse); }
  catch (e) { if (!e || typeof e.message !== "string") { plantages++; console.log("  plantage nu : " + srcs.join(" | ")); } continue; }
  let sol;
  try { sol = M.solveAll(conds); }
  catch (e) { plantages++; console.log("  plantage solveAll : " + srcs.join(" | ")); continue; }
  if (sol.kind === "points")
    for (const z of sol.pts)
      if (!isFinite(z.re) || !isFinite(z.im) || Math.abs(z.re) > 1e9 || Math.abs(z.im) > 1e9) {
        aberrants++;
        console.log("  point aberrant : " + srcs.join(" | "));
        break;
      }
}
verifie("1500 expressions sans plantage", plantages, 0);
verifie("1500 expressions sans point aberrant", aberrants, 0);

/* ================================================================== */
console.log("\n" + reussis + " réussis, " + echoues + " échoués\n");
process.exit(echoues ? 1 : 0);
