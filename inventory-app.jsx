const { useState, useEffect, useCallback } = React;
// ...
window.StockPilotApp = function StockPilotApp() {

// ═══════════════════════════════════════════════════════
// StockPilot - 在庫管理 & 生産管理 PWA
// Architecture: Google Sheets (DB) → Apps Script (API) → React PWA
// ═══════════════════════════════════════════════════════

// --- Mock Data (本番では Google Sheets API から取得) ---
const MOCK_ITEMS = [
  { id: "ITM-001", name: "アルミフレーム A3", category: "purchased", unit: "本", safetyStock: 50, currentStock: 42, warehouse: "第1倉庫", supplier: "山田金属", unitCost: 1200 },
  { id: "ITM-002", name: "制御基板 v2.1", category: "purchased", unit: "枚", safetyStock: 30, currentStock: 35, warehouse: "第1倉庫", supplier: "東京電子", unitCost: 4500 },
  { id: "ITM-003", name: "駆動モーター M5", category: "purchased", unit: "個", safetyStock: 20, currentStock: 8, warehouse: "第2倉庫", supplier: "日東モーター", unitCost: 8900 },
  { id: "ITM-004", name: "筐体カバー (白)", category: "produced", unit: "個", safetyStock: 40, currentStock: 65, warehouse: "第1倉庫", supplier: "自社生産", unitCost: 600 },
  { id: "ITM-005", name: "組立ユニット X1", category: "produced", unit: "台", safetyStock: 15, currentStock: 12, warehouse: "第2倉庫", supplier: "自社生産", unitCost: 3200 },
  { id: "ITM-006", name: "完成品 プロダクトα", category: "finished", unit: "台", safetyStock: 10, currentStock: 18, warehouse: "出荷倉庫", supplier: "—", unitCost: 25000 },
  { id: "ITM-007", name: "完成品 プロダクトβ", category: "finished", unit: "台", safetyStock: 8, currentStock: 5, warehouse: "出荷倉庫", supplier: "—", unitCost: 38000 },
  { id: "ITM-008", name: "ケーブルハーネス C3", category: "purchased", unit: "本", safetyStock: 100, currentStock: 145, warehouse: "第1倉庫", supplier: "配線工業", unitCost: 350 },
  { id: "ITM-009", name: "LED表示パネル", category: "produced", unit: "枚", safetyStock: 25, currentStock: 22, warehouse: "第1倉庫", supplier: "自社生産", unitCost: 1800 },
  { id: "ITM-010", name: "リース品 プロダクトγ", category: "finished", unit: "台", safetyStock: 5, currentStock: 7, warehouse: "リース倉庫", supplier: "—", unitCost: 52000 },
];

const MOCK_PRODUCTION_LOG = [
  { id: 1, date: "2026-03-14", itemId: "ITM-004", itemName: "筐体カバー (白)", quantity: 24, worker: "佐藤", line: "A", note: "", time: "09:15" },
  { id: 2, date: "2026-03-14", itemId: "ITM-005", itemName: "組立ユニット X1", quantity: 8, worker: "田中", line: "B", note: "午前分", time: "11:30" },
  { id: 3, date: "2026-03-14", itemId: "ITM-009", itemName: "LED表示パネル", quantity: 15, worker: "鈴木", line: "A", note: "", time: "14:00" },
  { id: 4, date: "2026-03-13", itemId: "ITM-004", itemName: "筐体カバー (白)", quantity: 30, worker: "佐藤", line: "A", note: "", time: "17:00" },
  { id: 5, date: "2026-03-13", itemId: "ITM-005", itemName: "組立ユニット X1", quantity: 10, worker: "田中", line: "B", note: "不良1個含む", time: "16:45" },
];

const MOCK_TRANSACTIONS = [
  { id: 1, date: "2026-03-14", type: "in", itemId: "ITM-001", itemName: "アルミフレーム A3", quantity: 100, warehouse: "第1倉庫", note: "定期発注分", worker: "高橋" },
  { id: 2, date: "2026-03-14", type: "out", itemId: "ITM-006", itemName: "完成品 プロダクトα", quantity: 3, warehouse: "出荷倉庫", note: "A商事向け", worker: "渡辺" },
  { id: 3, date: "2026-03-14", type: "move", itemId: "ITM-002", itemName: "制御基板 v2.1", quantity: 10, warehouse: "第1→第2倉庫", note: "生産ライン補充", worker: "伊藤" },
  { id: 4, date: "2026-03-13", type: "in", itemId: "ITM-003", itemName: "駆動モーター M5", quantity: 20, warehouse: "第2倉庫", note: "緊急発注分", worker: "高橋" },
  { id: 5, date: "2026-03-13", type: "out", itemId: "ITM-007", itemName: "完成品 プロダクトβ", quantity: 2, warehouse: "出荷倉庫", note: "B建設向け", worker: "渡辺" },
];

// --- Utility ---
const categoryLabel = (c) => ({ purchased: "仕入", produced: "自社生産", finished: "完成品" }[c] || c);
const categoryColor = (c) => ({ purchased: "#3b82f6", produced: "#f59e0b", finished: "#10b981" }[c] || "#6b7280");
const txTypeLabel = (t) => ({ in: "入庫", out: "出庫", move: "移動" }[t] || t);
const txTypeColor = (t) => ({ in: "#10b981", out: "#ef4444", move: "#8b5cf6" }[t] || "#6b7280");

const today = "2026-03-14";

// ═══════════════════════════════════════════════════════
// ICONS (inline SVG)
// ═══════════════════════════════════════════════════════
const Icons = {
  dashboard: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  production: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 20h20"/><path d="M5 20V8l5 4V8l5 4V4l5 4v12"/>
    </svg>
  ),
  inventory: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  ),
  items: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  ),
  alert: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  plus: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
  ),
  check: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
  ),
  x: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
  ),
  arrowDown: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
  ),
  arrowUp: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
  ),
  search: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
  ),
};

// ═══════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════
export default function StockPilotApp() {
  const [page, setPage] = useState("dashboard");
  const [items, setItems] = useState(MOCK_ITEMS);
  const [prodLog, setProdLog] = useState(MOCK_PRODUCTION_LOG);
  const [transactions, setTransactions] = useState(MOCK_TRANSACTIONS);
  const [showModal, setShowModal] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const alertItems = items.filter((i) => i.currentStock < i.safetyStock);
  const todayProd = prodLog.filter((p) => p.date === today);
  const todayTx = transactions.filter((t) => t.date === today);
  const todayProdTotal = todayProd.reduce((s, p) => s + p.quantity, 0);

  return (
    <div style={styles.app}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={styles.logo}>SP</div>
            <div>
              <div style={styles.headerTitle}>StockPilot</div>
              <div style={styles.headerSub}>在庫管理 & 生産管理</div>
            </div>
          </div>
          <div style={styles.headerDate}>{today.replace(/-/g, "/")}</div>
        </div>
      </header>

      {/* Alert Banner */}
      {alertItems.length > 0 && page === "dashboard" && (
        <div style={styles.alertBanner}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {Icons.alert}
            <strong>{alertItems.length}件</strong>の安全在庫割れ
          </span>
          <button style={styles.alertBtn} onClick={() => setPage("alerts")}>
            確認 →
          </button>
        </div>
      )}

      {/* Main Content */}
      <main style={styles.main}>
        {page === "dashboard" && (
          <DashboardPage
            items={items}
            todayProd={todayProd}
            todayTx={todayTx}
            todayProdTotal={todayProdTotal}
            alertCount={alertItems.length}
            onNav={setPage}
          />
        )}
        {page === "production" && (
          <ProductionPage
            items={items.filter((i) => i.category === "produced")}
            log={prodLog}
            onAdd={(entry) => {
              setProdLog([{ ...entry, id: prodLog.length + 1, date: today }, ...prodLog]);
              // Update stock
              setItems((prev) =>
                prev.map((it) =>
                  it.id === entry.itemId ? { ...it, currentStock: it.currentStock + entry.quantity } : it
                )
              );
              showToast(`${entry.itemName} × ${entry.quantity} を記録しました`);
            }}
            showModal={showModal}
            setShowModal={setShowModal}
          />
        )}
        {page === "inventory" && (
          <InventoryPage
            items={items}
            transactions={transactions}
            onAdd={(tx) => {
              setTransactions([{ ...tx, id: transactions.length + 1, date: today }, ...transactions]);
              setItems((prev) =>
                prev.map((it) => {
                  if (it.id !== tx.itemId) return it;
                  if (tx.type === "in") return { ...it, currentStock: it.currentStock + tx.quantity };
                  if (tx.type === "out") return { ...it, currentStock: it.currentStock - tx.quantity };
                  return it;
                })
              );
              showToast(`${txTypeLabel(tx.type)}: ${tx.itemName} × ${tx.quantity}`);
            }}
            showModal={showModal}
            setShowModal={setShowModal}
          />
        )}
        {page === "items" && (
          <ItemsPage items={items} />
        )}
        {page === "alerts" && (
          <AlertsPage items={alertItems} />
        )}
      </main>

      {/* Toast */}
      {toast && (
        <div style={styles.toast}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>{Icons.check} {toast}</span>
        </div>
      )}

      {/* Bottom Nav */}
      <nav style={styles.nav}>
        {[
          { key: "dashboard", icon: Icons.dashboard, label: "ホーム" },
          { key: "production", icon: Icons.production, label: "生産" },
          { key: "inventory", icon: Icons.inventory, label: "入出庫" },
          { key: "items", icon: Icons.items, label: "品目" },
          { key: "alerts", icon: Icons.alert, label: "アラート", badge: alertItems.length },
        ].map((tab) => (
          <button
            key={tab.key}
            style={{
              ...styles.navItem,
              color: page === tab.key ? "#f97316" : "#94a3b8",
            }}
            onClick={() => setPage(tab.key)}
          >
            <div style={{ position: "relative" }}>
              {tab.icon}
              {tab.badge > 0 && (
                <span style={styles.badge}>{tab.badge}</span>
              )}
            </div>
            <span style={{ fontSize: 10, marginTop: 2 }}>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// DASHBOARD PAGE
// ═══════════════════════════════════════════════════════
function DashboardPage({ items, todayProd, todayTx, todayProdTotal, alertCount, onNav }) {
  const totalItems = items.length;
  const totalValue = items.reduce((s, i) => s + i.currentStock * i.unitCost, 0);

  return (
    <div style={styles.page}>
      <h2 style={styles.pageTitle}>ダッシュボード</h2>

      {/* Summary Cards */}
      <div style={styles.cardGrid}>
        <div style={{ ...styles.summaryCard, borderLeft: "4px solid #f97316" }}>
          <div style={styles.cardLabel}>本日の生産</div>
          <div style={styles.cardValue}>{todayProdTotal}<span style={styles.cardUnit}>個</span></div>
          <div style={styles.cardSub}>{todayProd.length}件の記録</div>
        </div>
        <div style={{ ...styles.summaryCard, borderLeft: "4px solid #3b82f6" }}>
          <div style={styles.cardLabel}>総SKU数</div>
          <div style={styles.cardValue}>{totalItems}<span style={styles.cardUnit}>品目</span></div>
          <div style={styles.cardSub}>¥{(totalValue / 10000).toFixed(0)}万 在庫総額</div>
        </div>
        <div style={{ ...styles.summaryCard, borderLeft: "4px solid #10b981" }}>
          <div style={styles.cardLabel}>本日の入出庫</div>
          <div style={styles.cardValue}>{todayTx.length}<span style={styles.cardUnit}>件</span></div>
          <div style={styles.cardSub}>入{todayTx.filter(t=>t.type==="in").length} / 出{todayTx.filter(t=>t.type==="out").length} / 移{todayTx.filter(t=>t.type==="move").length}</div>
        </div>
        <div
          style={{ ...styles.summaryCard, borderLeft: `4px solid ${alertCount > 0 ? "#ef4444" : "#10b981"}`, cursor: "pointer" }}
          onClick={() => onNav("alerts")}
        >
          <div style={styles.cardLabel}>在庫アラート</div>
          <div style={{ ...styles.cardValue, color: alertCount > 0 ? "#ef4444" : "#10b981" }}>
            {alertCount}<span style={styles.cardUnit}>件</span>
          </div>
          <div style={styles.cardSub}>{alertCount > 0 ? "要対応" : "問題なし"}</div>
        </div>
      </div>

      {/* Category breakdown */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>カテゴリ別在庫</h3>
        <div style={styles.catRow}>
          {["purchased", "produced", "finished"].map((cat) => {
            const catItems = items.filter((i) => i.category === cat);
            const okCount = catItems.filter((i) => i.currentStock >= i.safetyStock).length;
            return (
              <div key={cat} style={styles.catCard}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <span style={{ ...styles.catDot, background: categoryColor(cat) }} />
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{categoryLabel(cat)}</span>
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#0f172a" }}>{catItems.length}</div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                  正常 {okCount} / 不足 {catItems.length - okCount}
                </div>
                <div style={styles.miniBar}>
                  <div style={{ ...styles.miniBarFill, width: `${(okCount / catItems.length) * 100}%`, background: categoryColor(cat) }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>クイックアクション</h3>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={styles.quickBtn} onClick={() => onNav("production")}>
            {Icons.production}
            <span>生産記録</span>
          </button>
          <button style={{ ...styles.quickBtn, background: "#eff6ff", color: "#3b82f6" }} onClick={() => onNav("inventory")}>
            {Icons.inventory}
            <span>入出庫</span>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>最近のアクティビティ</h3>
        {[...todayProd.map(p => ({ ...p, _type: "prod" })), ...todayTx.map(t => ({ ...t, _type: "tx" }))].slice(0, 5).map((a, i) => (
          <div key={i} style={styles.activityRow}>
            <div style={{ ...styles.activityDot, background: a._type === "prod" ? "#f97316" : txTypeColor(a.type) }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#0f172a" }}>
                {a._type === "prod" ? `生産: ${a.itemName}` : `${txTypeLabel(a.type)}: ${a.itemName}`}
              </div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>
                {a._type === "prod" ? `${a.worker} / ${a.line}ライン` : `${a.worker} / ${a.warehouse}`}
              </div>
            </div>
            <div style={{ fontWeight: 600, fontSize: 14, color: "#0f172a" }}>
              {a._type === "prod" ? `+${a.quantity}` : (a.type === "out" ? `-${a.quantity}` : `${a.quantity}`)}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", width: 40, textAlign: "right" }}>{a.time || ""}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// PRODUCTION PAGE
// ═══════════════════════════════════════════════════════
function ProductionPage({ items, log, onAdd, showModal, setShowModal }) {
  const [formItem, setFormItem] = useState("");
  const [formQty, setFormQty] = useState("");
  const [formWorker, setFormWorker] = useState("");
  const [formLine, setFormLine] = useState("A");
  const [formNote, setFormNote] = useState("");

  const todayLog = log.filter((l) => l.date === today);
  const pastLog = log.filter((l) => l.date !== today);

  const handleSubmit = () => {
    if (!formItem || !formQty || !formWorker) return;
    const item = items.find((i) => i.id === formItem);
    onAdd({
      itemId: formItem,
      itemName: item?.name || "",
      quantity: parseInt(formQty),
      worker: formWorker,
      line: formLine,
      note: formNote,
      time: new Date().toTimeString().slice(0, 5),
    });
    setFormItem("");
    setFormQty("");
    setFormNote("");
    setShowModal(null);
  };

  return (
    <div style={styles.page}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={styles.pageTitle}>生産記録</h2>
        <button style={styles.primaryBtn} onClick={() => setShowModal("production")}>
          {Icons.plus} 記録追加
        </button>
      </div>

      {/* Today's summary */}
      <div style={styles.prodSummary}>
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>本日の生産合計</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: "#f97316" }}>
          {todayLog.reduce((s, l) => s + l.quantity, 0)}
          <span style={{ fontSize: 14, fontWeight: 400, color: "#94a3b8" }}> 個</span>
        </div>
      </div>

      {/* Today's log */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>本日 ({today.slice(5).replace("-", "/")})</h3>
        {todayLog.length === 0 ? (
          <div style={styles.empty}>まだ記録がありません</div>
        ) : (
          todayLog.map((l) => (
            <div key={l.id} style={styles.prodRow}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{l.itemName}</div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>
                  {l.worker} / {l.line}ライン {l.note && `/ ${l.note}`}
                </div>
              </div>
              <div style={styles.prodQty}>+{l.quantity}</div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>{l.time}</div>
            </div>
          ))
        )}
      </div>

      {/* Past log */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>過去の記録</h3>
        {pastLog.slice(0, 5).map((l) => (
          <div key={l.id} style={{ ...styles.prodRow, opacity: 0.7 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{l.itemName}</div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>
                {l.date.slice(5).replace("-", "/")} / {l.worker} / {l.line}ライン
              </div>
            </div>
            <div style={styles.prodQty}>+{l.quantity}</div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal === "production" && (
        <Modal title="生産記録の追加" onClose={() => setShowModal(null)}>
          <div style={styles.formGroup}>
            <label style={styles.formLabel}>品目 *</label>
            <select style={styles.formSelect} value={formItem} onChange={(e) => setFormItem(e.target.value)}>
              <option value="">選択してください</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.formLabel}>数量 *</label>
              <input style={styles.formInput} type="number" placeholder="0" value={formQty} onChange={(e) => setFormQty(e.target.value)} />
            </div>
            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.formLabel}>ライン</label>
              <select style={styles.formSelect} value={formLine} onChange={(e) => setFormLine(e.target.value)}>
                <option value="A">Aライン</option>
                <option value="B">Bライン</option>
                <option value="C">Cライン</option>
              </select>
            </div>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.formLabel}>作業者 *</label>
            <input style={styles.formInput} placeholder="名前" value={formWorker} onChange={(e) => setFormWorker(e.target.value)} />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.formLabel}>備考</label>
            <input style={styles.formInput} placeholder="不良数、特記事項など" value={formNote} onChange={(e) => setFormNote(e.target.value)} />
          </div>
          <button
            style={{ ...styles.primaryBtn, width: "100%", marginTop: 12, justifyContent: "center", padding: "14px 0" }}
            onClick={handleSubmit}
          >
            {Icons.check} 記録する
          </button>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// INVENTORY PAGE
// ═══════════════════════════════════════════════════════
function InventoryPage({ items, transactions, onAdd, showModal, setShowModal }) {
  const [txType, setTxType] = useState("in");
  const [formItem, setFormItem] = useState("");
  const [formQty, setFormQty] = useState("");
  const [formWH, setFormWH] = useState("");
  const [formNote, setFormNote] = useState("");
  const [formWorker, setFormWorker] = useState("");
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all" ? transactions : transactions.filter((t) => t.type === filter);

  const handleSubmit = () => {
    if (!formItem || !formQty || !formWorker) return;
    const item = items.find((i) => i.id === formItem);
    onAdd({
      type: txType,
      itemId: formItem,
      itemName: item?.name || "",
      quantity: parseInt(formQty),
      warehouse: formWH || item?.warehouse || "",
      note: formNote,
      worker: formWorker,
    });
    setFormItem("");
    setFormQty("");
    setFormNote("");
    setShowModal(null);
  };

  return (
    <div style={styles.page}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={styles.pageTitle}>入出庫管理</h2>
        <button style={styles.primaryBtn} onClick={() => setShowModal("inventory")}>
          {Icons.plus} 新規記録
        </button>
      </div>

      {/* Filter */}
      <div style={styles.filterRow}>
        {[
          { key: "all", label: "すべて" },
          { key: "in", label: "入庫" },
          { key: "out", label: "出庫" },
          { key: "move", label: "移動" },
        ].map((f) => (
          <button
            key={f.key}
            style={{ ...styles.filterBtn, ...(filter === f.key ? styles.filterBtnActive : {}) }}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Transaction list */}
      {filtered.slice(0, 10).map((tx) => (
        <div key={tx.id} style={styles.txRow}>
          <div style={{ ...styles.txBadge, background: txTypeColor(tx.type) + "18", color: txTypeColor(tx.type) }}>
            {txTypeLabel(tx.type)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{tx.itemName}</div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>
              {tx.date.slice(5).replace("-", "/")} / {tx.warehouse} / {tx.worker}
            </div>
            {tx.note && <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{tx.note}</div>}
          </div>
          <div style={{ fontWeight: 700, fontSize: 16, color: tx.type === "out" ? "#ef4444" : "#10b981" }}>
            {tx.type === "out" ? "-" : "+"}{tx.quantity}
          </div>
        </div>
      ))}

      {/* Modal */}
      {showModal === "inventory" && (
        <Modal title="入出庫記録" onClose={() => setShowModal(null)}>
          <div style={styles.formGroup}>
            <label style={styles.formLabel}>種別</label>
            <div style={{ display: "flex", gap: 6 }}>
              {["in", "out", "move"].map((t) => (
                <button
                  key={t}
                  style={{ ...styles.typeBtn, ...(txType === t ? { background: txTypeColor(t), color: "#fff" } : {}) }}
                  onClick={() => setTxType(t)}
                >
                  {txTypeLabel(t)}
                </button>
              ))}
            </div>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.formLabel}>品目 *</label>
            <select style={styles.formSelect} value={formItem} onChange={(e) => setFormItem(e.target.value)}>
              <option value="">選択してください</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>{i.name} (現在庫: {i.currentStock})</option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.formLabel}>数量 *</label>
              <input style={styles.formInput} type="number" placeholder="0" value={formQty} onChange={(e) => setFormQty(e.target.value)} />
            </div>
            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.formLabel}>倉庫</label>
              <input style={styles.formInput} placeholder="第1倉庫" value={formWH} onChange={(e) => setFormWH(e.target.value)} />
            </div>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.formLabel}>担当者 *</label>
            <input style={styles.formInput} placeholder="名前" value={formWorker} onChange={(e) => setFormWorker(e.target.value)} />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.formLabel}>備考</label>
            <input style={styles.formInput} placeholder="取引先、理由など" value={formNote} onChange={(e) => setFormNote(e.target.value)} />
          </div>
          <button
            style={{ ...styles.primaryBtn, width: "100%", marginTop: 12, justifyContent: "center", padding: "14px 0" }}
            onClick={handleSubmit}
          >
            {Icons.check} 記録する
          </button>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// ITEMS MASTER PAGE
// ═══════════════════════════════════════════════════════
function ItemsPage({ items }) {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");

  const filtered = items.filter((i) => {
    const matchSearch = i.name.includes(search) || i.id.includes(search);
    const matchCat = catFilter === "all" || i.category === catFilter;
    return matchSearch && matchCat;
  });

  return (
    <div style={styles.page}>
      <h2 style={styles.pageTitle}>品目マスタ</h2>

      {/* Search */}
      <div style={styles.searchBox}>
        {Icons.search}
        <input
          style={styles.searchInput}
          placeholder="品名 or ID で検索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Category Filter */}
      <div style={styles.filterRow}>
        {[
          { key: "all", label: "すべて" },
          { key: "purchased", label: "仕入" },
          { key: "produced", label: "自社生産" },
          { key: "finished", label: "完成品" },
        ].map((f) => (
          <button
            key={f.key}
            style={{ ...styles.filterBtn, ...(catFilter === f.key ? styles.filterBtnActive : {}) }}
            onClick={() => setCatFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>{filtered.length}件</div>

      {/* Item List */}
      {filtered.map((item) => {
        const ratio = item.currentStock / item.safetyStock;
        const isLow = ratio < 1;
        return (
          <div key={item.id} style={styles.itemCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <div>
                <span style={{ ...styles.catTag, background: categoryColor(item.category) + "18", color: categoryColor(item.category) }}>
                  {categoryLabel(item.category)}
                </span>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#0f172a", marginTop: 4 }}>{item.name}</div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>{item.id} / {item.warehouse}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: isLow ? "#ef4444" : "#0f172a" }}>
                  {item.currentStock}
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>{item.unit}</div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 11, color: "#64748b" }}>
                安全在庫: {item.safetyStock} / 仕入先: {item.supplier}
              </div>
              <div style={{ ...styles.stockBar, width: 80 }}>
                <div
                  style={{
                    height: "100%",
                    borderRadius: 3,
                    width: `${Math.min(ratio * 100, 100)}%`,
                    background: ratio < 0.5 ? "#ef4444" : ratio < 1 ? "#f59e0b" : "#10b981",
                    transition: "width 0.3s",
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// ALERTS PAGE
// ═══════════════════════════════════════════════════════
function AlertsPage({ items }) {
  return (
    <div style={styles.page}>
      <h2 style={styles.pageTitle}>在庫アラート</h2>
      {items.length === 0 ? (
        <div style={{ ...styles.empty, padding: 40 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>✓</div>
          すべて正常です
        </div>
      ) : (
        items.sort((a, b) => a.currentStock / a.safetyStock - b.currentStock / b.safetyStock).map((item) => {
          const deficit = item.safetyStock - item.currentStock;
          const ratio = item.currentStock / item.safetyStock;
          return (
            <div key={item.id} style={styles.alertCard}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ color: ratio < 0.5 ? "#ef4444" : "#f59e0b", display: "flex" }}>{Icons.alert}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#0f172a" }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>{item.id} / {item.warehouse}</div>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", background: "#fef2f2", borderRadius: 8, padding: "10px 14px" }}>
                <div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>現在庫</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#ef4444" }}>{item.currentStock}<span style={{ fontSize: 12, fontWeight: 400 }}> {item.unit}</span></div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>安全在庫</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#64748b" }}>{item.safetyStock}<span style={{ fontSize: 12, fontWeight: 400 }}> {item.unit}</span></div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>不足数</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#ef4444" }}>-{deficit}<span style={{ fontSize: 12, fontWeight: 400 }}> {item.unit}</span></div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MODAL COMPONENT
// ═══════════════════════════════════════════════════════
function Modal({ title, onClose, children }) {
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{title}</h3>
          <button style={styles.modalClose} onClick={onClose}>{Icons.x}</button>
        </div>
        <div style={styles.modalBody}>{children}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════
const styles = {
  app: {
    maxWidth: 480,
    margin: "0 auto",
    background: "#f8fafc",
    minHeight: "100vh",
    fontFamily: "'Noto Sans JP', 'SF Pro Display', -apple-system, sans-serif",
    position: "relative",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
    padding: "14px 16px",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  headerInner: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: "linear-gradient(135deg, #f97316, #fb923c)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    fontWeight: 800,
    color: "#fff",
    letterSpacing: "-0.5px",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: "0.5px",
  },
  headerSub: {
    color: "#94a3b8",
    fontSize: 10,
    letterSpacing: "1px",
  },
  headerDate: {
    color: "#cbd5e1",
    fontSize: 13,
    fontWeight: 500,
  },
  alertBanner: {
    background: "linear-gradient(90deg, #fef2f2, #fee2e2)",
    padding: "10px 16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: 13,
    color: "#dc2626",
    borderBottom: "1px solid #fecaca",
  },
  alertBtn: {
    background: "#dc2626",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "5px 12px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },
  main: {
    flex: 1,
    paddingBottom: 70,
  },
  page: {
    padding: "16px 16px 20px",
  },
  pageTitle: {
    margin: "0 0 16px",
    fontSize: 20,
    fontWeight: 700,
    color: "#0f172a",
    letterSpacing: "-0.3px",
  },
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    marginBottom: 20,
  },
  summaryCard: {
    background: "#fff",
    borderRadius: 12,
    padding: "14px 14px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
  },
  cardLabel: { fontSize: 11, color: "#94a3b8", fontWeight: 500, marginBottom: 4 },
  cardValue: { fontSize: 26, fontWeight: 700, color: "#0f172a", lineHeight: 1.1 },
  cardUnit: { fontSize: 12, fontWeight: 400, color: "#94a3b8", marginLeft: 2 },
  cardSub: { fontSize: 11, color: "#64748b", marginTop: 4 },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: "#475569",
    margin: "0 0 10px",
    letterSpacing: "0.3px",
  },
  catRow: { display: "flex", gap: 8 },
  catCard: {
    flex: 1,
    background: "#fff",
    borderRadius: 10,
    padding: "12px",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  },
  catDot: { width: 8, height: 8, borderRadius: "50%" },
  miniBar: { height: 4, background: "#e2e8f0", borderRadius: 2, marginTop: 8, overflow: "hidden" },
  miniBarFill: { height: "100%", borderRadius: 2, transition: "width 0.3s" },
  quickBtn: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "14px",
    borderRadius: 12,
    background: "#fff7ed",
    color: "#f97316",
    border: "none",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  activityRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 0",
    borderBottom: "1px solid #f1f5f9",
  },
  activityDot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  // Production
  prodSummary: {
    background: "#fff",
    borderRadius: 12,
    padding: "16px",
    marginBottom: 16,
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    textAlign: "center",
  },
  prodRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 14px",
    background: "#fff",
    borderRadius: 10,
    marginBottom: 6,
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  },
  prodQty: {
    fontSize: 18,
    fontWeight: 700,
    color: "#f97316",
    minWidth: 50,
    textAlign: "right",
  },
  // Inventory
  filterRow: { display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" },
  filterBtn: {
    padding: "6px 14px",
    borderRadius: 20,
    border: "1px solid #e2e8f0",
    background: "#fff",
    color: "#64748b",
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
  },
  filterBtnActive: {
    background: "#0f172a",
    color: "#fff",
    borderColor: "#0f172a",
  },
  txRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 14px",
    background: "#fff",
    borderRadius: 10,
    marginBottom: 6,
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  },
  txBadge: {
    padding: "3px 8px",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
  },
  typeBtn: {
    flex: 1,
    padding: "10px",
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    color: "#64748b",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    textAlign: "center",
  },
  // Items
  searchBox: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#fff",
    borderRadius: 10,
    padding: "10px 14px",
    marginBottom: 12,
    border: "1px solid #e2e8f0",
    color: "#94a3b8",
  },
  searchInput: {
    border: "none",
    outline: "none",
    flex: 1,
    fontSize: 14,
    color: "#0f172a",
    background: "transparent",
  },
  itemCard: {
    background: "#fff",
    borderRadius: 12,
    padding: "14px",
    marginBottom: 8,
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  },
  catTag: {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.3px",
  },
  stockBar: {
    height: 6,
    background: "#e2e8f0",
    borderRadius: 3,
    overflow: "hidden",
  },
  // Alerts
  alertCard: {
    background: "#fff",
    borderRadius: 12,
    padding: "14px",
    marginBottom: 10,
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    borderLeft: "4px solid #ef4444",
  },
  // Modal
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    zIndex: 1000,
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
  },
  modal: {
    background: "#fff",
    borderRadius: "20px 20px 0 0",
    width: "100%",
    maxWidth: 480,
    maxHeight: "85vh",
    overflow: "auto",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 20px",
    borderBottom: "1px solid #f1f5f9",
  },
  modalClose: {
    background: "#f1f5f9",
    border: "none",
    borderRadius: 8,
    width: 32,
    height: 32,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "#64748b",
  },
  modalBody: { padding: "16px 20px 32px" },
  // Form
  formGroup: { marginBottom: 14 },
  formLabel: { display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 },
  formInput: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    fontSize: 14,
    color: "#0f172a",
    outline: "none",
    boxSizing: "border-box",
    background: "#f8fafc",
  },
  formSelect: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    fontSize: 14,
    color: "#0f172a",
    outline: "none",
    boxSizing: "border-box",
    background: "#f8fafc",
    appearance: "auto",
  },
  primaryBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "10px 18px",
    borderRadius: 10,
    background: "linear-gradient(135deg, #f97316, #fb923c)",
    color: "#fff",
    border: "none",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(249,115,22,0.3)",
  },
  // Nav
  nav: {
    position: "fixed",
    bottom: 0,
    left: "50%",
    transform: "translateX(-50%)",
    width: "100%",
    maxWidth: 480,
    display: "flex",
    justifyContent: "space-around",
    background: "#fff",
    borderTop: "1px solid #e2e8f0",
    padding: "8px 0 12px",
    zIndex: 100,
  },
  navItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "4px 8px",
    transition: "color 0.2s",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -8,
    background: "#ef4444",
    color: "#fff",
    fontSize: 9,
    fontWeight: 700,
    borderRadius: 10,
    padding: "1px 5px",
    minWidth: 14,
    textAlign: "center",
  },
  // Toast
  toast: {
    position: "fixed",
    bottom: 80,
    left: "50%",
    transform: "translateX(-50%)",
    background: "#0f172a",
    color: "#fff",
    padding: "12px 20px",
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 500,
    zIndex: 1001,
    boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
    animation: "fadeIn 0.3s ease",
  },
  empty: {
    textAlign: "center",
    padding: "24px",
    color: "#94a3b8",
    fontSize: 14,
    background: "#fff",
    borderRadius: 12,
  },
};
