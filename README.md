# ShopSphere

ShopSphere is a full-stack e-commerce project built with React, TypeScript, Tailwind CSS, Node.js, and Express.

## Project Scope

This repository provides the initial project architecture and development foundation for future e-commerce features.

## Tech Stack

* Frontend: React, TypeScript, Vite, Tailwind CSS
* Backend: Node.js and Express
* Middleware: CORS and dotenv
* Development: Nodemon
* Version Control: Git and GitHub

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

* Node.js and npm
* Git
* Visual Studio Code or another code editor

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

Create local environment files from the supplied templates when needed.

* Frontend: `client/.env.example`
* Backend: `server/.env.example`

Never commit actual secrets or credentials.

## Development Workflow

Create a task-specific branch, implement the changes, run the relevant checks, and submit a focused commit.
See [CONTRIBUTING.md](CONTRIBUTING.md) for branch and commit conventions.
