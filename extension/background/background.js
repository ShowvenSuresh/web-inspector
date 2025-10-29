console.log("service worker is active")

const badwords = [
  'sleep', 'uid', 'select', 'waitfor', 'delay',
  'system', 'union', 'order by', 'group by',
  'admin', 'drop', 'script', 'insert', 'update',
  'delete', 'xp_', 'or 1=1'
]

// Global stats
let stats = {
  requests: 0,
  blocked: 0,
  alerts: 0,
  avgTime: 0,
};

let recentAlerts = [];
let trafficLog = [];
let alertsLog = [];
const MAX_ALERTS = 20;
const MAX_LOGS = 50;


let monitoringEnabled = true;

// Initialize monitoring state from storage when service worker starts
chrome.storage.local.get("monitorEnabled", (data) => {
  monitoringEnabled = data.monitorEnabled ?? true; // default: enabled
  console.log("Service worker initialized with monitoring:", monitoringEnabled ? "ENABLED" : "DISABLED");
});

// Listen for changes to the monitoring state
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.monitorEnabled) {
    monitoringEnabled = changes.monitorEnabled.newValue;
    console.log("Service worker monitoring state changed to:", monitoringEnabled ? "ENABLED" : "DISABLED");
  }
});


function extractFeatures(details) {
  const urlObj = new URL(details.url)
  const method = details.method || ""
  const path = urlObj.pathname || ""
  let isHttps = false


  if (urlObj.protocol == "https:") {
    isHttps = true
  }

  //console.log("isHttps", isHttps)

  //console.log(urlObj)


  let body = ""
  if (details.requestBody && details.requestBody.raw) {
    try {
      body = new TextDecoder().decode(details.requestBody.raw[0].bytes);
    } catch (e) {
      body = ""
    }
  }


  const features = {
    method: method,
    path: path,
    body: body,
    single_q: (body.match(/'/g) || []).length,
    double_q: (body.match(/"/g) || []).length,
    dashes: (body.match(/--/g) || []).length,
    braces: (body.match(/[{}]/g) || []).length,
    spaces: (body.match(/\s/g) || []).length,
    percentages: (body.match(/%/g) || []).length,
    semicolons: (body.match(/;/g) || []).length,
    angle_brackets: (body.match(/[<>]/g) || []).length,
    special_chars: (body.match(/[@#$^&*]/g) || []).length,
    path_length: path.length,
    body_length: body.length,
    badwords_count: badwords.reduce((count, w) => count + (body.toLowerCase().includes(w) ? 1 : 0), 0)
  }

  //console.log(" Extracted features:", features);
  return features
}

async function sendToBackend(features) {
  try {
    //    console.log(features)
    const start = Date.now();
    const response = await fetch('http://127.0.0.1:8000/predict', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(features)
    });

    const result = await response.json();
    console.log('Classification result:', result);
    const elapsed = Date.now() - start;

    // update avg time
    stats.avgTime =
      stats.requests === 0
        ? elapsed
        : Math.round((stats.avgTime * (stats.requests - 1) + elapsed) / stats.requests);

    return result

  } catch (error) {
    console.log("fail to send to backend", error)
  }

}


// intercept the web request
chrome.webRequest.onBeforeRequest.addListener(
  async (details) => {
    if (!monitoringEnabled) return;

    try {
      if (
        details.url.startsWith("http://127.0.0.1:8000/predict") ||
        details.url.startsWith("chrome-extension://") ||
        details.url.includes("/v1/traces") ||
        details.url.includes("/analytics") ||
        details.url.includes("/telemetry")
      ) {
        return;
      }

      stats.requests++;

      const features = extractFeatures(details);
      const result = await sendToBackend(features);
      if (!result) return; // backend failed

      // Normalize classification
      const classification =
        result?.results?.stacked?.prediction?.toLowerCase() || "unknown";

      // --- Traffic log (all requests)
      trafficLog.unshift({
        time: new Date().toLocaleTimeString(),
        url: details.url,
        method: details.method,
        classification
      });
      if (trafficLog.length > MAX_LOGS) trafficLog.pop();

      // --- Alerts log (full details, only for bad/malicious)
      if (["bad", "malicious"].includes(classification)) {
        stats.alerts++;

        const urlObj = new URL(details.url);

        const alertEntry = {
          id: Date.now(),
          domain: urlObj.hostname,
          classification,
          method: details.method,
          path: urlObj.pathname,
          features: features // <-- keep raw extracted features here
        };

        alertsLog.unshift(alertEntry);
        if (alertsLog.length > MAX_ALERTS) alertsLog.pop();

        // Optional recentAlerts (for popup badge)
        recentAlerts.unshift({
          time: new Date().toLocaleTimeString(),
          url: details.url,
          method: details.method,
          classification,
        });
        if (recentAlerts.length > MAX_ALERTS) recentAlerts.pop();

        // Inject warning popup in the active tab
        if (details.tabId && details.tabId > 0) {
          chrome.scripting.executeScript({
            target: { tabId: details.tabId },
            files: ["/content/trafficNotification.js"],
          });
        }
      }

      // Save everything
      chrome.storage.local.set({ stats, trafficLog, alertsLog, recentAlerts }, () => {
        console.log("Logs saved:", {
          traffic: trafficLog.length,
          alerts: alertsLog.length
        });
      });

      // Broadcast update
      chrome.runtime.sendMessage({
        type: "statsUpdate",
        stats,
        trafficLog,
        alertsLog,
        recentAlerts
      }).catch(() => { });
    } catch (error) {
      console.log("error intercepting request", error);
    }
  },
  { urls: ["<all_urls>"] },
  ["requestBody"]
);



//checking weather the website is https
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  try {
    if (changeInfo.status === "complete" && tab.url?.startsWith("http://")) {
      chrome.scripting.executeScript({
        target: { tabId },
        files: ["/content/httpNotification.js"]
      });
    }
  } catch (e) {
    console.log("http detection error", e)
  }
});

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === "open-alerts") {
    chrome.action.openPopup(); // opens dashboard.html
    // optionally, tell dashboard to switch to Alerts tab
  }

  if (msg.type === "block-domain" && msg.domain) {
    chrome.storage.local.get({ blocked: [] }, (data) => {
      const updated = [...new Set([...data.blocked, msg.domain])];
      chrome.storage.local.set({ blocked: updated });
    });
  }
});

// add a section to extract the featueres needed for the ohishing detection

