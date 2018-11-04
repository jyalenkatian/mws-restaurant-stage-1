const appName = "mws-restaurant";
const versionNumber = "-002";

var cacheID = appName + versionNumber;

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
                "/css/styles.css",
                "/data/restaurants.json",
                "/js/",
                "/js/dbhelper.js",
                "/js/main.js",
                "/js/restauarant_info.js",
                "/js/register.js",
                "/img/favicon.png"
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
    if(event.request.url.indexOf("restaurant.html") > -1) {
        const cacheURL = "restaurant.html";
        cacheRequest = new Request(cacheURL);
    }
    if(cacheUrlObj.hostname !== "localhost") {
        event.request.mode = "no-cors";
    }

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
                        statusText: "Appplication is not connected to the internet"
                    });
                })
            );
        })
    );
});