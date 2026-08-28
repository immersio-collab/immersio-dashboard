/**
 * Correction editoriale des titres et descriptions SEO.
 *
 *   node scripts/fix-seo-titles.mjs [--apply]
 *
 * Trois defauts, tous visibles dans les SERP avant cette correction :
 *
 *   1. Les titres portaient deja "| Immersio" (ou "| Portfolio Immersio"),
 *      que le title.template du site redoublait : "... | Immersio | Immersio."
 *   2. 38 titres de blog etaient coupes en pleine phrase par des points de
 *      suspension, et 33 descriptions de blog, plus 8 du portfolio.
 *   3. Les titres rendus depassaient tous la limite d affichage de Google.
 *
 * Budget : 48 caracteres, soit 60 moins le suffixe " | Immersio." ajoute par
 * le template du site.
 *
 * Idempotent : reecrit les memes valeurs si relance.
 */

import fs from "node:fs";
import path from "node:path";

const APPLY = process.argv.includes("--apply");
const root = path.resolve(import.meta.dirname, "..");

const env = {};
for (const line of fs.readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i < 0) continue;
  env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}
const SB = env.NEXT_PUBLIC_SUPABASE_URL;
const H = {
  apikey: env.SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
};

// ── Titres de blog reecrits, cles par slug ──────────────────────────────────
const BLOG_TITLES = {
  "3d-aesthetic-clinic-tours-reassuring-patients-before-visit": "3D Clinic Tours Morocco: Reassure Patients",
  "3d-scan-vs-photo-quelle-option-pour-presenter-votre-espace": "3D Scan ou Photo : Quelle Option Choisir ?",
  "comment-attirer-plus-de-clients-pour-votre-salle-des-fetes": "Salle des Fêtes : Attirer Plus de Clients",
  "comment-augmenter-les-reservations-de-votre-hotel-au-maroc": "Hôtel au Maroc : Augmenter vos Réservations",
  "comment-presenter-un-riad-marocain-en-3d-guide-complet": "Présenter un Riad Marocain en 3D : Guide",
  "comment-vendre-plus-avec-une-visite-3d-pour-showroom-maroc": "Showroom Maroc : Vendre Plus en Visite 3D",
  "creation-dun-tour-virtuel-guide-etape-par-etape": "Créer un Tour Virtuel : Guide Étape par Étape",
  "dental-practice-virtual-tour-easing-patient-anxiety": "Dental Practice 3D Tour: Ease Patient Anxiety",
  "digital-heritage-morocco-preserving-and-promoting-culture": "Digital Heritage Morocco: Preserve Culture",
  "how-to-attract-more-clients-for-your-event-venue-with-a-3d": "Event Venue: Attract More Clients with 3D",
  "how-to-present-a-moroccan-riad-in-3d-complete-guide": "Present a Moroccan Riad in 3D: Full Guide",
  "how-to-sell-more-with-a-3d-tour-for-your-showroom-in-morocco": "Showroom Morocco: Sell More with a 3D Tour",
  "interactive-store-tour-boost-your-sales-in-2026": "Interactive Store Tour: Boost Sales in 2026",
  "medical-tourism-morocco-reassuring-international-patients": "Medical Tourism Morocco: Reassure Patients",
  "musee-virtuel-maroc-comment-numeriser-votre-institution": "Musée Virtuel : Numériser votre Institution",
  "off-plan-property-morocco-selling-vefa-with-a-3d-tour": "Off-Plan Morocco: Sell VEFA with a 3D Tour",
  "office-space-virtual-tour-casablanca-lease-faster": "Office Tour Casablanca: Lease Floors Faster",
  "patrimoine-numerique-maroc-preserver-et-promouvoir-la": "Patrimoine Numérique : Préserver la Culture",
  "reservations-hotel-3d-comment-la-technologie-booste-vos": "Réservations Hôtel 3D : Booster Vos Ventes",
  "riad-3d-au-maroc-12-exemples-de-visites-virtuelles": "Riad 3D au Maroc : 12 Visites Virtuelles",
  "riad-virtual-tour-on-google-maps-direct-bookings": "Riad Tour on Google Maps: Direct Bookings",
  "showroom-3d-maroc-la-revolution-du-commerce-virtuel": "Showroom 3D Maroc : Le Commerce Virtuel",
  "tour-3d-lieu-de-mariage-seduisez-les-couples-a-distance": "Lieu de Mariage 3D : Séduire à Distance",
  "tour-interactif-magasin-boostez-vos-ventes-en-2026": "Tour Interactif Magasin : Ventes en 2026",
  "tour-virtuel-riad-methode-48-h-pour-plus-de-reservations": "Tour Virtuel Riad : la Méthode 48 h",
  "tourisme-medical-maroc-rassurer-patients-internationaux": "Tourisme Médical Maroc : Rassurer en 3D",
  "vente-sur-plan-maroc-vendre-en-vefa-avec-une-visite-3d": "Vente sur Plan Maroc : Vendre en VEFA en 3D",
  "virtual-museum-morocco-how-to-digitize-your-cultural": "Virtual Museum Morocco: Digitize Culture",
  "virtual-showroom-tour-how-to-present-your-products-online": "Virtual Showroom: Present Products Online",
  "visite-virtuelle-3d-reduire-lhesitation-a-la-reservation": "Visite 3D : Réduire l'Hésitation Hôtel",
  "visite-virtuelle-bureaux-casablanca-louer-plus-vite": "Bureaux Casablanca : Louer Plus Vite en 3D",
  "visite-virtuelle-cabinet-dentaire-apaiser-anxiete-patients": "Cabinet Dentaire 3D : Apaiser l'Anxiété",
  "visite-virtuelle-riad-google-maps-reservations-directes": "Riad sur Google Maps : Réservations Directes",
  "visite-virtuelle-riad-marrakech-reservez-sans-hesiter": "Visite Riad Marrakech : Réservez Sans Hésiter",
  "visite-virtuelle-riad-tout-voir-avant-de-reserver": "Visite Riad : Tout Voir Avant de Réserver",
  "visite-virtuelle-salle-de-mariage-maroc-pour-planificateurs": "Salle de Mariage Maroc : Visite Virtuelle 3D",
  "visite-virtuelle-salle-devenement-attirez-plus-de-clients": "Salle d'Événement : Attirez Plus de Clients",
  "visite-virtuelle-showroom-comment-presenter-vos-produits-en": "Visite Showroom : Présenter vos Produits",

  // Ceux-ci n etaient pas tronques, mais depassent le budget une fois la
  // marque retiree.
  "how-to-increase-hotel-bookings-in-morocco-with-a-3d-tour": "Increase Hotel Bookings in Morocco with 3D",
  "location-immobiliere-au-maroc-louer-a-distance-visite-3d": "Location Maroc : Louer à Distance en 3D",
  "riad-virtual-tour-marrakech-book-with-confidence": "Riad Tour Marrakech: Book with Confidence",
  "riad-virtual-tour-see-everything-before-you-book": "Riad Tour: See Everything Before You Book",
  "virtual-tour-builds-trust-bookings-wellness-center": "Wellness Center Tour Morocco: Build Trust",
  "visite-virtuelle-360-annonce-immobiliere-maroc-boost": "Immobilier Maroc : Vendre Plus Vite en 3D",
};

// ── Descriptions de blog completees, cles par slug ──────────────────────────
const BLOG_DESCS = {
  "3d-scan-vs-photo-which-option-to-present-your-space":
    "3D scan or professional photography? We break down both options for hotels, riads and showrooms in Morocco so you can choose the right format.",
  "3d-showroom-morocco-the-virtual-commerce-revolution":
    "A 3D showroom in Morocco works 24/7 to attract local and international buyers. See how product tags, analytics and 48h delivery pay off.",
  "3d-virtual-tour-reduce-hotel-booking-hesitation":
    "Most hotel visitors leave without booking — not because of price, but doubt. A 3D virtual tour removes it and turns browsers into direct bookings.",
  "3d-wedding-venue-tour-attract-couples-from-anywhere":
    "Couples book wedding venues in Morocco without visiting first. A 3D tour lets them explore every space, builds trust, and shortens your sales cycle.",
  "digital-heritage-morocco-preserving-and-promoting-culture":
    "Morocco's cultural heritage is at risk. Discover how digital preservation and 3D virtual tours protect and promote it for future generations.",
  "event-venue-virtual-tour-attract-more-clients":
    "Planners book event venues remotely. A 3D virtual tour answers their questions 24/7, shortens your sales cycle, and drives more qualified inquiries.",
  "how-to-attract-more-clients-for-your-event-venue-with-a-3d":
    "Couples and planners book event venues without visiting first. A 3D virtual tour works 24/7 to show your space, answer questions, and drive bookings.",
  "how-to-create-a-virtual-tour-step-by-step-guide":
    "Everything you need to create a professional virtual tour: gear, capture workflow, post-production, hosting, and how to embed it on your site.",
  "how-to-increase-hotel-bookings-in-morocco-with-a-3d-tour":
    "3D virtual tours increase direct hotel bookings in Morocco. Here's how to produce, integrate and measure yours to turn it into a commercial asset.",
  "interactive-store-tour-boost-your-sales-in-2026":
    "An interactive store tour increases time on site by 5-10x, drives qualified visits, and reduces returns. Here's how to set one up and measure it.",
  "riad-virtual-tour-see-everything-before-you-book":
    "Before booking a riad in Morocco, use a virtual tour to assess real room size, patio light, staircase access, and every space that photos never show.",
  "virtual-museum-morocco-how-to-digitize-your-cultural":
    "Moroccan museums can now reach global audiences 24/7. Here's how to create a virtual museum in Morocco — technology, process, costs and results.",
  "wedding-venue-virtual-tour-morocco-for-planners":
    "Event planners can now shortlist Moroccan wedding venues remotely with 3D virtual tours. Here's a professional checklist and where to start.",
  "comment-presenter-un-riad-marocain-en-3d-guide-complet":
    "Un riad se dévoile de l'intérieur. Découvrez comment présenter le vôtre en visite virtuelle 3D : patio, chambres, terrasse, chaque espace en immersion.",
};

// ── Titres du portfolio, cles par "slug|language" ───────────────────────────
// Les quatre deja conformes ("X Ville | Visite Virtuelle 3D") ne sont pas
// touches ; les dix autres suivaient "| Portfolio Immersio" et tombaient a
// 15-24 caracteres une fois la marque retiree.
const PORTFOLIO_TITLES = {
  "appartement-luxe-rabat|French": "Appartement de Luxe Rabat | Visite Virtuelle 3D",
  "appartement-luxe-rabat|English": "Luxury Apartment Rabat | 3D Virtual Tour",
  "clinique-identist|French": "Clinique iDentist Essaouira | Visite 3D",
  "identist-clinic|English": "iDentist Clinic Essaouira | 3D Virtual Tour",
  "fitness-club|French": "Fitness Club Elite Agadir | Visite Virtuelle 3D",
  "fitness-club|English": "Fitness Club Elite Agadir | 3D Virtual Tour",
  "showroom-mobilier-casa|French": "Showroom Mobilier Casablanca | Visite 3D",
  "showroom-mobilier-casa|English": "Furniture Showroom Casablanca | 3D Tour",
  "villa-moderne-casablanca|French": "Villa Moderne Anfa Casablanca | Visite 3D",
  "villa-moderne-casablanca|English": "Modern Villa Anfa Casablanca | 3D Tour",

  // Deja sans marque dupliquee, mais trop longs pour la limite d affichage.
  "cabinet-gastroenterologie|French": "Cabinet Gastro-entérologie Kénitra | Visite 3D",
  "gastroenterology-clinic|English": "Gastroenterology Kénitra | 3D Virtual Tour",
};

// ── Descriptions du portfolio, cles par "slug|language" ─────────────────────
const PORTFOLIO_DESCS = {
  "appartement-luxe-rabat|English":
    "Step inside a premium apartment in the heart of Rabat. This immersive experience showcases the sophisticated interior design and spacious balconies.",
  "appartement-luxe-rabat|French":
    "Entrez dans un appartement de prestige au cœur de Rabat. Cette expérience immersive met en valeur le design intérieur et les balcons spacieux.",
  "cabinet-gastroenterologie|French":
    "Explorez un cabinet de gastro-entérologie moderne à Kénitra en visite virtuelle 3D. Découvrez les salles de consultation et les équipements en ligne.",
  "showroom-mobilier-casa|English":
    "Step into a virtual showroom that remains open 24/7. Explore the Showroom Mobilier Design in Casablanca from anywhere, on any device.",
};

const SUFFIX = " | Immersio.";
const BUDGET = 60 - SUFFIX.length;

// ── Verification avant ecriture ─────────────────────────────────────────────
const problems = [];
for (const [slug, t] of Object.entries(BLOG_TITLES)) {
  if (t.length > BUDGET) problems.push(`titre trop long (${t.length}) : ${slug}`);
  if (/(\.\.\.|…)/.test(t)) problems.push(`titre encore tronque : ${slug}`);
  if (/\|\s*Immersio/i.test(t)) problems.push(`marque residuelle : ${slug}`);
}
for (const [key, t] of Object.entries(PORTFOLIO_TITLES)) {
  if (t.length > BUDGET) problems.push(`titre portfolio trop long (${t.length}) : ${key}`);
  if (/\|\s*(Portfolio\s+)?Immersio(\s+Portfolio)?\s*$/i.test(t)) problems.push(`marque residuelle : ${key}`);
}
for (const [slug, d] of Object.entries(BLOG_DESCS)) {
  if (d.length > 160) problems.push(`description trop longue (${d.length}) : ${slug}`);
  if (d.length < 70) problems.push(`description trop courte (${d.length}) : ${slug}`);
  if (/(\.\.\.|…)/.test(d)) problems.push(`description encore tronquee : ${slug}`);
}
for (const [key, d] of Object.entries(PORTFOLIO_DESCS)) {
  if (d.length > 160) problems.push(`description portfolio trop longue (${d.length}) : ${key}`);
  if (d.length < 70) problems.push(`description portfolio trop courte (${d.length}) : ${key}`);
  if (/(\.\.\.|…)/.test(d)) problems.push(`description portfolio tronquee : ${key}`);
}
if (problems.length) {
  console.error("Rien n a ete ecrit — corrige d abord :");
  problems.forEach((p) => console.error("  " + p));
  process.exit(1);
}

console.log(`Titres de blog        : ${Object.keys(BLOG_TITLES).length}`);
console.log(`Descriptions de blog  : ${Object.keys(BLOG_DESCS).length}`);
console.log(`Titres de portfolio   : ${Object.keys(PORTFOLIO_TITLES).length}`);
const lens = Object.values(BLOG_TITLES).map((t) => t.length + SUFFIX.length);
console.log(`\nLongueur rendue des titres : min ${Math.min(...lens)} | max ${Math.max(...lens)} (limite 60)`);

if (!APPLY) {
  console.log("\n— simulation, rien n est ecrit (--apply pour ecrire) —");
  process.exit(0);
}

// ── Ecriture ────────────────────────────────────────────────────────────────
let n = 0;
async function patch(table, filter, body, label) {
  const res = await fetch(`${SB}/rest/v1/${table}?${filter}`, {
    method: "PATCH",
    headers: H,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.error(`\n❌ ${label} : HTTP ${res.status} ${(await res.text()).slice(0, 150)}`);
    return;
  }
  n++;
  process.stdout.write(`\r  ecrit ${n}`);
}

for (const [slug, meta_title] of Object.entries(BLOG_TITLES)) {
  await patch("blog_posts", `slug=eq.${encodeURIComponent(slug)}`, { meta_title }, slug);
}
for (const [slug, meta_description] of Object.entries(BLOG_DESCS)) {
  await patch("blog_posts", `slug=eq.${encodeURIComponent(slug)}`, { meta_description }, slug);
}
for (const [key, meta_title] of Object.entries(PORTFOLIO_TITLES)) {
  const [slug, language] = key.split("|");
  await patch(
    "portfolio_projects",
    `slug=eq.${encodeURIComponent(slug)}&language=eq.${encodeURIComponent(language)}`,
    { meta_title },
    key
  );
}
for (const [key, meta_description] of Object.entries(PORTFOLIO_DESCS)) {
  const [slug, language] = key.split("|");
  await patch(
    "portfolio_projects",
    `slug=eq.${encodeURIComponent(slug)}&language=eq.${encodeURIComponent(language)}`,
    { meta_description },
    key
  );
}
console.log(`\n✅ ${n} mise(s) a jour`);
