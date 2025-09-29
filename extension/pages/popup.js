
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

    recentAlertsList.innerHTML = "";
    (recentAlerts || []).forEach((alert) => {
      const div = document.createElement("div");
      div.className = "recent-alert";
      div.innerHTML = `
        <span class="alert-class ${alert.classification?.toLowerCase()}">
          ${alert.classification}
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
//dummy section for the traffic data
const trafficData = [
  {
    status: "safe",
    method: "GET",
    time: "10:30:45",
    url: "https://example.com/api/data",
    length: 28,
    entropy: 3.2,
    headers: 8
  },
  {
    status: "malicious",
    method: "POST",
    time: "10:31:12",
    url: "https://malicious-site.com/payload",
    length: 35,
    entropy: 4.8,
    headers: 12
  },

  {
    status: "suspicious",
    method: "GET",
    time: "10:32:01",
    url: "https://suspicious.net/track",
    length: 29,
    entropy: 4.1,
    headers: 10
  }
];

const trafficList = document.getElementById("traffic-list");

trafficData.forEach(item => {
  const div = document.createElement("div");
  div.className = "traffic-item";

  div.innerHTML = `
    <div class="traffic-header">
      <span class="status ${item.status}">${item.status}</span>
      <span><span class="method">${item.method}</span> ${item.time}</span>
    </div>
    <div class="url">${item.url}</div>
    <div class="meta">
      
    </div>
  `;

  trafficList.appendChild(div);
});



//dummy section for the alert tab 
const alertsList = document.getElementById("alertsList");

// Example data (replace with backend data)
const alertsData = [
  {
    id: 1,
    domain: "malicious-site.com",
    classification: "Malicious",
    method: "POST",
    path: "/login",
    features: {
      single_q: 3,
      double_q: 1,
      dashes: 0,
      braces: 2,
      spaces: 20,
      percentages: 1,
      semicolons: 0,
      angle_brackets: 5,
      special_chars: 2,
      path_length: 10,
      body_length: 200,
      badwords_count: 2
    }
  },
  {
    id: 2,
    domain: "safe-site.com",
    classification: "Benign",
    method: "GET",
    path: "/home",
    features: {
      single_q: 0,
      double_q: 0,
      dashes: 0,
      braces: 0,
      spaces: 10,
      percentages: 0,
      semicolons: 0,
      angle_brackets: 0,
      special_chars: 0,
      path_length: 5,
      body_length: 50,
      badwords_count: 0
    }
  }
];


document.addEventListener("DOMContentLoaded", () => {

  function renderAlerts() {
    alertsList.innerHTML = "";
    alertsData.forEach(alert => {
      const card = document.createElement("div");
      card.className = "alert-card";

      const badgeClass =
        alert.classification === "Malicious"
          ? "status-badge status-malicious"
          : "status-badge status-benign";

      card.innerHTML = `
      <div class="alert-header">
        <span class="alert-title">${alert.domain}</span>
        <span class="${badgeClass}">${alert.classification}</span>
      </div>
      <div class="alert-actions">
        <button class="block-btn">🚫 Block</button>
        <button class="dismiss-btn">✖ Dismiss</button>
        <button class="see-more-btn">🔽 See More</button>
      </div>
      <div class="alert-details">
        <p><b>Method:</b> ${alert.method}</p>
        <p><b>Path:</b> ${alert.path}</p>
        <p><b>Features:</b></p>
        <pre>${JSON.stringify(alert.features, null, 2)}</pre>
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

  renderAlerts();
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
