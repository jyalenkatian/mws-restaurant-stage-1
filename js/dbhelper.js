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
    
    // TODO: use Background Sync to sync data with API server
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
   *    static clearForm()
   *    static validateAndGetData()
   *    static handleSubmit()
   *    static reviewForm()
  */
  
  /**
/**
 * Create review HTML and add it to the webpage.
 * Exact copy of createReviewHTML that's in restaurant_info.js
 */
static createReviewHTML(review) {
  const li = document.createElement('li');
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
static clearForm() {
  // clear form data
  document.getElementById('name').value = "";
  document.getElementById('rating').selectedIndex = 0;
  document.getElementById('comments').value = "";
}

/**
 * Make sure all form fields have a value and return data in
 * an object, so is ready for a POST request.
 */
static validateAndGetData() {
  const data = {};

  // get name
  let name = document.getElementById('name');
  // If there is no data in the name field, highlight that field on the UI
  if (name.value === '') {
    name.focus();
    return;
  }
  data.name = name.value;

  // get rating
  const ratingSelect = document.getElementById('rating');
  const rating = ratingSelect.options[ratingSelect.selectedIndex].value;
  // If there is no data in the rating field, highlight that field on the UI
  if (rating == "--") {
    ratingSelect.focus();
    return;
  }
  data.rating = Number(rating);

  // get comments
  let comments = document.getElementById('comments');
  // If there is no data in the comments field, highlight that field on the UI
  if (comments.value === "") {
    comments.focus();
    return;
  }
  data.comments = comments.value;

  // get restaurant_id
  let restaurantId = document.getElementById('review-form').dataset.restaurantId;
  data.restaurant_id = Number(restaurantId);

  // set createdAT
  data.createdAt = new Date().toISOString();

  return data;
}

/**
 * Handle submit. 
 */
static handleSubmit(e) {
  e.preventDefault();
  // Ensure all fields are filled and return as a review
  const review = DBHelper.validateAndGetData();
  if (!review) return;

  console.log(review);

  const url = `http://localhost:1337/reviews/`;
  const POST = {
    method: 'POST',
    body: JSON.stringify(review)
  };

  // TODO: use Background Sync to sync data with API server
  return fetch(url, POST).then(response => {
    if (!response.ok) return Promise.reject("We couldn't post review to server.");
    return response.json();
  }).then(newNetworkReview => {
    // save new review on idb
    DBHelper.putReviews(newNetworkReview);
    // post new review on page
    const reviewList = document.getElementById('reviews-list');
    const review = DBHelper.createReviewHTML(newNetworkReview);
    reviewList.appendChild(review);
    // clear the form
    DBHelper.clearForm();
  });

}

/**
 * Returns a form element for adding new reviews.
 */
static reviewForm(restaurantId) {
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

