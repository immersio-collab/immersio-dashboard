import { createLead } from "../lib/leads";

const leadsData = [
  {
    nom: "abdelmoughit zerouali", telephone: "212660313731", canal: "WhatsApp", ville: "Casablanca",
    typeDeBien: "Immobilier", surface: "78m", date1erContact: "2026-07-27", appelTelephonique: "Non",
    statut: "Contacté", devisEnvoye: "Oui", demoEnvoye: "Oui", prixProposeMAD: "2330",
    dateDeEchange: "2026-08-04", relance1Auto: "2026-08-05", relance2Auto: "2026-08-07",
    relance3Auto: "2026-08-11", notes: "il a demandé la démo et le devis, puis un merci a la fin sans suite. relancé par message whatsapp", dateFormulaire: "2026-07-27"
  },
  {
    nom: "chaimaa Belkhir", telephone: "212664825412", canal: "WhatsApp", ville: "Rabat",
    typeDeBien: "Immobilier", surface: "479m", date1erContact: "2026-08-02", appelTelephonique: "Non",
    statut: "Contacté", devisEnvoye: "Non", demoEnvoye: "Oui", prixProposeMAD: "",
    dateDeEchange: "2026-08-05", relance1Auto: "2026-08-06", relance2Auto: "2026-08-08",
    relance3Auto: "2026-08-12", notes: "a envoyé les détails et photos de sa villa mais aucune suite après la demo. relancée", dateFormulaire: "2026-08-02"
  },
  {
    nom: "elfadili salsabil RAPROMO", telephone: "212641413489", canal: "Instagram", ville: "Kenitra",
    typeDeBien: "Immobilier", surface: "", date1erContact: "2026-08-05", appelTelephonique: "Oui",
    statut: "Intéressé", devisEnvoye: "Oui", demoEnvoye: "Non", prixProposeMAD: "2097",
    dateDeEchange: "2026-08-05", relance1Auto: "2026-08-06", relance2Auto: "2026-08-08",
    relance3Auto: "2026-08-12", notes: "elle a dit quon doit parler au responsable pour fixer une date d'entretien. relancé", dateFormulaire: "2026-08-05"
  },
  {
    nom: "Agence marketing ", telephone: "212645979916", canal: "WhatsApp", ville: "Casablanca",
    typeDeBien: "Immobilier", surface: "100-200m", date1erContact: "2026-08-06", appelTelephonique: "Non",
    statut: "Intéressé", devisEnvoye: "Oui", demoEnvoye: "Oui", prixProposeMAD: "3470",
    dateDeEchange: "2026-08-06", relance1Auto: "2026-08-07", relance2Auto: "2026-08-09",
    relance3Auto: "2026-08-13", notes: "il travail avec les promoteur et veut ajouter notre service", dateFormulaire: "2026-08-06"
  },
  {
    nom: "Alae", telephone: "212679812749", canal: "WhatsApp", ville: "",
    typeDeBien: "", surface: "", date1erContact: "2026-07-27", appelTelephonique: "Non",
    statut: "Contacté", devisEnvoye: "Non", demoEnvoye: "Non", prixProposeMAD: "",
    dateDeEchange: "2026-07-27", relance1Auto: "2026-07-28", relance2Auto: "2026-07-30",
    relance3Auto: "2026-08-03", notes: "aucune réponse apres le 1er message", dateFormulaire: "2026-07-27"
  },
  {
    nom: "Chams", telephone: "33615168741", canal: "WhatsApp", ville: "Rabat",
    typeDeBien: "Bureau", surface: "2000m", date1erContact: "2026-07-22", appelTelephonique: "Non",
    statut: "Négociation", devisEnvoye: "Oui", demoEnvoye: "Oui", prixProposeMAD: "7825",
    dateDeEchange: "2026-07-22", relance1Auto: "2026-07-23", relance2Auto: "2026-07-25",
    relance3Auto: "2026-07-29", notes: "il a pas capté quand j'ai dit que le scan sera hebérgé chez nous, il veut en être le proprietaire.", dateFormulaire: "2026-07-22"
  },
  {
    nom: "@mcloving_666", telephone: "", canal: "Instagram", ville: "Rabat",
    typeDeBien: "", surface: "", date1erContact: "2026-07-27", appelTelephonique: "Non",
    statut: "Perdu", devisEnvoye: "", demoEnvoye: "", prixProposeMAD: "",
    dateDeEchange: "2026-07-27", relance1Auto: "", relance2Auto: "",
    relance3Auto: "", notes: "il dit qu'il est un tech qui se trouve sur rabat et qui a de l'expérience dans la création des tours virtuels", dateFormulaire: "2026-07-27"
  },
  {
    nom: "@khalid_alaoui_officiel", telephone: "", canal: "Instagram", ville: "",
    typeDeBien: "Immobilier", surface: "120m", date1erContact: "2026-07-22", appelTelephonique: "Non",
    statut: "Perdu", devisEnvoye: "", demoEnvoye: "", prixProposeMAD: "",
    dateDeEchange: "2026-07-22", relance1Auto: "", relance2Auto: "",
    relance3Auto: "", notes: "il dit qu'il est interessé si c'est avec Matterport", dateFormulaire: "2026-07-22"
  },
  {
    nom: "@yassinefadili", telephone: "212665364799", canal: "Instagram", ville: "",
    typeDeBien: "Autre", surface: "", date1erContact: "2026-07-28", appelTelephonique: "Non",
    statut: "Intéressé", devisEnvoye: "Non", demoEnvoye: "Non", prixProposeMAD: "",
    dateDeEchange: "2026-08-05", relance1Auto: "2026-08-06", relance2Auto: "2026-08-08",
    relance3Auto: "2026-08-12", notes: "il fait l'aménagement avec bardage te bois et veux intégrer les tours dasn son site / portfolio. relancé", dateFormulaire: "2026-07-28"
  },
  {
    nom: "@inovdesign_ma", telephone: "707755064", canal: "Instagram", ville: "Casablanca",
    typeDeBien: "Autre", surface: "", date1erContact: "2026-08-07", appelTelephonique: "Oui",
    statut: "Intéressé", devisEnvoye: "Non", demoEnvoye: "Non", prixProposeMAD: "",
    dateDeEchange: "2026-08-07", relance1Auto: "2026-08-08", relance2Auto: "2026-08-10",
    relance3Auto: "2026-08-14", notes: "ils font l'aménagement des intérieurs et il est ok pour une rencontre a casa ou rabat pour discuter des prix. relancé par message", dateFormulaire: "2026-08-07"
  }
];

async function insertLeads() {
  for (const lead of leadsData) {
    try {
      await createLead(lead as any);
      console.log(`Lead inserted: ${lead.nom}`);
    } catch (e: any) {
      console.error(`Error inserting ${lead.nom}:`, e.message);
    }
  }
}

insertLeads().then(() => console.log("Done")).catch(console.error);
