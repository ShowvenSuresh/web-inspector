document.addEventListener("DOMContentLoaded", () => {
  console.log("script.js loaded");

  const dashboardBtn = document.getElementById("dashboard");
  const trafficBtn = document.getElementById("traffic");
  const alertsBtn = document.getElementById("alerts");

  dashboardBtn.addEventListener("click", () => {
    console.log("Dashboard button clicked");
  });

  trafficBtn.addEventListener("click", () => {
    console.log("Traffic button clicked");
  });

  alertsBtn.addEventListener("click", () => {
    console.log("Alerts button clicked");
  });
});
