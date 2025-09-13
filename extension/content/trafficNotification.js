(function() {
  if (document.getElementById("malicious-warning")) return; // avoid duplicates

  const domain = window.location.hostname;

  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <div id="malicious-warning" style="
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 340px;
      background: #fff3f3;
      border: 2px solid #d63031;
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
        background: #d63031;
        color: white;
        padding: 10px;
        font-weight: bold;
        border-top-left-radius: 10px;
        border-top-right-radius: 10px;
      ">
        🚨 Malicious Traffic Detected
        <button id="close-malicious" style="
          background: transparent;
          border: none;
          color: white;
          font-size: 18px;
          cursor: pointer;
        ">&times;</button>
      </div>
      <div style="padding: 15px; font-size: 14px; color: #333;">
        <p>Suspicious activity detected from <strong>${domain}</strong>.</p>
        <div style="margin-top:10px;">
          <button id="go-alerts" style="
            background:#e17055; color:white; border:none; padding:6px 12px; border-radius:6px; margin-right:8px; cursor:pointer;">
            Go to Alerts
          </button>
          <button id="block-domain" style="
            background:#d63031; color:white; border:none; padding:6px 12px; border-radius:6px; margin-right:8px; cursor:pointer;">
            Block Domain
          </button>
          <button id="dismiss" style="
            background:#ddd; border:none; padding:6px 12px; border-radius:6px; cursor:pointer;">
            Dismiss
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(wrapper);

  // Buttons
  document.getElementById("close-malicious").onclick = () => wrapper.remove();
  document.getElementById("dismiss").onclick = () => wrapper.remove();

  document.getElementById("go-alerts").onclick = () => {
    chrome.runtime.sendMessage({ type: "open-alerts" });
    wrapper.remove();
  };

  document.getElementById("block-domain").onclick = () => {
    chrome.runtime.sendMessage({ type: "block-domain", domain });
    wrapper.remove();
  };
})();

