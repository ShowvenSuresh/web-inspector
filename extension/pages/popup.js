
//navigation bar 

document.addEventListener("DOMContentLoaded", () => {
  // Get all page divs
  const pages = {
    dashboardBtn: document.getElementById("dashboardPage"),
    trafficBtn: document.getElementById("trafficPage"),
    alertsBtn: document.getElementById("alertsPage"),
    historyBtn: document.getElementById("historyPage"),
  };

  // Function to hide all pages
  function hideAllPages() {
    Object.values(pages).forEach(page => {
      page.style.display = "none";
    });
  }

  // Add event listeners for each button
  Object.keys(pages).forEach(btnId => {
    document.getElementById(btnId).addEventListener("click", () => {
      hideAllPages();
      pages[btnId].style.display = "block"; // Show clicked page
    });
  });

  // Show Dashboard by default
  hideAllPages();
  pages.dashboardBtn.style.display = "block";
});

//turn seervice worker on and off
document.addEventListener("DOMContentLoaded", () => {
  const monitorToggle = document.getElementById("monitorToggle");
  const statusBadge = document.getElementById("status-badge");
  var isEnabled

  // Load saved state
  chrome.storage.local.get("monitorEnabled", (data) => {
    monitorToggle.checked = data.monitorEnabled ?? true; // default: enabled
    isEnabled = monitorToggle.checked
    updateStatusBadge(isEnabled); // Update badge on load
  });


  // Function to update the status badge
  function updateStatusBadge(isEnabled) {
    if (isEnabled) {
      statusBadge.textContent = "Enabled";
      statusBadge.className = "badge active"; // Add active class for styling
    } else {
      statusBadge.textContent = "Disabled";
      statusBadge.className = "badge inactive"; // Add inactive class for styling
    }
  }


  // Save state when toggled
  monitorToggle.addEventListener("change", () => {
    const isEnabled = monitorToggle.checked;
    chrome.storage.local.set({ monitorEnabled: isEnabled });
    updateStatusBadge(isEnabled); // Update badge when toggled
    console.log("Monitoring is now:", isEnabled ? "ENABLED" : "DISABLED");
  });
});


// live stats section
document.addEventListener("DOMContentLoaded", () => {
  const requestsCount = document.getElementById("requestsCount");
  const blockedCount = document.getElementById("blockedCount");
  const alertsCount = document.getElementById("alertsCount");
  const avgTime = document.getElementById("avgTime");
  const recentAlertsList = document.getElementById("recentAlertsList");

  function render(stats, recentAlerts) {
    requestsCount.textContent = stats.requests ?? 0;
    blockedCount.textContent = stats.blocked ?? 0;
    alertsCount.textContent = stats.alerts ?? 0;
    avgTime.textContent = `${stats.avgTime ?? 0} ms`;
    let classificationLabel = "malicious"

    recentAlertsList.innerHTML = "";
    (recentAlerts || []).forEach((alert) => {
      const div = document.createElement("div");
      div.className = "recent-alert";
      div.innerHTML = `
        <span class="alert-class ${alert.classification?.toLowerCase()}">
          ${classificationLabel}
        </span>
        <span class="alert-url">${alert.url}</span>
        <span class="alert-time">${alert.time}</span>
      `;
      recentAlertsList.appendChild(div);
    });
  }

  // 🔹 Load latest stats when popup opens
  chrome.storage.local.get(["stats", "recentAlerts"], (data) => {
    render(data.stats || {}, data.recentAlerts || []);
  });

  // 🔹 Also listen for live updates while popup is open
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "statsUpdate") {
      render(msg.stats, msg.recentAlerts);
    }
  });
});

// Live traffic logging

document.addEventListener("DOMContentLoaded", () => {
  const trafficList = document.getElementById("traffic-list");
  function renderTraffic(trafficLog) {
    trafficList.innerHTML = "";

    if (!trafficLog || trafficLog.length === 0) {
      trafficList.innerHTML = `<p class="empty">No traffic captured</p>`;
      return;
    }

    trafficLog.forEach(item => {
      const div = document.createElement("div");
      div.className = "traffic-item";

      // shorten the URL
      const shortUrl = item.url.length > 60 ? item.url.slice(0, 60) + "..." : item.url;

      // map classification -> CSS class
      let statusClass = "unknown";
      if (item.classification === "good" || item.classification === "safe") {
        statusClass = "safe";
      } else if (item.classification === "bad" || item.classification === "malicious") {
        statusClass = "malicious";
      } else if (item.classification === "suspicious") {
        statusClass = "suspicious";
      }

      // extract website/domain
      let domain = "";
      try {
        domain = new URL(item.url).hostname;
      } catch (e) {
        domain = "Unknown";
      }

      div.innerHTML = `
      <div class="traffic-header">
        <span class="status ${statusClass}">${statusClass}</span>
        <span><span class="method">${item.method}</span> ${item.time}</span>
      </div>
      <div class="url">${shortUrl}</div>
      <div class="domain">🌐 ${domain}</div>
    `;

      trafficList.appendChild(div);
    });
  }
  // Load existing traffic on popup open
  chrome.storage.local.get(["trafficLog"], (data) => {
    renderTraffic(data.trafficLog || []);
  });

  //  Listen for live updates
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "statsUpdate") {
      renderTraffic(msg.trafficLog || []);
    }
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const alertsList = document.getElementById("alertsList");

  function getReadableReason(alert) {
    if (alert.classification === "malicious" || alert.classification === "bad") {
      return "This request was flagged because it may contain suspicious or harmful patterns in the URL or body.";
    }
    if (alert.classification === "benign") {
      return "This request was analyzed and found safe.";
    }
    return "No clear classification available.";
  }

  function renderAlerts(alertsLog) {
    alertsList.innerHTML = "";

    if (!alertsLog || alertsLog.length === 0) {
      alertsList.innerHTML = `<p class="empty">No alerts triggered</p>`;
      return;
    }

    alertsLog.forEach(alert => {
      const card = document.createElement("div");
      card.className = "alert-card";

      const badgeClass =
        alert.classification === "bad" || alert.classification === "malicious"
          ? "status-badge status-malicious"
          : "status-badge status-benign";

      card.innerHTML = `
        <div class="alert-header">
          <span class="alert-title">🌐 ${alert.domain || "Unknown Domain"}</span>
          <span class="${badgeClass}">${"malicious" || "unknown"}</span>
        </div>
        <div class="alert-actions">
          <button class="block-btn">🚫 Block</button>
          <button class="dismiss-btn">✖ Dismiss</button>
          <button class="see-more-btn">🔽 See More</button>
        </div>
        <div class="alert-details">
          <p><b>Domain:</b> ${alert.domain || "-"}</p>
          <p><b>Method:</b> ${alert.method || "-"}</p>
          <p><b>Path:</b> ${alert.path || "-"}</p>
          <p><b>Description:</b> ${getReadableReason(alert)}</p>
          <p><b>Features:</b></p>
          <pre class="features-box">${JSON.stringify(alert.features || {}, null, 2)}</pre>
        </div>
      `;

      // Toggle See More
      const seeMoreBtn = card.querySelector(".see-more-btn");
      seeMoreBtn.addEventListener("click", () => {
        card.classList.toggle("expanded");
        seeMoreBtn.textContent = card.classList.contains("expanded")
          ? "🔼 See Less"
          : "🔽 See More";
      });

      // Dismiss
      card.querySelector(".dismiss-btn").addEventListener("click", () => {
        card.remove();
      });

      // Block
      card.querySelector(".block-btn").addEventListener("click", () => {
        alert(`Domain ${alert.domain} has been blocked.`);
      });

      alertsList.appendChild(card);
    });
  }

  // Load alerts when popup opens
  chrome.storage.local.get(["alertsLog"], (data) => {
    renderAlerts(data.alertsLog || []);
  });

  // Listen for live updates from background.js
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "statsUpdate") {
      renderAlerts(msg.alertsLog || []);
    }
  });
});

//dummy section for the history tab
document.addEventListener("DOMContentLoaded", () => {
  const historyList = document.getElementById("historyList");
  const searchBox = document.getElementById("searchHistory");

  // Load history entries
  function loadHistory(query = "", limit = 10) {
    historyList.innerHTML = "";
    chrome.history.search(
      {
        text: query,
        maxResults: limit, // default = 10
        startTime: 0
      },
      (results) => {
        if (!results || results.length === 0) {
          historyList.innerHTML = "<li>No history found.</li>";
          return;
        }
        results.forEach((page) => {
          const li = document.createElement("li");
          li.innerHTML = `
            <strong>${page.title || "(no title)"}</strong><br>
            <a href="${page.url}" target="_blank">${page.url}</a><br>
            <small>${new Date(page.lastVisitTime).toLocaleString()}</small>
          `;
          historyList.appendChild(li);
        });
      }
    );
  }

  // Show last 10 history items on load
  loadHistory("", 10);

  // Live search (show up to 50 results)
  searchBox.addEventListener("input", (e) => {
    loadHistory(e.target.value, 50);
  });
});
