const TOTAL = 10000;
const grid         = document.getElementById("grid");
const statusEl     = document.getElementById("status");
const statusText   = document.getElementById("status-text");
const checkedCount = document.getElementById("checked-count");
const uncheckedEl  = document.getElementById("unchecked-count");
const progressBar  = document.getElementById("progress-bar");
const pctLabel     = document.getElementById("pct-label");

const checkboxes = new Array(TOTAL);
const fragment   = document.createDocumentFragment();

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

let checkedTotal = 0;

function updateStats() {
  checkedCount.textContent = checkedTotal;
  uncheckedEl.textContent  = TOTAL - checkedTotal;
  const pct = ((checkedTotal / TOTAL) * 100).toFixed(1);
  progressBar.style.width = pct + "%";
  pctLabel.textContent    = pct + "%";
}

function flashCheckbox(cb) {
  cb.classList.remove("flash");
  void cb.offsetWidth; 
  cb.classList.add("flash");
}


const socket = io({ transports: ["websocket", "polling"] });

socket.on("connect", () => {
  statusEl.className  = "status-pill connected";
  statusText.textContent = "connected";
});

socket.on("disconnect", () => {
  statusEl.className  = "status-pill disconnected";
  statusText.textContent = "reconnecting…";
});


socket.on("init", ({ state }) => {
  const raw = atob(state);
  checkedTotal = 0;
  for (let i = 0; i < TOTAL; i++) {
    const byte = raw.charCodeAt(Math.floor(i / 8));
    const bit  = (byte >> (7 - (i % 8))) & 1;
    checkboxes[i].checked = bit === 1;
    if (bit === 1) checkedTotal++;
  }
  updateStats();
});

socket.on("update", ({ index, value }) => {
  const cb = checkboxes[index];
  if (!cb) return;
  const wasChecked = cb.checked;
  cb.checked = value === 1;
  if (wasChecked !== cb.checked) {
    checkedTotal += cb.checked ? 1 : -1;
    updateStats();
  }
  flashCheckbox(cb);
});

socket.on("users", ({ count }) => {
  document.getElementById("user-count").textContent = count;
});

grid.addEventListener("change", (e) => {
  const cb = e.target;
  if (cb.type !== "checkbox") return;
  const index = parseInt(cb.dataset.index, 10);

  checkedTotal += cb.checked ? 1 : -1;
  updateStats();

  socket.emit("toggle", { index });
});
