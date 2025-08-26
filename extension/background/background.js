console.log("service worker is active")

const badwords = [
  'sleep', 'uid', 'select', 'waitfor', 'delay',
  'system', 'union', 'order by', 'group by',
  'admin', 'drop', 'script', 'insert', 'update',
  'delete', 'xp_', 'or 1=1'
]

function extractFeatures(details) {
  const urlObj = new URL(details.url)
  const method = details.method || ""
  const path = urlObj.pathname || ""


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

  console.log(" Extracted features:", features);
  return features
}

async function sendToBackend(features){
  try{
    const response = await fetch('http://127.0.0.1:8000/predict', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(features)
    });

    const result = await response.json();
    console.log('Classification result:', result);
  
  }catch(error){
    console.log("fail to send to backend",error)
  }

}

chrome.webRequest.onBeforeRequest.addListener(
   (details)=> {
    try{
      const features = extractFeatures(details)
       //sendToBackend(features)
    //todo--> send to backend for classification using post method
    //generate the popup if the results is bad
    }catch(error){
      console.log("error interceptin request ")
    }
  },
  {urls: ["<all_urls>",]},
  ["requestBody"]

  );
