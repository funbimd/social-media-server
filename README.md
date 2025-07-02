# Social Media Server

A RESTful API server for a social media platform, built with Node.js, Express, and PostgreSQL. It supports user authentication, posting, following, commenting, liking, and search functionalities.

## Features

- User registration, login, and JWT authentication
- Password reset via email
- Create, read, update, and delete posts
- Like and comment on posts
- Follow/unfollow users
- User profiles with followers/following lists
- Search for users and posts
- Trending topics
- Rate limiting, input validation, and security best practices

## Tech Stack

- Node.js, Express
- PostgreSQL
- JWT for authentication
- bcrypt for password hashing
- Helmet & CORS for security
- Nodemailer for email

## Getting Started

### Prerequisites

- Node.js (v16+ recommended)
- PostgreSQL

### Installation

1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd social-media-server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables (see below).
4. Set up the database:
   - Create a PostgreSQL database.
   - Run the schema in `database/schema.sql` to create tables.

### Environment Variables

Create a `.env` file in the root directory with the following:

```
PORT=5000
NODE_ENV=development
DATABASE_URL=postgres://<user>:<password>@<host>:<port>/<db>
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=30d
EMAIL_USER=your_email@example.com
EMAIL_PASS=your_email_password
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
```

## Database Schema

See [`database/schema.sql`](database/schema.sql) for full details. Main tables:

- `users`: User accounts
- `posts`: Posts by users
- `comments`: Comments on posts
- `likes`: Likes on posts
- `followers`: Follower/following relationships

## API Endpoints

### Auth

- `POST /api/auth/register` — Register a new user
- `POST /api/auth/login` — Login
- `GET /api/auth/me` — Get current user
- `POST /api/auth/forgot-password` — Request password reset
- `PUT /api/auth/reset-password/:token` — Reset password
- `PUT /api/auth/change-password` — Change password

### Posts

- `POST /api/posts` — Create post
- `GET /api/posts` — Get posts (feed)
- `GET /api/posts/feed` — Get feed posts (paginated)
- `GET /api/posts/explore` — Get explore posts (paginated)
- `GET /api/posts/:id` — Get single post
- `PUT /api/posts/:id` — Update post
- `DELETE /api/posts/:id` — Delete post
- `PUT /api/posts/:id/like` — Like/unlike post
- `POST /api/posts/:id/comments` — Add comment
- `DELETE /api/posts/:id/comments/:comment_id` — Delete comment

### Profiles

- `GET /api/profiles/:id` — Get user profile
- `PUT /api/profiles/:id/follow` — Follow/unfollow user
- `GET /api/profiles/:id/posts` — Get user's posts
- `GET /api/profiles/:id/followers` — Get user's followers
- `GET /api/profiles/:id/following` — Get user's following
- `GET /api/profiles/search` — Search users
- `GET /api/profiles/suggestions` — Suggested users

### Search

- `GET /api/search/users` — Search users
- `GET /api/search/posts` — Search posts
- `GET /api/search/trending` — Trending topics

## Usage Examples

See [`api-tests.http`](api-tests.http) for ready-to-run API request examples (compatible with VS Code REST Client extension).

## Running the Server

```bash
npm start
```

The server will run on `http://localhost:5000` by default.

## License

ISC
