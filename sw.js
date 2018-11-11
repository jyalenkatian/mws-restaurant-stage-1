const appName = "mws-restaurant";
const versionNumber = "-003";

var cacheID = appName + versionNumber;

var imgCache = appName + "-images" + versionNumber;

// Referenced from Doug Brown's Webinar

/** At Service Worker Install time, cache all static assets */
self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(cacheID).then(cache => {
            return cache
            .addAll([
                "/",
                "/index.html",
                "/restaurant.html",
                "/manifest.json",
                "/css/styles.css",
                "/js/",
                "/js/dbhelper.js",
                "/js/main.js",
                "/js/restauarant_info.js",
                "/js/register.js",
                "/js/idb.js",
                "/img/favicon.png",
                "/img/icons/icon-72x72.png",
                "/img/icons/icon-96x96.png",
                "/img/icons/icon-128x128.png",
                "/img/icons/icon-144x144.png",
                "/img/icons/icon-152x152.png",
                "/img/icons/icon-192x192.png",
                "/img/icons/icon-384x384.png",
                "/img/icons/icon-512x512.png"
            ]).catch(error => {
                console.log("Failed to open cache: " + error);
            });
        })
    );
});

/** Hijack fetch requests and respond accordingly */
self.addEventListener("fetch", event => {
    let cacheRequest = event.request;
    let cacheUrlObj = new URL(event.request.url);

    if(cacheUrlObj.hostname !== "localhost") {
        event.request.mode = "no-cors";
    }

    // Cache images & match them if looking for an image file
    if(cacheUrlObj.pathname.startsWith('/img')) {
        let imageUrl = cacheRequest.url;
        
        cacheRequest = new Request(imageUrl);
        event.respondWith(
            caches.match(cacheRequest).then(response => {
                return (
                    response ||
                    fetch(event.request).then(fetchResponse => {
                        return caches.open(imgCache).then(cache => {
                            cache.put(event.request, fetchResponse.clone());
                            return fetchResponse;
                        });
                    }).catch(error => {
                        return new Response("Application is not connected to the internet.", {
                            status: 404,
                            statusText: "Appplication is not connected to the internet"
                        });
                    })
               );
            })
        );
    } else { // Else load anything else
        event.respondWith(
            caches.match(cacheRequest).then(response => {
                return (
                    response ||
                    fetch(event.request).then(fetchResponse => {
                        return caches.open(cacheID).then(cache => {
                            cache.put(event.request, fetchResponse.clone());
                            return fetchResponse;
                        });
                    }).catch(error => {
                        return new Response("Application is not connected to the internet.", {
                            status: 404,
                            statusText: "Appplication is not connected to the internet."
                        });
                    })
                );
            })
        );
    }
});