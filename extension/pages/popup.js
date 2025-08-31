
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

