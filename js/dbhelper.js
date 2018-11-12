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

    Code based off of the walkthrough: https://alexandroperez.github.io/mws-walkthrough/
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
        // case 2:
        //   upgradeDB.createObjectStore('offline-reviews', {autoIncrement: true}).createIndex('restaurant_id', 'restaurant_id');
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

  /**
   * Favorite Button-Related Functions:
   *    static handleClick()
   *    static favoriteButton()
  */

  // Event handler for when the favorite button is clicked
  static handleClick() {
    const restaurantId = this.dataset.id;
    const fav = this.getAttribute('aria-pressed') == 'true';
    const url = `${DBHelper.DATABASE_URL}/${restaurantId}/?is_favorite=${!fav}`;
    const PUT = {method: 'PUT'};
    
    return fetch(url, PUT).then(response => {
      if (!response.ok){
        return Promise.reject("Unable to mark restaurant as favorite.");
      } else {
        return response.json();
      }
    }).then(updatedRestaurant => {
      // update restaurant on idb
      DBHelper.putRestaurants(updatedRestaurant, true);
      // change state of the toggle button
      this.setAttribute('aria-pressed', !fav);
    });
  }

  // Dynamically create the favorite button element within the HTML & set all it's properties
  static favoriteButton(restaurant) {
    const button = document.createElement('button');
    button.innerHTML = `<i class="fas fa-star"></i>`;
    button.className = "fav";
    button.dataset.id = restaurant.id;
    button.setAttribute('aria-label', `Mark ${restaurant.name} as a favorite.`);
    button.setAttribute('aria-pressed', restaurant.is_favorite);
    button.onclick = DBHelper.handleClick;

    return button;
  }

  /**
   * Review Form Functions:
   *    static createReviewHTML()
   *    static resetForm()
   *    static checkData()
   *    static handleSubmit()
   *    static postNewReview()
   *    static sendDataWhenBackOnline()
   *    static createReviewFormHTML()
  */
  
  /**
/**
 * Create review HTML and add it to the webpage.
 * Exact copy of createReviewHTML that's in restaurant_info.js
 */
static createReviewHTML(review) {
  const li = document.createElement('li');

  // If network is offline, add an appropriate message
  if(!navigator.onLine) {
    const connectionStatus = document.createElement('p');
    connectionStatus.classList.add('offline_label');
    connectionStatus.innerHTML = 'Network connection is currently offline.\nReview will be uploaded when the connection is back online.';
    li.classList.add('reviews_offline');
    li.appendChild(connectionStatus);
  }

  const name = document.createElement('p');
  name.innerHTML = review.name;
  name.setAttribute("tabindex", 0);
  li.appendChild(name);

  const date = document.createElement('p');
  // Pull date from the object
  date.innerHTML = new Date(review.createdAt).toLocaleDateString();
  date.setAttribute("tabindex", 0);
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  rating.setAttribute("tabindex", 0);
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  comments.setAttribute("tabindex", 0);
  li.appendChild(comments);

  return li;
}

/**
 * Clear form data
 */
static resetForm() {
  document.getElementById('name').value = "";
  document.getElementById('rating').selectedIndex = 0;
  document.getElementById('comments').value = "";
}

/**
 * Check that all fields are filled. IF so, return the data as an object
 */
static checkData() {
  const data = {};

  // Check the name field:
  let name = document.getElementById('name');
  // If there is no data in the name field, highlight that field on the UI
  if (name.value === '') {
    name.focus();
    return;
  } else {  // Copy over the field value
    data.name = name.value;
  }

  // Check the rating field:
  const ratingDropDownMenu = document.getElementById('rating');
  const ratingValue = ratingDropDownMenu.options[ratingDropDownMenu.selectedIndex].value;
  // If there is no data in the rating field, highlight that field on the UI
  if (ratingValue == "--") {
    ratingDropDownMenu.focus();
    return;
  } else {  // Copy over the rating value
    data.rating = Number(ratingValue);
  }

  // Check the comments field/textarea:
  let comments = document.getElementById('comments');
  // If there is no data in the comments field, highlight that field on the UI
  if (comments.value === "") {
    comments.focus();
    return;
  } else {  // Copy over the comments value
    data.comments = comments.value;
  }

  // Get the restaurant's id which the review is for
  let restaurantId = document.getElementById('review-form').dataset.restaurantId;
  data.restaurant_id = Number(restaurantId);

  // Set the createdAt timesstamp
  data.createdAt = new Date().toISOString();

  return data;
}

/**
 * Function to carry out submitting the form
 */
static handleSubmit(e) {
  e.preventDefault();
  // Ensure all fields are filled and return as a review
  const review = DBHelper.checkData();
  if (!review) return;

  // Debug:
  console.log(review);

  let offline_review = {
    name: 'addReview',
    data: review,
    object_type: 'review'
  }

  // Get the HTML div that houses the reviews
  const reviewList = document.getElementById('reviews-list');
  // Create new review element that contains all the values the user entered in the form
  const newReview = DBHelper.createReviewHTML(review);
  // Append it to the reviews list
  reviewList.appendChild(newReview);

  // Reset the new reviews form
  DBHelper.resetForm();

  // If offline, handle and store the review locally
  if(!navigator.onLine && offline_review.name === 'addReview') {
    DBHelper.sendDataWhenBackOnline(offline_review);
    return;
  } else { // If online, immediately store the review in the IDB store and send it to the API via POST
    DBHelper.postNewReview(review);
  }
}

// Code was originally in handleSubmit, but has been split into the following separate function
static postNewReview(review) {
  const url = `http://localhost:1337/reviews/`;
  const POST = {
    method: 'POST',
    body: JSON.stringify(review)
  };

  //  Send the new reviews data via POST to the Sails Server
  return fetch(url, POST).then(response => {
    if (!response.ok) return Promise.reject("We couldn't post review to server.");
    return response.json();
  }).then(newNetworkReview => {
    // save new review in IDB store
    DBHelper.putReviews(newNetworkReview);
  });
}

static sendDataWhenBackOnline(offline_review) {
  console.log(`Values: ${Object.values(offline_review)}`);

  /** ==== Attempt to store values by an index, but not all are being stored properly ==== */

  // let index = localStorage.length + 1;
  // localStorage.setItem(index, JSON.stringify(offline_review.data));

  // window.addEventListener('online', (event) => {
  //   console.log(`We're back online!`);
  //   let data = JSON.parse(localStorage.getItem(index));
  //   console.log(`Time to add next offline review`);
  //   [...document.querySelectorAll(".reviews_offline")].forEach(obj => {
  //     obj.classList.remove('reviews_offline');
  //     obj.querySelector('.offline_label').remove();
  //   });
  //   console.log(`Done`);
  //   if(data !== null) {
  //     if(offline_review.name === 'addReview') {
  //       DBHelper.postNewReview(offline_review.data);
  //     }
  //     localStorage.removeItem(index);
  //   }
  // });

  const offlineReview = offline_review.data;
  // scheme for storing values in arrays in local storage given in https://stackoverflow.com/questions/40843773/localstorage-keeps-overwriting-my-data
  let revHistory = JSON.parse(localStorage.getItem('offlineReviewsStorage')) || [];

  // Push offline review onto the array:
  revHistory.push(offlineReview);
  localStorage.setItem('offlineReviewsStorage', JSON.stringify(revHistory));

  // Add an event listener for when the network is back online
  //  - When online, copy over all locally-stored offline reviews to the postNewReview function
  //     > Add to IDB store & send to Sails Server
  window.addEventListener('online', (event) => {
    console.log(event);
    console.log(`We're back online!`);
    let retrievedReviews = localStorage.getItem('offlineReviewsStorage');
    retrievedReviews = JSON.parse(retrievedReviews);

    // For each of the objects in the array:
    //  - Remove 'reviews_offline' class to clear the offline message CSS
    //  - Remove offline label message
    [...document.querySelectorAll(".reviews_offline")]
    .forEach(el => {
      el.classList.remove('reviews_offline');
      el.querySelector('.offline_label').remove();
    });

    // If there is data to be transferred, take each object in the array and add it
    if (retrievedReviews !== null && retrievedReviews.length > 0) {
      for (const retrievedReview of retrievedReviews) {
        console.log(`Adding the next offline review...`);
        DBHelper.postNewReview(retrievedReview);
      }
      // After all offline reviews have been transferred, clear the local storage
      localStorage.removeItem('offlineReviewsStorage');
    }
  });
}

/**
 * Creates and returns a form for users to add a new review. Retrieved from Alexandro Perez's walkthrough for basic skeleton
 */
static createReviewFormHTML(restaurantId) {
  const form = document.createElement('form');
  form.id = "review-form";
  form.dataset.restaurantId = restaurantId;

  let p = document.createElement('p');
  const name = document.createElement('input');
  name.id = "name"
  name.setAttribute('type', 'text');
  name.setAttribute('aria-label', 'Name field');
  name.setAttribute('placeholder', 'Enter Your Name');
  p.appendChild(name);
  form.appendChild(p);

  p = document.createElement('p');
  const selectLabel = document.createElement('label');
  selectLabel.setAttribute('for', 'rating');
  selectLabel.innerText = "Your rating: ";
  p.appendChild(selectLabel);
  const select = document.createElement('select');
  select.id = "rating";
  select.name = "rating";
  select.classList.add('rating');
  ["--", 1,2,3,4,5].forEach(number => {
    const option = document.createElement('option');
    option.value = number;
    option.innerHTML = number;
    if (number === "--") option.selected = true;
    select.appendChild(option);
  });
  p.appendChild(select);
  form.appendChild(p);

  p = document.createElement('p');
  const textarea = document.createElement('textarea');
  textarea.id = "comments";
  textarea.setAttribute('aria-label', 'comments field');
  textarea.setAttribute('placeholder', 'Enter any comments here');
  textarea.setAttribute('rows', '10');
  p.appendChild(textarea);
  form.appendChild(p);

  p = document.createElement('p');
  const addButton = document.createElement('button');
  addButton.setAttribute('type', 'submit');
  addButton.setAttribute('aria-label', 'Add Review');
  addButton.classList.add('add-review');
  addButton.innerHTML = `<i class="fas fa-plus"></i>`;
  p.appendChild(addButton);
  form.appendChild(p);

  form.onsubmit = DBHelper.handleSubmit;

  return form;
};

}

