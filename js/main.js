let restaurants,
  neighborhoods,
  cuisines
var newMap
var markers = []

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  initMap(); // added 
  fetchNeighborhoods();
  fetchCuisines();
});


// Window Event Listener for when network is back online to store offline reviews
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

/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
}

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
}

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
}

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
}

/**
 * Initialize leaflet map, called from HTML.
 */
initMap = () => {
  self.newMap = L.map('map', {
        center: [40.722216, -73.987501],
        zoom: 12,
        scrollWheelZoom: false
      });
  L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
    mapboxToken: 'pk.eyJ1IjoianlhbGVua2F0aWFuIiwiYSI6ImNqbHlrYXk1cjFrNWwzcGxpcDJxN2FpYW4ifQ.OEpXoOu4xiTDz_tPWbO6aQ',
    maxZoom: 18,
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
      '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
      'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    id: 'mapbox.streets'
  }).addTo(newMap);

  updateRestaurants();
}
/* window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  updateRestaurants();
} */

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
    }
  })
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  if (self.markers) {
    self.markers.forEach(marker => marker.remove());
  }
  self.markers = [];
  self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
}

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');

  // Add Favorites Button
  const favBtn = DBHelper.favoriteButton(restaurant);
  li.append(favBtn);

  const image = document.createElement('img');
  image.className = 'restaurant-img';
  // image.src = DBHelper.imageUrlForRestaurant(restaurant);

  const imgurlbase = DBHelper.imageUrlForRestaurant(restaurant, 'tiles');
  const imgparts = imgurlbase.split('.');
  const imgurl1x = imgparts[0] + '_1x.' + imgparts[1];
  const imgurl2x = imgparts[0] + '_2x.' + imgparts[1];
  image.src = imgurl1x;
  image.srcset = `${imgurl1x} 300w, ${imgurl2x} 600w`;
  image.alt = restaurant.name + ' retaurant promotional image';

  // image.setAttribute("aria-labelledby", "restaurant-image-label");
  li.append(image);

  const name = document.createElement('h2');
  name.innerHTML = restaurant.name;
  name.setAttribute("tabindex", 0);
  li.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  neighborhood.setAttribute("tabindex", 0);
  li.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  li.append(address);

  const more = document.createElement('button');
  more.innerHTML = 'View Details';
  more.onclick = function() {
    const url = DBHelper.urlForRestaurant(restaurant);
    window.location = url;
  };
  // const moreLink = document.createElement('a');
  // moreLink.href = DBHelper.urlForRestaurant(restaurant);
  // moreLink.innerHTML = 'View Details';
  // more.append(moreLink);
  li.append(more);

  return li;
}

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.newMap);
    marker.on("click", onClick);
    function onClick() {
      window.location.href = marker.options.url;
    }
    self.markers.push(marker);
  });

} 
/* addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url
    });
    self.markers.push(marker);
  });
} */

