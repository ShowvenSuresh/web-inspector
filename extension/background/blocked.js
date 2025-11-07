
document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const domain = params.get("domain");

  const messageEl = document.getElementById("message");
  const goBackBtn = document.getElementById("goBackBtn");
  const unblockBtn = document.getElementById("unblockBtn");

  if (domain && messageEl) {
    messageEl.textContent = `${domain} has been blocked by your browser extension.`;
  }

  // "Go Back" button just closes tab
  goBackBtn?.addEventListener("click", () => window.close());

  // "Unblock & Reload" button
  unblockBtn?.addEventListener("click", () => {
    if (!domain) return alert("No domain found.");

    console.log("[blocked.js] Sending unblockDomain message for", domain);

    chrome.runtime.sendMessage({ action: "unblockDomain", domain }, (res) => {
      if (res?.success) {
        // reload the original site
        window.location.href = `https://${domain}`;
      } else {
        alert("Failed to unblock site.");
      }
    });
  });
});

