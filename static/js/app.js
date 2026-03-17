let currentVideoInfo = null;
let downloads = {};
let evtSource = null;

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatBytes(bytes) {
    if (!bytes || bytes === 0) return "—";
    const units = ["B", "KB", "MB", "GB"];
    let i = 0;
    let val = bytes;
    while (val >= 1024 && i < units.length - 1) {
        val /= 1024;
        i++;
    }
    return `${val.toFixed(1)} ${units[i]}`;
}

function formatDuration(seconds) {
    if (!seconds) return "";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
}

function statusLabel(status) {
    const labels = {
        pending: "Bekliyor",
        downloading: "İndiriliyor",
        paused: "Duraklatıldı",
        completed: "Tamamlandı",
        error: "Hata",
    };
    return labels[status] || status;
}

function $(sel) {
    return document.querySelector(sel);
}

// ── URL Input ───────────────────────────────────────────────────────────────

const urlInput = $("#urlInput");
urlInput.addEventListener("paste", () => {
    setTimeout(() => fetchVideoInfo(), 100);
});
urlInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") fetchVideoInfo();
});

async function fetchVideoInfo() {
    const url = urlInput.value.trim();
    if (!url) return;

    const btn = $("#fetchBtn");
    const btnText = btn.querySelector(".btn-text");
    const btnLoader = btn.querySelector(".btn-loader");
    const errorEl = $("#urlError");

    btn.disabled = true;
    btnText.textContent = "Yükleniyor...";
    btnLoader.classList.remove("hidden");
    errorEl.classList.add("hidden");
    $("#videoInfo").classList.add("hidden");

    try {
        const res = await fetch("/api/video/info", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url }),
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Bilgi alınamadı");

        currentVideoInfo = data;
        currentVideoInfo._url = url;
        renderVideoInfo(data);
    } catch (err) {
        errorEl.textContent = err.message;
        errorEl.classList.remove("hidden");
    } finally {
        btn.disabled = false;
        btnText.textContent = "Bilgi Getir";
        btnLoader.classList.add("hidden");
    }
}

function renderVideoInfo(info) {
    $("#videoThumb").src = info.thumbnail;
    $("#videoTitle").textContent = info.title;
    $("#videoDuration").textContent = formatDuration(info.duration);

    const select = $("#qualitySelect");
    select.innerHTML = "";
    info.formats.forEach((f) => {
        const opt = document.createElement("option");
        opt.value = f.format_id;
        opt.textContent = f.label;
        opt.dataset.filesize = f.filesize || 0;
        select.appendChild(opt);
    });
    select.addEventListener("change", updateEstimatedSize);
    updateEstimatedSize();

    $("#videoInfo").classList.remove("hidden");
}

function updateEstimatedSize() {
    const select = $("#qualitySelect");
    const opt = select.options[select.selectedIndex];
    const size = parseInt(opt?.dataset.filesize || 0);
    $("#estimatedSize").textContent = size > 0 ? `~${formatBytes(size)}` : "";
}

// ── Start Download ──────────────────────────────────────────────────────────

async function startDownload() {
    if (!currentVideoInfo) return;

    const select = $("#qualitySelect");
    const formatId = select.value;
    const qualityLabel = select.options[select.selectedIndex].textContent;

    try {
        const res = await fetch("/api/download/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                url: currentVideoInfo._url,
                format_id: formatId,
                quality_label: qualityLabel,
                video_info: currentVideoInfo,
            }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        $("#videoInfo").classList.add("hidden");
        urlInput.value = "";
        currentVideoInfo = null;
    } catch (err) {
        alert("İndirme başlatılamadı: " + err.message);
    }
}

// ── Pause / Resume / Delete ─────────────────────────────────────────────────

async function pauseDownload(id) {
    await fetch(`/api/download/${id}/pause`, { method: "POST" });
}

async function resumeDownload(id) {
    await fetch(`/api/download/${id}/resume`, { method: "POST" });
}

async function deleteDownload(id) {
    if (!confirm("Bu indirmeyi silmek istediğine emin misin?")) return;
    await fetch(`/api/download/${id}`, { method: "DELETE" });
}

// ── Render Downloads List ───────────────────────────────────────────────────

function renderDownloads() {
    const list = $("#downloadsList");
    const empty = $("#emptyState");
    const keys = Object.keys(downloads);

    if (keys.length === 0) {
        list.innerHTML = "";
        list.appendChild(empty);
        empty.classList.remove("hidden");
        return;
    }

    empty.classList.add("hidden");

    const sorted = keys
        .map((k) => downloads[k])
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    list.innerHTML = sorted.map((dl) => buildDownloadItem(dl)).join("");
}

function buildDownloadItem(dl) {
    const progress = dl.progress || 0;
    const progressClass =
        dl.status === "completed" ? "completed" :
        dl.status === "paused" ? "paused" :
        dl.status === "error" ? "error" : "";

    let actionButtons = "";
    if (dl.status === "downloading") {
        actionButtons = `<button onclick="pauseDownload(${dl.id})" title="Duraklat">⏸ Duraklat</button>`;
    } else if (dl.status === "paused") {
        actionButtons = `<button onclick="resumeDownload(${dl.id})" title="Devam Et">▶ Devam Et</button>`;
    } else if (dl.status === "completed") {
        actionButtons = `<button onclick="window.open('/api/download/${dl.id}/file','_blank')" title="Oynat">▶ Oynat</button>`;
    }
    actionButtons += `<button class="danger" onclick="deleteDownload(${dl.id})" title="Sil">✕ Sil</button>`;

    const speedEta =
        dl.status === "downloading"
            ? `${dl.speed || ""} ${dl.eta ? "• " + dl.eta : ""}`
            : "";

    return `
        <div class="download-item" data-id="${dl.id}">
            <img class="dl-thumb" src="${dl.thumbnail || ""}" alt="" onerror="this.style.display='none'">
            <div class="dl-content">
                <div class="dl-header">
                    <span class="dl-title">${escapeHtml(dl.title || "Bilinmeyen Video")}</span>
                    <span class="status-badge status-${dl.status}">${statusLabel(dl.status)}</span>
                </div>
                <div class="dl-meta">
                    <span>${dl.quality_label || ""}</span>
                    <span>${dl.filesize ? formatBytes(dl.filesize) : ""}</span>
                </div>
                <div class="progress-wrapper">
                    <div class="progress-bar">
                        <div class="progress-fill ${progressClass}" style="width: ${progress}%"></div>
                    </div>
                    <div class="progress-stats">
                        <span>%${progress.toFixed(1)}</span>
                        <span>${speedEta}</span>
                    </div>
                </div>
                <div class="dl-actions">
                    ${actionButtons}
                </div>
            </div>
        </div>
    `;
}

function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

// ── SSE Connection ──────────────────────────────────────────────────────────

function connectSSE() {
    if (evtSource) {
        evtSource.close();
    }

    evtSource = new EventSource("/api/downloads/stream");

    evtSource.addEventListener("init", (e) => {
        const list = JSON.parse(e.data);
        downloads = {};
        list.forEach((dl) => {
            downloads[dl.id] = dl;
        });
        renderDownloads();
    });

    evtSource.onmessage = (e) => {
        const event = JSON.parse(e.data);
        handleSSEEvent(event);
    };

    evtSource.onerror = () => {
        // EventSource reconnects automatically after ~3s
    };
}

function handleSSEEvent(event) {
    switch (event.type) {
        case "progress":
            if (downloads[event.id]) {
                downloads[event.id].downloaded_bytes = event.downloaded_bytes;
                downloads[event.id].progress = event.progress;
                downloads[event.id].speed = event.speed;
                downloads[event.id].eta = event.eta;
                downloads[event.id].status = event.status;
                updateDownloadItemInPlace(event.id);
            }
            break;

        case "status":
            if (downloads[event.id]) {
                downloads[event.id].status = event.status;
                if (event.progress !== undefined) {
                    downloads[event.id].progress = event.progress;
                }
                if (event.error_message) {
                    downloads[event.id].error_message = event.error_message;
                }
                renderDownloads();
            }
            break;

        case "new":
            if (event.download) {
                downloads[event.download.id] = event.download;
                renderDownloads();
            }
            break;

        case "deleted":
            delete downloads[event.id];
            renderDownloads();
            break;
    }
}

function updateDownloadItemInPlace(id) {
    const dl = downloads[id];
    if (!dl) return;

    const el = document.querySelector(`.download-item[data-id="${id}"]`);
    if (!el) {
        renderDownloads();
        return;
    }

    const fill = el.querySelector(".progress-fill");
    if (fill) {
        fill.style.width = `${dl.progress || 0}%`;
    }

    const stats = el.querySelector(".progress-stats");
    if (stats) {
        const speedEta = `${dl.speed || ""} ${dl.eta ? "• " + dl.eta : ""}`;
        stats.innerHTML = `<span>%${(dl.progress || 0).toFixed(1)}</span><span>${speedEta}</span>`;
    }
}

// ── Init ────────────────────────────────────────────────────────────────────

connectSSE();
