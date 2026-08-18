/**
 * Google Apps Script — Synchronise les nouveaux leads Meta vers Supabase
 * via le webhook du dashboard Immersio.
 *
 * ═══════════════════════════════════════════════════════════════════════
 *  INSTRUCTIONS DE DÉPLOIEMENT
 * ═══════════════════════════════════════════════════════════════════════
 *
 *  1. Ouvrir le Google Sheet "immersio leads"
 *  2. Menu → Extensions → Apps Script
 *  3. Coller ce script entier dans l'éditeur (remplacer tout le contenu)
 *  4. Modifier les 2 constantes WEBHOOK_URL et WEBHOOK_SECRET ci-dessous
 *  5. Sauvegarder (Ctrl+S)
 *  6. Menu dans Apps Script → Triggers (icône horloge à gauche)
 *  7. Ajouter un trigger :
 *       - Fonction : onSheetChange
 *       - Événement : "On change" (Du Spreadsheet)
 *       - Type : "Change"
 *  8. Autoriser les permissions quand demandé
 *  9. (Optionnel) Exécuter syncAllNewLeads() manuellement pour le premier sync
 *
 * ═══════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION — À MODIFIER
// ─────────────────────────────────────────────────────────────────────────────

/** URL du webhook du dashboard (production Vercel ou localhost pour test). */
var WEBHOOK_URL = "https://immersio-dashboard.vercel.app/api/leads/webhook";

/** Secret partagé avec le dashboard (doit correspondre à WEBHOOK_SECRET dans .env.local). */
var WEBHOOK_SECRET = "6652374f6dc1c9518416666a9127f525efbe20fb4374eb09";

/** Nom de l'onglet source des leads Meta (Sheet1 par défaut). */
var SOURCE_SHEET_NAME = "Sheet1";

/** Clé de stockage pour le numéro de la dernière ligne synchronisée. */
var PROP_LAST_ROW = "lastSyncedRow";

// ─────────────────────────────────────────────────────────────────────────────
// COLONNES DU SHEET META (index 0-based)
// ─────────────────────────────────────────────────────────────────────────────
// A=0: id | B=1: created_time | C=2: ad_id | D=3: ad_name |
// E=4: adset_id | F=5: adset_name | G=6: campaign_id | H=7: campaign_name |
// I=8: form_id | J=9: form_name | K=10: is_organic | L=11: platform |
// M=12: first_name | N=13: phone_number | O=14: city | P=15: email |
// Q=16: lead_status

var COL = {
  ID: 0,
  CREATED_TIME: 1,
  AD_ID: 2,
  AD_NAME: 3,
  ADSET_ID: 4,
  ADSET_NAME: 5,
  CAMPAIGN_ID: 6,
  CAMPAIGN_NAME: 7,
  FORM_ID: 8,
  FORM_NAME: 9,
  IS_ORGANIC: 10,
  PLATFORM: 11,
  FIRST_NAME: 12,
  PHONE_NUMBER: 13,
  CITY: 14,
  EMAIL: 15,
  LEAD_STATUS: 16
};

/** Total number of columns to read (A through Q). */
var TOTAL_COLUMNS = 17;

// ─────────────────────────────────────────────────────────────────────────────
// TRIGGER — appelé automatiquement quand le sheet change
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Installable trigger: fires on any change to the spreadsheet.
 * We check if new rows were added to Sheet1 and sync them.
 */
function onSheetChange(e) {
  try {
    syncAllNewLeads();
  } catch (err) {
    Logger.log("Erreur dans onSheetChange: " + err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SYNC LOGIC
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Synchronise toutes les nouvelles lignes depuis la dernière sync.
 * Peut être exécutée manuellement ou via le trigger.
 */
function syncAllNewLeads() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SOURCE_SHEET_NAME);
  if (!sheet) {
    Logger.log("Onglet '" + SOURCE_SHEET_NAME + "' introuvable.");
    return;
  }

  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    Logger.log("Aucune donnée (seulement l'en-tête).");
    return;
  }

  // Récupérer la dernière ligne synchronisée
  var props = PropertiesService.getScriptProperties();
  var lastSynced = parseInt(props.getProperty(PROP_LAST_ROW) || "1", 10);

  // Si on a déjà tout synchronisé
  if (lastSynced >= lastRow) {
    Logger.log("Tout est à jour. Dernière ligne sync: " + lastSynced + ", dernière ligne sheet: " + lastRow);
    return;
  }

  // Lire les nouvelles lignes (depuis lastSynced+1 jusqu'à lastRow)
  var startRow = lastSynced + 1;
  var numRows = lastRow - lastSynced;
  var range = sheet.getRange(startRow, 1, numRows, TOTAL_COLUMNS); // 17 colonnes (A à Q)
  var values = range.getValues();

  Logger.log("Synchronisation de " + values.length + " nouvelle(s) ligne(s) (lignes " + startRow + " à " + lastRow + ")...");

  var successCount = 0;
  var errorCount = 0;
  var lastSuccessRow = lastSynced;

  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var rowNumber = startRow + i;

    // Ignorer les lignes vides (pas d'ID)
    var metaId = String(row[COL.ID] || "").trim();
    if (!metaId) {
      Logger.log("Ligne " + rowNumber + " ignorée (pas d'ID).");
      lastSuccessRow = rowNumber; // Still advance past empty rows
      continue;
    }

    // Construire le payload
    var payload = {
      id: metaId,
      created_time: String(row[COL.CREATED_TIME] || ""),
      ad_id: String(row[COL.AD_ID] || ""),
      ad_name: String(row[COL.AD_NAME] || ""),
      adset_id: String(row[COL.ADSET_ID] || ""),
      adset_name: String(row[COL.ADSET_NAME] || ""),
      campaign_id: String(row[COL.CAMPAIGN_ID] || ""),
      campaign_name: String(row[COL.CAMPAIGN_NAME] || ""),
      form_id: String(row[COL.FORM_ID] || ""),
      form_name: String(row[COL.FORM_NAME] || ""),
      is_organic: String(row[COL.IS_ORGANIC] || "false"),
      platform: String(row[COL.PLATFORM] || ""),
      first_name: String(row[COL.FIRST_NAME] || ""),
      phone_number: String(row[COL.PHONE_NUMBER] || ""),
      city: String(row[COL.CITY] || ""),
      email: String(row[COL.EMAIL] || ""),
      lead_status: String(row[COL.LEAD_STATUS] || "")
    };

    // Envoyer au webhook
    var result = sendToWebhook(payload, rowNumber);
    if (result) {
      successCount++;
      lastSuccessRow = rowNumber;
    } else {
      errorCount++;
      // On continue quand même pour ne pas bloquer les lignes suivantes
      lastSuccessRow = rowNumber;
    }
  }

  // Mettre à jour le compteur
  if (lastSuccessRow > lastSynced) {
    props.setProperty(PROP_LAST_ROW, String(lastSuccessRow));
    Logger.log("Compteur mis à jour: " + lastSuccessRow);
  }

  Logger.log("Sync terminée: " + successCount + " créé(s), " + errorCount + " erreur(s).");
}

// ─────────────────────────────────────────────────────────────────────────────
// HTTP — envoi webhook avec retry
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Envoie un lead au webhook du dashboard avec retry (3 tentatives max).
 * @param {Object} payload - Le lead Meta à envoyer.
 * @param {number} rowNumber - Le numéro de ligne (pour les logs).
 * @returns {boolean} true si succès, false si échec après retries.
 */
function sendToWebhook(payload, rowNumber) {
  var maxRetries = 3;
  var retryDelay = 1000; // ms

  for (var attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      var options = {
        method: "post",
        contentType: "application/json",
        headers: {
          "X-Webhook-Secret": WEBHOOK_SECRET
        },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };

      var response = UrlFetchApp.fetch(WEBHOOK_URL, options);
      var code = response.getResponseCode();
      var body = response.getContentText();

      if (code === 201 || code === 200) {
        Logger.log("✅ Ligne " + rowNumber + " (ID: " + payload.id + ") → " + code);
        return true;
      } else {
        Logger.log("⚠️ Ligne " + rowNumber + " → HTTP " + code + ": " + body);
        // Don't retry on 4xx (client errors)
        if (code >= 400 && code < 500) {
          return false;
        }
      }
    } catch (err) {
      Logger.log("❌ Ligne " + rowNumber + " tentative " + attempt + "/" + maxRetries + ": " + err.message);
    }

    // Wait before retry (exponential backoff)
    if (attempt < maxRetries) {
      Utilities.sleep(retryDelay * attempt);
    }
  }

  Logger.log("❌ Ligne " + rowNumber + " — échec après " + maxRetries + " tentatives.");
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITAIRES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Réinitialise le compteur de sync pour re-synchroniser tout depuis le début.
 * ⚠️ Les leads déjà existants dans Supabase ne seront PAS dupliqués grâce
 * à l'anti-doublon du webhook (ils retourneront "exists").
 */
function resetSyncCounter() {
  PropertiesService.getScriptProperties().setProperty(PROP_LAST_ROW, "1");
  Logger.log("Compteur réinitialisé à 1. Exécutez syncAllNewLeads() pour re-sync.");
}

/**
 * Affiche le statut actuel de la synchronisation.
 */
function showSyncStatus() {
  var props = PropertiesService.getScriptProperties();
  var lastSynced = props.getProperty(PROP_LAST_ROW) || "1";
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SOURCE_SHEET_NAME);
  var totalRows = sheet ? sheet.getLastRow() : 0;

  var message = "Dernière ligne synchronisée: " + lastSynced + "\n" +
                "Total de lignes dans le sheet: " + totalRows + "\n" +
                "Lignes en attente: " + Math.max(0, totalRows - parseInt(lastSynced, 10));
  
  Logger.log(message);
  SpreadsheetApp.getUi().alert("Statut de la synchronisation", message, SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * Menu personnalisé dans le Google Sheet pour faciliter la gestion.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("🔄 Sync Supabase")
    .addItem("Synchroniser maintenant", "syncAllNewLeads")
    .addItem("Voir le statut", "showSyncStatus")
    .addSeparator()
    .addItem("⚠️ Réinitialiser le compteur", "resetSyncCounter")
    .addToUi();
}
