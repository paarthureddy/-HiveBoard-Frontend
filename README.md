+## Folder Structure
+
+The project follows a standard React/Vite frontend structure with additional directories for components, contexts, hooks, and utilities. Below is an overview of the key directories and files:
+
+```
+-HiveBoard-Frontend-main/
+├── public/                          # Static assets (e.g., robots.txt, placeholder.svg)
+├── src/
+│   ├── assets/                      # Images, icons, and croquis library
+│   │   └── Croquis Library/         # Fashion design croquis images
+│   ├── components/                  # Reusable UI components
+│   │   ├── canvas/                  # Canvas-specific components (e.g., Toolbar, ChatPanel)
+│   │   └── ui/                      # Shadcn/ui components (e.g., Button, Dialog)
+│   ├── contexts/                    # React contexts (e.g., AuthContext, GuestContext)
+│   ├── hooks/                       # Custom React hooks (e.g., useCanvas, useSocket)
+│   ├── lib/                         # Utility libraries (e.g., api.ts, socket.ts, utils.ts)
+│   ├── pages/                       # Page components (e.g., Home, Canvas, Auth)
+│   ├── test/                        # Test setup files
+│   ├── tests/                       # Unit tests for components and hooks
+│   ├── types/                       # TypeScript type definitions (e.g., auth.ts, canvas.ts)
+│   ├── App.tsx                      # Main App component
+│   ├── main.tsx                     # Entry point
+│   └── vite-env.d.ts                # Vite environment types
+├── .gitignore                       # Git ignore rules
+├── bun.lockb                        # Bun lockfile
+├── components.json                  # Shadcn/ui configuration
+├── docker-compose.yml               # Docker Compose for local development
+├── eslint.config.js                 # ESLint configuration
+├── index.html                       # HTML template
+├── package.json                     # Dependencies and scripts
+├── postcss.config.js                # PostCSS configuration
+├── tailwind.config.ts               # Tailwind CSS configuration
+├── tsconfig*.json                   # TypeScript configurations
+├── vercel.json                      # Vercel deployment configuration
+├── vite.config.ts                   # Vite configuration
+└── vitest.config.ts                 # Vitest configuration
+```
+
  ## Architecture
  
  *   **Frontend**: React (Vite) + TypeScript + Tailwind CSS
      *   Hosted on [Vercel](https://vercel.com)
@@ -42,8 +80,37 @@
      *   Mongoose (MongoDB)
      *   Passport.js (Google OAuth)
      *   JsonWebToken (JWT)
  
+## API Endpoints
+
+The frontend interacts with the backend via RESTful API endpoints. Below is a list of available endpoints grouped by category:
+
+### Authentication (`/auth`)
+- `POST /auth/login` - User login with email and password
+- `POST /auth/register` - User registration
+- `POST /auth/google/verify` - Verify Google OAuth credential
+- `GET /auth/me` - Get current user information
+
+### Meetings (`/meetings`)
+- `GET /meetings` - Get all meetings for the authenticated user
+- `GET /meetings/:id` - Get a specific meeting by ID
+- `GET /meetings/public/:id` - Get a public meeting by ID (no auth required)
+- `POST /meetings` - Create a new meeting
+- `PUT /meetings/:id` - Update an existing meeting
+- `DELETE /meetings/:id` - Delete a meeting
+
+### Invites (`/invites`)
+- `POST /invites/generate` - Generate an invite token and URL for a meeting
+- `GET /invites/:token` - Validate an invite token
+- `POST /invites/:token/join` - Join a meeting using an invite token
+- `PUT /invites/:meetingId/toggle` - Enable/disable invites for a meeting
+
+### User (`/users`)
+- `GET /users/report` - Get user activity report (total meetings, shares, strokes, time spent, member since)
+
+All endpoints require authentication via JWT token in the Authorization header, except for public meeting retrieval and invite validation/join.
+
  ## Deployment Guide
  
  ### Backend (Render)
  
@@ -66,10 +133,17 @@
  4.  **Environment Variables**:
      *   `VITE_API_URL`: URL of the deployed backend (e.g., `https://your-backend.onrender.com/api`).
      *   `VITE_GOOGLE_CLIENT_ID`: Google OAuth Client ID.
  
-## Local Development
+## Project Setup and Starting Instructions
  
+### Prerequisites
+- Node.js (v18 or higher)
+- npm or yarn
+- Git
+
+### Local Development
+
  1.  **Clone the repository**:
      ```bash
      git clone https://github.com/paarthureddy/HiveBoard.git
      cd HiveBoard
@@ -79,9 +153,33 @@
      *   Frontend: `npm install`
      *   Backend: `cd server && npm install`
  
  3.  **Setup Environment Variables**:
-    *   Create `.env` in root (frontend) and `server/.env` (backend) with keys from `.env.example` (if available) or the guide above.
+    *   Create `.env` in root (frontend) and `server/.env` (backend) with the required keys (see Credentials Required section below).
  
  4.  **Run the application**:
      *   Frontend: `npm run dev`
      *   Backend: `cd server && npm run dev`
+    *   Or run both simultaneously: `npm run dev:all`
+
+### Available Scripts
+- `npm run dev` - Start the development server
+- `npm run build` - Build for production
+- `npm run preview` - Preview the production build
+- `npm run lint` - Run ESLint
+- `npm run test` - Run tests with Vitest
+
+## Credentials Required
+
+### Frontend Environment Variables (.env)
+- `VITE_API_URL`: Base URL for the backend API (e.g., `http://localhost:5000/api` for local dev, or production URL)
+- `VITE_GOOGLE_CLIENT_ID`: Google OAuth Client ID for frontend authentication
+
+### Backend Environment Variables (server/.env)
+- `MONGODB_URI`: MongoDB connection string (e.g., from MongoDB Atlas)
+- `JWT_SECRET`: Secret key for JWT token signing (use a strong, random string)
+- `GOOGLE_CLIENT_ID`: Google OAuth Client ID
+- `GOOGLE_CLIENT_SECRET`: Google OAuth Client Secret
+- `GOOGLE_CALLBACK_URL`: OAuth callback URL (e.g., `http://localhost:5000/api/auth/google/callback` for local dev)
+- `FRONTEND_URL`: Frontend URL (e.g., `http://localhost:5173` for local dev, or production URL)
+
+Ensure these variables are set in your deployment platforms (Vercel for frontend, Render for backend) and in local `.env` files.

Link: https://hive-board.vercel.app/
