
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

})

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
//dummy section for the history tab
//dummy section for the is https nofification
//dummy section for the web traffic alert notification
