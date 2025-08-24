console.log("service worker is active")


chrome.webRequest.onBeforeRequest.addListener(
  (details)=> {
    console.log("Intercepted webRequest", details)
  },
  {urls: ["<all_urls>"]},
  ["requestBody"]

  );

