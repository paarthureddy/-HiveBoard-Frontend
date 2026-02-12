# 🐝 HiveBoard Frontend

Frontend for HiveBoard – a collaborative whiteboard and meeting platform.

🌐 Live App: https://hive-board.vercel.app/

---

# 🚀 Tech Stack

- React (Vite)
- TypeScript
- Tailwind CSS
- Shadcn UI
- JWT Authentication
- Google OAuth

---

# 📁 Project Structure

```
-HiveBoard-Frontend/
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── canvas/
│   │   └── ui/
│   ├── contexts/
│   ├── hooks/
│   ├── lib/
│   ├── pages/
│   ├── tests/
│   ├── types/
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
├── index.html
├── package.json
├── tailwind.config.ts
├── vite.config.ts
└── vitest.config.ts
```

---

# 🔧 Environment Variables

Create a `.env` file in the root directory:

```
VITE_GOOGLE_CLIENT_ID=767957186138-4t7th40ckqjplcs5gabf7gre42r7vhf3.apps.googleusercontent.com
VITE_API_URL=http://localhost:5000/api
```

### Variable Explanation

- `VITE_GOOGLE_CLIENT_ID` → Google OAuth client ID for frontend login
- `VITE_API_URL` → Backend API base URL

For production (Vercel), set these in the Vercel environment settings.

---

# 💻 Local Setup

### 1️⃣ Clone Repository

```bash
git clone https://github.com/paarthureddy/-HiveBoard-Frontend.git
cd -HiveBoard-Frontend
```

### 2️⃣ Install Dependencies

```bash
npm install
```

### 3️⃣ Run Development Server

```bash
npm run dev
```

App runs on:

```
http://localhost:5173
```

---

# 🧪 Testing

Run tests using:

```bash
npm run test
```

---

# 🚀 Deployment

Hosted on **Vercel**.

Steps:
1. Connect GitHub repo to Vercel
2. Add environment variables
3. Deploy

---

# 🔗 Backend Repository

Backend code is available at:

👉 https://github.com/paarthureddy/HiveBoard-Backend

---

# 📄 License

Educational Project
