// File to set up the service worker
// Referenced from Doug Brown's Webinar

if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").then( reg => {
        console.log("Serivce worker registration successful: " + reg.scope);
    }).catch(error => {
        console.log("Registration failed due to the following error: " + error);
    })
};