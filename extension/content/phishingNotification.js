
(function() {
  if (document.getElementById("phishing-warning")) return; // avoid duplicates

  const domain = window.location.hostname;

  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <div id="phishing-warning" style="
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 340px;
      background: #fff8e1;
      border: 2px solid #f39c12;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-family: Arial, sans-serif;
      z-index: 999999;
      animation: slideIn 0.4s ease;
    ">
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #f39c12;
        color: white;
        padding: 10px;
        font-weight: bold;
        border-top-left-radius: 10px;
        border-top-right-radius: 10px;
      ">
        ⚠️ Phishing Website Detected
        <button id="close-phishing" style="
          background: transparent;
          border: none;
          color: white;
          font-size: 18px;
          cursor: pointer;
        ">&times;</button>
      </div>
      <div style="padding: 15px; font-size: 14px; color: #333;">
        <p>The website <strong>${domain}</strong> is suspected to be a <strong>phishing site</strong> trying to steal your information.</p>
        <div style="margin-top:10px;">
          <button id="go-alerts-phishing" style="
            background:#e67e22; color:white; border:none; padding:6px 12px; border-radius:6px; margin-right:8px; cursor:pointer;">
            Go to Alerts
          </button>
          <button id="block-domain-phishing" style="
            background:#c0392b; color:white; border:none; padding:6px 12px; border-radius:6px; margin-right:8px; cursor:pointer;">
            Block Domain
          </button>
          <button id="dismiss-phishing" style="
            background:#ddd; border:none; padding:6px 12px; border-radius:6px; cursor:pointer;">
            Dismiss
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(wrapper);

  // Buttons
  document.getElementById("close-phishing").onclick = () => wrapper.remove();
  document.getElementById("dismiss-phishing").onclick = () => wrapper.remove();

  document.getElementById("go-alerts-phishing").onclick = () => {
    chrome.runtime.sendMessage({ type: "open-alerts" });
    wrapper?.remove();
  };

  document.getElementById("block-domain-phishing").onclick = () => {
    chrome.runtime.sendMessage({ type: "block-domain", domain });
    wrapper?.remove();
  };
})();
