/**
 * Common database helper functions.
 */
class DBHelper {

  /* Next five functions deal with the indexed database:
    static dbPromise();
    static putRestaurants();
    static getRestaurants();
    static putReviews();
    static getReviewsForRestaurant();

    Code based off of the walkthrough: https://alexandroperez.github.io/mws-walkthrough/?2.5.setting-up-indexeddb-promised-for-offline-use
  */

  // Open up the database
  static dbPromise() {
    // Open the database and update it according to its version #
    return idb.open('restaurants_db', 2, upgradeDB => {
      switch(upgradeDB.oldVersion) {
        case 0:
          upgradeDB.createObjectStore('restaurants', {keyPath: 'id'});
        case 1:
          upgradeDB.createObjectStore('reviews', {keyPath: 'id'}).createIndex('restaurant_id', 'restaurant_id');
      }
    });
  }

  // Function to place the restaurant values into the database
  // Second function parameter, forceUpdate, defaults to false. If true, the data is updated by force.
  static putRestaurants(restaurants, forceUpdate = false) {
    if(!restaurants.push)
      restaurants = [restaurants];
    // Open up the database
    DBHelper.dbPromise().then(db => {
      // Open up a transaction with a store transaction for the object store via readwrite access
      const store = db.transaction('restaurants', 'readwrite').objectStore('restaurants');
      // resolve the following as a promise:
      //    -Get the data from the network
      //    -Put/Insert the data into the database if either:
      //        > The restaurant id doesn't already exist in the database
      //        > The data for that restaurant id is out-of-date
      //    -Force update the data if parameter is set to true
      Promise.all(restaurants.map(networkRestaurant => {
        return store.get(networkRestaurant.id).then(idbRestaurant => {
          if(forceUpdate) {
            return store.put(networkRestaurant);
          }
          if(!idbRestaurant || new Date(networkRestaurant.updatedAt) > new Date(idbRestaurant.updatedAt)) {
            return store.put(networkRestaurant);
          }
        });
      })).then(function(){
        return store.complete;
      });
    });
  }

  // Function to retrieve restaurants
  // 'id' is an optional parameter and will default to 'undefined' if not provided
  static getRestaurants(id = undefined) {
    // Open the database, then open a store transaction for the object store via readonly
    return DBHelper.dbPromise().then(db => {
      const store = db.transaction('restaurants').objectStore('restaurants');
      // If an 'id' was provided, return the appropriate restaurant id as a Number-type to look up in the key column of the database
      if(id)
        return store.get(Number(id));
      return store.getAll();
    });
  }

  // Exact code as putRestaurants(), however different variables names to be more meaningful for this function
  static putReviews(reviews) {
    if(!reviews.push)
      reviews = [reviews];
    // Open up the database
    DBHelper.dbPromise().then(db => {
      // Open up a transaction with a store transaction for the reviews object store via readwrite access
      const store = db.transaction('reviews', 'readwrite').objectStore('reviews');
      // Resolve the following as a promise:
      //    -Get the data from the network
      //    -Put/Insert the data into the database if either:
      //        > The review id doesn't already exist in the database
      //        > The data for that review id is out-of-date
      Promise.all(reviews.map(networkReview => {
        return store.get(networkReview.id).then(idbReview => {
          if(!idbReview || new Date(networkReview.updatedAt) > new Date(idbReview.updatedAt)) {
            return store.put(networkReview);
          }
        });
      })).then(function(){
        return store.complete;
      });
    });
  }

  // Get all the reviews for the appropriate restaurant by referencing its id
  // Code is very close to the getRestaurants() code
  static getReviewsForRestaurant(id) {
    return DBHelper.dbPromise().then(db => {
      // Open the database, then open a store transaction for the object store via readonly
      const storeIndex = db.transaction('reviews').objectStore('reviews').index('restaurant_id');
      // return the appropriate restaurant id as a Number-type to look up in the key column of the database
      return storeIndex.getAll(Number(id));
    })
  }

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337 // Sails Server Port
    return `http://localhost:${port}/restaurants`;
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {
    fetch(DBHelper.DATABASE_URL).then(response => {
      response.json().then(restaurants => {
        // console.log("restaurants JSON: ", restaurants);
        this.putRestaurants(restaurants);
        callback(null, restaurants);
      });
    }).catch(e => {
      // If any error happens in retrieving data from the API, attempt to retrieve data from the IDB
      console.log(`Request failed. Returned error: ${e}\nTrying from the IndexedDB...`);
      this.getRestaurants().then(idbResults => {
        if(idbResults.length > 0) {
          console.log("Success! There is data stored in the IndexedDB.");
          callback(null, idbResults);
        } else {
          callback("There are no restaurants stored in the IndexedDB.", null);
        }
      });
    });
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch restaurants with specifc id.

    fetch(`${DBHelper.DATABASE_URL}/${id}`).then(response => {
      if(!response.ok)
        return Promise.reject("Restaurant could not be fetched");
      return response.json();
    }).then(fetchedRestaurant => {
      // If data successfully retrieved via the API, put it in the IDB as well 
      this.putRestaurants(fetchedRestaurant);
      return callback(null, fetchedRestaurant);
    }).catch(networkError => {
      // API fetch didn't work via the network
      // Try fetching from the IDB
      console.log(`${networkError}\nNow trying to retrieve data from the IndexedDB`);
      this.getRestaurants(id).then(idbResults => {
        if(!idbResults)
        // If failed, throw a callback with an error message
          return callback("There are no restaurants stored in the IndexedDB.", null);
        else
        // Successful, then send the results
          return callback(null, idbResults);
      });
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant Review Functions 
  */

  /**
   * Reviews URL.
   */
  static get REVIEWS_URL() {
    const port = 1337 // Sails Server Port
    return `http://localhost:${port}/reviews/?restaurant_id=`;
  }
  // Function to fetch reviews for the appropriate restaurant
  static fetchReviewsByRestaurantId(restaurant_id) {
    // 'GET' call for reviews
    return fetch(`${DBHelper.REVIEWS_URL}${restaurant_id}`).then(response => {
      // if unsuccessful, log it to console, or else, convert response to JSON
      if(!response.ok) {
        return Promise.reject("Unable to fetch reviews from the network");
      } else {
        return response.json();
      }
    }).then(fetchedReviews => {
      // If all good, return the data fetched
      // & store reviews in idb
      this.putReviews(fetchedReviews);
      return fetchedReviews;
    }).catch(networkError => {
      // API fetch didn't work via the network
      // Try fetching from the IDB
      console.log(`${networkError}\nNow trying to retrieve data from the IndexedDB`);
      return this.getReviewsForRestaurant(restaurant_id).then(idbResults => {
        if(idbResults < 1)
        // If failed (no reviews found), return a null
          return null;
        else
        // Successful, then send the results
          return idbResults;
      });
    })
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   * Pull image id from restaurant.photograph field, if unavailable, then pull image from restaurant.id
   */
  static imageUrlForRestaurant(restaurant, type) {
    return (`/img/${type}/${restaurant.photograph||restaurant.id}.jpg`);
  }

  /**
   * Map marker for a restaurant.
   */
   static mapMarkerForRestaurant(restaurant, map) {
    // https://leafletjs.com/reference-1.3.0.html#marker  
    const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng],
      {title: restaurant.name,
      alt: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant)
      })
      marker.addTo(newMap);
    return marker;
  } 
  /* static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  } */

}

