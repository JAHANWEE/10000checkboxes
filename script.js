  const TOTAL = 10000;
  const grid = document.getElementById("grid");
  const statusEl = document.getElementById("status");
  const statusText = document.getElementById("status-text");
  const checkedCount = document.getElementById("checked-count");
  const uncheckedCount = document.getElementById("unchecked-count");
  const progressBar = document.getElementById("progress-bar");
  const pctLabel = document.getElementById("pct-label");

  // Build DOM — all 10k checkboxes
  const checkboxes = new Array(TOTAL);
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < TOTAL; i++) {
    const wrap = document.createElement("div");
    wrap.className = "cb-wrap";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.dataset.index = i;
    cb.title = `#${i + 1}`;
    wrap.appendChild(cb);
    fragment.appendChild(wrap);
    checkboxes[i] = cb;
  }
  grid.appendChild(fragment);

  // Stats
  let checkedTotal = 0;

  function updateStats() {
    checkedCount.textContent = checkedTotal;
    uncheckedCount.textContent = TOTAL - checkedTotal;
    const pct = ((checkedTotal / TOTAL) * 100).toFixed(1);
    progressBar.style.width = pct + "%";
    pctLabel.textContent = pct + "% checked";
  }

  // Flash animation helper
  function flashCheckbox(cb) {
    cb.classList.remove("flash");
    void cb.offsetWidth; // reflow
    cb.classList.add("flash");
  }

  // WebSocket
  const WS_URL = `ws://${location.host}`;
  let ws;
  let reconnectTimer;

  function connect() {
    ws = new WebSocket(WS_URL);

    ws.addEventListener("open", () => {
      statusEl.className = "connected";
      statusText.textContent = "Connected";
      clearTimeout(reconnectTimer);
    });

    ws.addEventListener("close", () => {
      statusEl.className = "disconnected";
      statusText.textContent = "Disconnected — retrying…";
      reconnectTimer = setTimeout(connect, 2000);
    });

    ws.addEventListener("error", () => {
      ws.close();
    });

    ws.addEventListener("message", (event) => {
      let msg;
      try { msg = JSON.parse(event.data); } catch { return; }

      if (msg.type === "init") {
        // Decode base64 bitset
        const raw = atob(msg.state);
        checkedTotal = 0;
        for (let i = 0; i < TOTAL; i++) {
          const byte = raw.charCodeAt(Math.floor(i / 8));
          const bit = (byte >> (7 - (i % 8))) & 1;
          checkboxes[i].checked = bit === 1;
          if (bit === 1) checkedTotal++;
        }
        updateStats();
      }

      if (msg.type === "update") {
        const cb = checkboxes[msg.index];
        if (!cb) return;
        const wasChecked = cb.checked;
        cb.checked = msg.value === 1;
        if (wasChecked !== cb.checked) {
          checkedTotal += cb.checked ? 1 : -1;
          updateStats();
        }
        flashCheckbox(cb);
      }

      if (msg.type === "users") {
        document.getElementById("user-count").textContent = msg.count;
      }
    });
  }

  // Click handler — delegate from grid
  grid.addEventListener("change", (e) => {
    const cb = e.target;
    if (cb.type !== "checkbox") return;
    const index = parseInt(cb.dataset.index, 10);

    // Optimistic local update
    checkedTotal += cb.checked ? 1 : -1;
    updateStats();

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "toggle", index }));
    }
  });

  connect();