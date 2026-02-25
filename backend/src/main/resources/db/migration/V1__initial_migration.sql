CREATE SCHEMA IF NOT EXISTS movie_checker;

CREATE TYPE enum_user_roles AS ENUM ('USER', 'ADMIN');

CREATE TABLE movie_checker.users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role enum_user_roles NOT NULL DEFAULT 'USER',
    password VARCHAR(255) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT FALSE, -- (true, false) based on email verification
    join_date DATE
);

CREATE TABLE movie_checker.movie_details (
    id BIGSERIAL PRIMARY KEY,
    imdb_id VARCHAR(255) NOT NULL UNIQUE,
    title TEXT NOT NULL,
    year SMALLINT,
    poster_url TEXT,
    genre TEXT,
    type VARCHAR(255),
    overview TEXT,
    runtime VARCHAR(150),
    imdb_rate DECIMAL(2, 1)
);

-- Indexes to optimize searching

CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA movie_checker;

ALTER TABLE movie_checker.movie_details
ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (to_tsvector ('english', title || ' ' || COALESCE(overview, ''))) STORED;

CREATE INDEX idx_movie_title_prefix
ON movie_checker.movie_details (title text_pattern_ops);

CREATE INDEX idx_movie_title_trgm
ON movie_checker.movie_details USING gin (title gin_trgm_ops);

CREATE INDEX idx_movie_search_vector
ON movie_checker.movie_details USING gin (search_vector);

---

CREATE TYPE enum_watch_status AS ENUM ('WATCHED', 'WATCH_LIST');

CREATE TABLE movie_checker.user_movies (
    id BIGSERIAL PRIMARY KEY,
    user_rate DECIMAL(3, 1),
    status enum_watch_status,
    is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
    added_at DATE,
    movie_details_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,

    CONSTRAINT fk_t_user_movies_c_movie_details_id
        FOREIGN KEY (movie_details_id) REFERENCES movie_checker.movie_details(id),

    CONSTRAINT fk_t_user_movies_c_user_id
        FOREIGN KEY (user_id) REFERENCES movie_checker.users(id),

    CONSTRAINT unique_t_user_movies_c_user_id_c_movie_details_id
        UNIQUE (user_id, movie_details_id)
);

CREATE INDEX idx_t_user_movies_user_id
ON movie_checker.user_movies(user_id);

CREATE TABLE movie_checker.verification_token (
    id BIGSERIAL PRIMARY KEY,
    token VARCHAR(36) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL,
    expiration_date TIMESTAMP NOT NULL,

    CONSTRAINT fk_t_verification_token_c_user_id
        FOREIGN KEY (user_id) REFERENCES movie_checker.users(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_verification_token_user_id
ON movie_checker.verification_token(user_id);

CREATE TABLE movie_checker.reset_info_verification_code (
    id BIGSERIAL PRIMARY KEY,
    verification_code INT NOT NULL,
    user_id BIGINT NOT NULL,
    expiration_date TIMESTAMP NOT NULL,

    CONSTRAINT fk_t_reset_info_verification_code_c_user_id
        FOREIGN KEY (user_id) REFERENCES movie_checker.users(id)
        ON DELETE CASCADE
);
