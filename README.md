# ShopSphere

ShopSphere is a full-stack e-commerce project built with React, TypeScript, Tailwind CSS, Node.js, and Express.

## Project Scope

This repository provides the initial project architecture and development foundation for future e-commerce features.

## Tech Stack

*Frontend: React, TypeScript, Vite, Tailwind CSS
*Backend: Node.js and Express
*Middleware: CORS and dotenv
*Development: Nodemon
*Version Control: Git and GitHub

## Project Structure

```text
shopsphere/
├── client/       # React frontend
├── server/       # Express backend
├── README.md
├── CONTRIBUTING.md
└── .gitignore
```

## Prerequisites

*Node.js and npm
*Git
*Visual Studio Code or another code editor

## Frontend Setup

```bash
cd client
npm install
npm run dev
```

The Vite development server normally runs at http://localhost:5173.

## Backend Setup

```bash
cd server
npm install
npm run dev
```

The backend uses port 5000 by default.

## API Health Check

Open http://localhost:5000/health to check the backend health endpoint.


## Environment Variables

ShopSphere uses environment variables to configure the frontend and backend securely.

### Backend Variables

Create a `server/.env` file using `server/.env.example` as a template.

| Variable      | Required | Default       | Description                                                      |
| ------------- | -------- | ------------- | ---------------------------------------------------------------- |
| `PORT`        | No       | `5000`        | Port used by the backend server.                                 |
| `MONGODB_URI` | Yes      | None          | MongoDB connection string.                                       |
| `NODE_ENV`    | No       | `development` | Application environment: `development`, `production`, or `test`. |

Example configuration:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=your_mongodb_connection_string
```

Replace the MongoDB placeholder with your own connection string in the local `server/.env` file.

### Development and Production

***Development:** Set `NODE_ENV=development` for local development.
***Production:** Set `NODE_ENV=production` in the deployment environment.
***Testing:** Set `NODE_ENV=test` when running tests.

The backend validates the environment variables during startup. `MONGODB_URI` is required, and `PORT` must be between 1 and 65535.

### Security

*Never commit `server/.env` or actual database credentials.
*Keep `.env` files ignored by Git.
*Use environment variables provided by your deployment platform for production secrets.
*The `server/.env.example` file contains placeholders only.


## Development Workflow

Create a task-specific branch, implement the changes, run the relevant checks, and submit a focused commit.
See [CONTRIBUTING.md](CONTRIBUTING.md) for branch and commit conventions.
