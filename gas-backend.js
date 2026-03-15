// ═══════════════════════════════════════════════════════════════
// StockPilot - Google Apps Script Backend (API Layer)
// ═══════════════════════════════════════════════════════════════
// このスクリプトをGoogle Sheetsの「拡張機能 > Apps Script」に貼り付けてください。
// デプロイ: 「デプロイ > 新しいデプロイ > ウェブアプリ」で公開
//
// 【シート構成】
//   1. 品目マスタ (items)
//   2. 生産記録 (production_log)
//   3. 入出庫記録 (transactions)
//   4. 在庫サマリ (stock_summary) ← 自動計算シート
//   5. 設定 (settings)
// ═══════════════════════════════════════════════════════════════

const SS_ID = 'YOUR_SPREADSHEET_ID_HERE'; // ← スプレッドシートIDを入れる

// --- シート名定数 ---
const SHEET = {
  ITEMS: '品目マスタ',
  PRODUCTION: '生産記録',
  TRANSACTIONS: '入出庫記録',
  SUMMARY: '在庫サマリ',
  SETTINGS: '設定',
};

// ═══════════════════════════════════════════════════════
// HTTP HANDLERS (PWAからのリクエスト受信)
// ═══════════════════════════════════════════════════════

function doGet(e) {
  const action = e.parameter.action;
  let result;

  try {
    switch (action) {
      case 'getItems':
        result = getItems();
        break;
      case 'getProductionLog':
        result = getProductionLog(e.parameter.date);
        break;
      case 'getTransactions':
        result = getTransactions(e.parameter.date, e.parameter.type);
        break;
      case 'getStockSummary':
        result = getStockSummary();
        break;
      case 'getAlerts':
        result = getAlerts();
        break;
      case 'getDashboard':
        result = getDashboard();
        break;
      default:
        result = { error: 'Unknown action: ' + action };
    }
  } catch (err) {
    result = { error: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const action = data.action;
  let result;

  try {
    switch (action) {
      case 'addProduction':
        result = addProduction(data);
        break;
      case 'addTransaction':
        result = addTransaction(data);
        break;
      case 'addItem':
        result = addItem(data);
        break;
      case 'updateItem':
        result = updateItem(data);
        break;
      default:
        result = { error: 'Unknown action: ' + action };
    }
  } catch (err) {
    result = { error: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}


// ═══════════════════════════════════════════════════════
// READ OPERATIONS
// ═══════════════════════════════════════════════════════

/** 品目マスタ全件取得 */
function getItems() {
  const sheet = SpreadsheetApp.openById(SS_ID).getSheetByName(SHEET.ITEMS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const items = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
  return { success: true, items };
}

/** 生産記録取得（日付フィルタ可） */
function getProductionLog(date) {
  const sheet = SpreadsheetApp.openById(SS_ID).getSheetByName(SHEET.PRODUCTION);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  let logs = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });

  if (date) {
    logs = logs.filter(l => formatDate(l['日付']) === date);
  }

  // 新しい順にソート
  logs.sort((a, b) => new Date(b['日付']) - new Date(a['日付']));
  return { success: true, logs };
}

/** 入出庫記録取得 */
function getTransactions(date, type) {
  const sheet = SpreadsheetApp.openById(SS_ID).getSheetByName(SHEET.TRANSACTIONS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  let txns = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });

  if (date) txns = txns.filter(t => formatDate(t['日付']) === date);
  if (type) txns = txns.filter(t => t['種別'] === type);

  txns.sort((a, b) => new Date(b['日付']) - new Date(a['日付']));
  return { success: true, transactions: txns };
}

/** 在庫サマリ取得 */
function getStockSummary() {
  recalculateStock(); // 最新を再計算
  const sheet = SpreadsheetApp.openById(SS_ID).getSheetByName(SHEET.SUMMARY);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const summary = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
  return { success: true, summary };
}

/** 安全在庫割れアラート */
function getAlerts() {
  const summary = getStockSummary().summary;
  const alerts = summary.filter(s => s['現在庫'] < s['安全在庫']);
  return {
    success: true,
    alerts: alerts.map(a => ({
      ...a,
      deficit: a['安全在庫'] - a['現在庫'],
      ratio: a['現在庫'] / a['安全在庫'],
    })),
  };
}

/** ダッシュボード用の集約データ */
function getDashboard() {
  const today = formatDate(new Date());
  const items = getItems().items;
  const todayProd = getProductionLog(today).logs;
  const todayTx = getTransactions(today).transactions;
  const alerts = getAlerts().alerts;

  return {
    success: true,
    date: today,
    totalItems: items.length,
    todayProductionTotal: todayProd.reduce((s, p) => s + Number(p['数量']), 0),
    todayProductionCount: todayProd.length,
    todayTransactionCount: todayTx.length,
    alertCount: alerts.length,
    categorySummary: {
      purchased: items.filter(i => i['カテゴリ'] === '仕入').length,
      produced: items.filter(i => i['カテゴリ'] === '自社生産').length,
      finished: items.filter(i => i['カテゴリ'] === '完成品').length,
    },
  };
}


// ═══════════════════════════════════════════════════════
// WRITE OPERATIONS
// ═══════════════════════════════════════════════════════

/** 生産記録の追加 */
function addProduction(data) {
  const sheet = SpreadsheetApp.openById(SS_ID).getSheetByName(SHEET.PRODUCTION);
  const now = new Date();
  const id = 'PRD-' + Utilities.getUuid().slice(0, 8);

  sheet.appendRow([
    id,
    now,                    // 日付
    data.itemId,            // 品目ID
    data.itemName,          // 品名
    Number(data.quantity),  // 数量
    data.worker,            // 作業者
    data.line,              // ライン
    data.note || '',        // 備考
    Utilities.formatDate(now, 'Asia/Tokyo', 'HH:mm'), // 時刻
  ]);

  // 在庫サマリを更新（自社生産品は生産=入庫）
  updateStockQuantity(data.itemId, Number(data.quantity));

  return { success: true, id };
}

/** 入出庫記録の追加 */
function addTransaction(data) {
  const sheet = SpreadsheetApp.openById(SS_ID).getSheetByName(SHEET.TRANSACTIONS);
  const now = new Date();
  const id = 'TXN-' + Utilities.getUuid().slice(0, 8);

  sheet.appendRow([
    id,
    now,                    // 日付
    data.type,              // 種別 (in/out/move)
    data.itemId,            // 品目ID
    data.itemName,          // 品名
    Number(data.quantity),  // 数量
    data.warehouse,         // 倉庫
    data.note || '',        // 備考
    data.worker,            // 担当者
  ]);

  // 在庫更新
  const qty = Number(data.quantity);
  if (data.type === 'in') {
    updateStockQuantity(data.itemId, qty);
  } else if (data.type === 'out') {
    updateStockQuantity(data.itemId, -qty);
  }
  // moveは同一品目の倉庫間移動なので在庫総数は変わらない

  return { success: true, id };
}

/** 品目マスタ追加 */
function addItem(data) {
  const sheet = SpreadsheetApp.openById(SS_ID).getSheetByName(SHEET.ITEMS);
  const id = 'ITM-' + String(sheet.getLastRow()).padStart(3, '0');

  sheet.appendRow([
    id,
    data.name,
    data.category,      // purchased / produced / finished
    data.unit,
    Number(data.safetyStock),
    Number(data.initialStock || 0),
    data.warehouse,
    data.supplier || '',
    Number(data.unitCost || 0),
  ]);

  return { success: true, id };
}


// ═══════════════════════════════════════════════════════
// STOCK CALCULATION (在庫自動計算)
// ═══════════════════════════════════════════════════════

/** 品目IDに対して在庫数量を加減算 */
function updateStockQuantity(itemId, delta) {
  const sheet = SpreadsheetApp.openById(SS_ID).getSheetByName(SHEET.ITEMS);
  const data = sheet.getDataRange().getValues();
  const idCol = 0;    // A列: 品目ID
  const stockCol = 5; // F列: 現在庫

  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol] === itemId) {
      const currentStock = Number(data[i][stockCol]) || 0;
      sheet.getRange(i + 1, stockCol + 1).setValue(currentStock + delta);

      // アラートチェック
      const safetyStock = Number(data[i][4]) || 0;
      if (currentStock + delta < safetyStock) {
        sendAlertNotification(itemId, data[i][1], currentStock + delta, safetyStock);
      }
      return;
    }
  }
}

/** 在庫サマリシートの完全再計算 */
function recalculateStock() {
  const ss = SpreadsheetApp.openById(SS_ID);
  const itemSheet = ss.getSheetByName(SHEET.ITEMS);
  const summarySheet = ss.getSheetByName(SHEET.SUMMARY);

  const items = itemSheet.getDataRange().getValues();
  const headers = items[0];

  // サマリシートをクリアして再構築
  summarySheet.clearContents();
  summarySheet.appendRow([
    '品目ID', '品名', 'カテゴリ', '単位',
    '現在庫', '安全在庫', '充足率(%)', 'ステータス',
    '倉庫', '在庫金額',
  ]);

  for (let i = 1; i < items.length; i++) {
    const row = items[i];
    const currentStock = Number(row[5]) || 0;
    const safetyStock = Number(row[4]) || 0;
    const ratio = safetyStock > 0 ? Math.round((currentStock / safetyStock) * 100) : 999;
    const status = ratio >= 100 ? '正常' : ratio >= 50 ? '注意' : '不足';
    const unitCost = Number(row[8]) || 0;

    summarySheet.appendRow([
      row[0], row[1], row[2], row[3],
      currentStock, safetyStock, ratio, status,
      row[6], currentStock * unitCost,
    ]);
  }
}


// ═══════════════════════════════════════════════════════
// ALERTS & NOTIFICATIONS
// ═══════════════════════════════════════════════════════

/** 安全在庫割れ通知（メール） */
function sendAlertNotification(itemId, itemName, current, safety) {
  const settingsSheet = SpreadsheetApp.openById(SS_ID).getSheetByName(SHEET.SETTINGS);
  const emailCell = settingsSheet.getRange('B1').getValue(); // 通知先メール

  if (!emailCell) return;

  const subject = `[StockPilot] 在庫アラート: ${itemName}`;
  const body = `
安全在庫割れが検知されました。

品目: ${itemName} (${itemId})
現在庫: ${current}
安全在庫: ${safety}
不足数: ${safety - current}

StockPilotで確認してください。
  `;

  MailApp.sendEmail(emailCell, subject, body);
}

/** 日次サマリメール（トリガーで毎日18:00に実行） */
function sendDailySummary() {
  const dashboard = getDashboard();
  const alerts = getAlerts().alerts;
  const settingsSheet = SpreadsheetApp.openById(SS_ID).getSheetByName(SHEET.SETTINGS);
  const emailCell = settingsSheet.getRange('B1').getValue();

  if (!emailCell) return;

  let alertSection = alerts.length === 0
    ? '✓ 在庫アラートはありません'
    : alerts.map(a => `  ⚠ ${a['品名']}: 現在庫 ${a['現在庫']} / 安全在庫 ${a['安全在庫']}`).join('\n');

  const body = `
━━━ StockPilot 日次レポート ━━━
${dashboard.date}

■ 本日の生産実績
  合計: ${dashboard.todayProductionTotal} 個 (${dashboard.todayProductionCount}件)

■ 入出庫
  ${dashboard.todayTransactionCount} 件

■ 在庫アラート (${alerts.length}件)
${alertSection}

■ カテゴリ別SKU数
  仕入品: ${dashboard.categorySummary.purchased}
  自社生産品: ${dashboard.categorySummary.produced}
  完成品: ${dashboard.categorySummary.finished}
━━━━━━━━━━━━━━━━━━━━━━━
  `;

  MailApp.sendEmail(emailCell, `[StockPilot] 日次レポート ${dashboard.date}`, body);
}


// ═══════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════

function formatDate(d) {
  if (typeof d === 'string') return d;
  return Utilities.formatDate(new Date(d), 'Asia/Tokyo', 'yyyy-MM-dd');
}


// ═══════════════════════════════════════════════════════
// SETUP (初回セットアップ用)
// ═══════════════════════════════════════════════════════

/** スプレッドシートの初期構造を作成 */
function setupSheets() {
  const ss = SpreadsheetApp.openById(SS_ID);

  // 品目マスタ
  let sheet = ss.getSheetByName(SHEET.ITEMS) || ss.insertSheet(SHEET.ITEMS);
  sheet.getRange(1, 1, 1, 9).setValues([[
    '品目ID', '品名', 'カテゴリ', '単位',
    '安全在庫', '現在庫', '倉庫', '仕入先', '単価'
  ]]);
  sheet.getRange(1, 1, 1, 9).setFontWeight('bold').setBackground('#f0f0f0');
  sheet.setFrozenRows(1);

  // 生産記録
  sheet = ss.getSheetByName(SHEET.PRODUCTION) || ss.insertSheet(SHEET.PRODUCTION);
  sheet.getRange(1, 1, 1, 9).setValues([[
    '記録ID', '日付', '品目ID', '品名',
    '数量', '作業者', 'ライン', '備考', '時刻'
  ]]);
  sheet.getRange(1, 1, 1, 9).setFontWeight('bold').setBackground('#fff3e0');
  sheet.setFrozenRows(1);

  // 入出庫記録
  sheet = ss.getSheetByName(SHEET.TRANSACTIONS) || ss.insertSheet(SHEET.TRANSACTIONS);
  sheet.getRange(1, 1, 1, 9).setValues([[
    '記録ID', '日付', '種別', '品目ID',
    '品名', '数量', '倉庫', '備考', '担当者'
  ]]);
  sheet.getRange(1, 1, 1, 9).setFontWeight('bold').setBackground('#e3f2fd');
  sheet.setFrozenRows(1);

  // 在庫サマリ
  sheet = ss.getSheetByName(SHEET.SUMMARY) || ss.insertSheet(SHEET.SUMMARY);
  sheet.getRange(1, 1, 1, 10).setValues([[
    '品目ID', '品名', 'カテゴリ', '単位',
    '現在庫', '安全在庫', '充足率(%)', 'ステータス',
    '倉庫', '在庫金額'
  ]]);
  sheet.getRange(1, 1, 1, 10).setFontWeight('bold').setBackground('#e8f5e9');
  sheet.setFrozenRows(1);

  // 設定
  sheet = ss.getSheetByName(SHEET.SETTINGS) || ss.insertSheet(SHEET.SETTINGS);
  sheet.getRange(1, 1, 3, 2).setValues([
    ['設定項目', '値'],
    ['通知メール', 'your-email@example.com'],
    ['日次レポート時刻', '18:00'],
  ]);
  sheet.getRange(1, 1, 1, 2).setFontWeight('bold').setBackground('#fce4ec');

  Logger.log('✅ セットアップ完了');
}


// ═══════════════════════════════════════════════════════
// TRIGGERS (自動実行の設定)
// ═══════════════════════════════════════════════════════

/** トリガーを設定（初回のみ手動実行） */
function setupTriggers() {
  // 既存トリガーを削除
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));

  // 毎日18:00に日次レポートを送信
  ScriptApp.newTrigger('sendDailySummary')
    .timeBased()
    .everyDays(1)
    .atHour(18)
    .create();

  // 毎時0分に在庫サマリを再計算
  ScriptApp.newTrigger('recalculateStock')
    .timeBased()
    .everyHours(1)
    .create();

  Logger.log('✅ トリガー設定完了');
}
