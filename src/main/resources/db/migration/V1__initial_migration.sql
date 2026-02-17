CREATE SCHEMA IF NOT EXISTS movie_checker;

CREATE TABLE movie_checker.users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(20) NOT NULL DEFAULT 'USER',
    password VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE movie_checker.movie_details (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    poster_url TEXT,
    release_date DATE NOT NULL,
    category VARCHAR(255),
    overview TEXT,
    imdb_rate VARCHAR(100)
);

CREATE INDEX idx_movie_name ON movie_checker.movie_details (name);

CREATE TABLE movie_checker.user_movies (
    id BIGSERIAL PRIMARY KEY,
    user_rate DECIMAL(2, 1),
    status VARCHAR(100) NOT NULL, -- status of watching (WATCHED, WATCH_LIST, UNDEFINED)
    is_favorite VARCHAR(3) NOT NULL DEFAULT 'false',
    added_at DATE NOT NULL DEFAULT now(),
    movie_details_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,

    CONSTRAINT movie_details_id_fk
        FOREIGN KEY (movie_details_id) REFERENCES movie_checker.movie_details(id),

    CONSTRAINT user_id_fk
        FOREIGN KEY (user_id) REFERENCES movie_checker.users(id),

    CONSTRAINT user_id_movie_details_id_unique
        UNIQUE (user_id, movie_details_id)
);
