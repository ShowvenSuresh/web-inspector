// Inject notification into the current page
(function() {
  if (document.getElementById("https-warning")) return; // avoid duplicates

  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <div id="https-warning" style="
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 320px;
      background: #fff3f3;
      border: 2px solid #ff4d4d;
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
        background: #ff4d4d;
        color: white;
        padding: 10px;
        font-weight: bold;
        border-top-left-radius: 10px;
        border-top-right-radius: 10px;
      ">
        ⚠️ Security Alert
        <button id="close-warning" style="
          background: transparent;
          border: none;
          color: white;
          font-size: 18px;
          cursor: pointer;
        ">&times;</button>
      </div>
      <div style="padding: 15px; font-size: 14px; color: #333;">
        <p>You are visiting a website that is <strong>not secure (HTTP)</strong>. 
        Your data may be at risk.</p>
        <button id="go-back" style="
          background:#ff4d4d; color:white; border:none; padding:6px 12px; border-radius:6px; margin-right:8px; cursor:pointer;">
          Go Back
        </button>
        <button id="proceed" style="
          background:#ddd; border:none; padding:6px 12px; border-radius:6px; cursor:pointer;">
          Proceed Anyway
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(wrapper);

  document.getElementById("close-warning").onclick = () => wrapper.remove();
  document.getElementById("proceed").onclick = () => wrapper.remove();
  document.getElementById("go-back").onclick = () => window.history.back();
})();
