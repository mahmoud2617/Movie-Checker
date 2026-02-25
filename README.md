# MovieChecker

MovieChecker is a web application that helps you find movies and manage your own collection. You can search for any movie, add it to your watchlist, or mark it as watched.

---

## Features

* **Movie Search**: Find movies and get details like year, genre, and ratings.
* **Collections**: Save movies to your "Watched" list or "Watch List".
* **Favorites**: Mark certain movies as favorites to find them easily.
* **User Accounts**: Create an account, verify your email, and manage your profile.

---

## API Documentation

### Endpoints

**Authentication & Registration**
* `POST /users` - Sign up for a new account
* `POST /auth/login` - Log in and receive JWT
* `POST /auth/logout` - Log out
* `GET /auth/verify` - Verify email using the token sent to your inbox
* `POST /auth/refresh` - Refresh the access token using a refresh token cookie
* `GET /auth/me` - Get information about the currently logged-in user

**User Profile Management**
* `GET /users/{id}` - Get detailed info for a specific user
* `PATCH /users/change-name` - Change your display name
* `PATCH /users/change-password/{id}` - Change your account password
* `DELETE /users` - Delete your account
* `PATCH /users/reset-password/request` - Request a password reset code (forgot password)
* `PATCH /users/reset-password/verify` - Verify the password reset code
* `PATCH /users/password-reset/confirm` - Set a new password after verification

**Movies & Search**
* `GET /movies` - List all movies stored in the local database
* `GET /movies/search` - Search for movies (queries local DB + OMDB API fallback)
* `GET /movies/search/suggest` - Get real-time title suggestions while typing

**Personal Collection**
* `GET /user-movies` - Get your movie collection (can filter by status or favorites)
* `PATCH /user-movies/status` - Add/Update movie status (WATCHED or WATCH_LIST)
* `PATCH /user-movies/favorite` - Toggle whether a movie is a favorite
* `PATCH /user-movies/user-rate` - Rate a movie you have watched

**Admin Actions**
* `GET /users` - List all registered users
* `PATCH /admin/users/change-role` - Change a user's role (USER to ADMIN)

---

## How it's Built

### Backend
The backend uses **Spring Boot** and **Java**. 
* **Database**: Uses PostgreSQL to store user data and movie lists.
* **Database Design**: You can see how the database is structured in this [ERD diagram](docs/ERD.png).
* **Migrations**: Uses Flyway to manage database changes automatically.

### Frontend
The frontend is built with **HTML**, **CSS**, and **JavaScript**.
* **AI Assistance**: The frontend layout and logic were created using AI tools like **Claude**, **Antigravity**, and **GitHub Copilot**.

---

## Local Setup

### Prerequisites
* Java 21
* Node.js & npm
* PostgreSQL
* OMDB API Key

### Installation

* **Backend**:
   * Open the `backend` folder.
   * Create a `.env` file (copy from `.env.example`).
   * Put your database info and your OMDB API key in the `.env.file`.
   * Run the app using `./mvnw spring-boot:run`.
* **Frontend**:
   * Open the `frontend` folder.
   * Run `npm install`.
   * Run `npm start`.
   * Open `http://localhost:3000` in your browser.

---

## Author

**Mahmoud Mohammed** <br>
**LinkedIn:** https://linkedin.com/in/mahmoud2617