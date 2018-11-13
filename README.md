# Mobile Web Specialist Nanodegree Program
---
#### _Three Stage Course Material Project - Restaurant Reviews_

## Project Overview: Stage 1 [DONE]

For the **Restaurant Reviews** project, I incrementally converted a static webpage to a mobile-ready web application. In **Stage One**, I took a static design that lacked accessibility and converted the design to be responsive on different sized displays and accessible for screen reader use. I also added a service worker to begin the process of creating a seamless offline experience for users.

### Specification

I was provided the code for a restaurant reviews website. The code had a lot of issues. It’s barely usable on a desktop browser, much less a mobile device. It also doesn’t include any standard accessibility features, and it doesn’t work offline at all. My job was to update the code to resolve these issues while still maintaining the included functionality. 

## Project Overview: Stage 2 [DONE]

During this stage of the **Restaurant Reviews** project, instead of relying on a static JSON file, I fetched restaurant data from a local API server that responded with JSON data. The app had to keep working offline, so I used indexedDB to cache API responses from previously seen restaurants, so they were available offline in the next visit.


### Specification

I was provided the code for a the local API server, and had to transition the project to use it instead of a static JSON file. In the previous stage of the project this static file was cached alongside other resources, but now I had to cache each JSON response given by the local API server to indexedDB.

## Project Overview: Stage 3 [DONE]

For the last Stage of the **Restaurant Reviews** project, I implemented the ability for users to mark a restaurant as a favorite, and submit new reviews for a given restaurant. This functionality was available while the application was offline, since all data was stored locally to indexedDB while awaiting for connection. By using the browser's local storage, service workers, App Cache and indexedDB I was able to create a **Restaurant Reviews** app that worked seamlessly both online and offline.

### Specification

Building from previous code, and with after being provided an improved version of the API code, that allowed new restaurant reviews to be added, and restaurants to be marked as favorites, I implemented two new features in the app: favorite restaurants, and new reviews. These features were available offline thanks to the local storage and the Service worker.

# How to Run in your local environment
1. Clone this repo
2. Clone the [Sails Server repo](https://github.com/udacity/mws-restaurant-stage-3)
3. Make sure [node.js is installed](https://nodejs.org/en/)
4. Make sure you have Python installed to run a local server
5. Run the following command in your terminal for both repos: `npm install`
6. Run `python -m http.server 8000` within the `restaurant-reviews-app` repo which will make the site accessible on `localhost:8000`
7. In the `sails-server-phase-3` repo, after the dependencies have been installed, run `node server`, and the sails-server will be accessible on `localhost:1337`

# Screenshots
## Desktop Mode
### Home Page
![image](https://user-images.githubusercontent.com/17891549/48390035-fe50a580-e6b4-11e8-9968-562023a39087.png)
### Restaurant Info Page
![image](https://user-images.githubusercontent.com/17891549/48390495-217c5480-e6b7-11e8-9278-74c4d289b88f.png)
### Adding a Review Offline
![image](https://user-images.githubusercontent.com/17891549/48390525-4b357b80-e6b7-11e8-9991-961aca74106b.png)
## Mobile Mode
### Home Page
![image](https://user-images.githubusercontent.com/17891549/48390588-b54e2080-e6b7-11e8-93ef-f8b22bc61980.png)
### Restaurant Info Page
![image](https://user-images.githubusercontent.com/17891549/48390635-e0d10b00-e6b7-11e8-9eea-aba50280a847.png)
### Adding a Review Offline
![image](https://user-images.githubusercontent.com/17891549/48390682-1970e480-e6b8-11e8-8efc-02ccf49f2b47.png)
