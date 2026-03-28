# 🚀 MERN Dashboard App

A full-stack **MERN** (MongoDB, Express, React, Node.js) web application featuring JWT-based authentication, protected routes, and a premium data-rich dashboard.

---

## ✨ Features

- 🔐 **JWT Authentication** — Secure login & registration with token-based auth
- 🛡️ **Protected Routes** — Dashboard is only accessible to authenticated users
- 💾 **MongoDB Integration** — All user, lead, and task data stored in MongoDB Atlas
- 🧪 **Form Validation** — Client-side validation with descriptive error messages
- 📊 **Live Dashboard** — Displays Leads, Tasks, and Team Members from the database
- 🔄 **Session Persistence** — Stay logged in on page refresh via `localStorage`
- 👆 **Pointer Cursors** — Finger cursor on all interactive elements
- 📱 **Responsive Design** — Works across desktop and mobile screens

---

## 🗂️ Project Structure

```
Assignment/
├── backend/               # Node.js + Express server
│   ├── middleware/
│   │   └── auth.js        # JWT verification middleware
│   ├── models/
│   │   ├── User.js        # User mongoose model
│   │   ├── Lead.js        # Lead mongoose model
│   │   └── Task.js        # Task mongoose model
│   ├── routes/
│   │   ├── auth.js        # /api/auth/login & /api/auth/register
│   │   └── dashboard.js   # /api/dashboard (protected)
│   ├── .env               # Environment variables
│   ├── seed.js            # Database seeder script
│   └── server.js          # Express app entry point
│
└── frontend/              # React + Vite + Tailwind CSS
    ├── src/
    │   ├── components/
    │   │   ├── Navbar.jsx        # Top navigation bar
    │   │   └── ProtectedRoute.jsx# Route access guard
    │   ├── context/
    │   │   └── AuthContext.jsx   # Global auth state
    │   ├── pages/
    │   │   ├── Login.jsx         # Login page
    │   │   ├── Register.jsx      # Registration page
    │   │   └── Dashboard.jsx     # Protected dashboard
    │   ├── App.jsx               # App router
    │   ├── main.jsx              # React entry point
    │   └── index.css             # Global styles (Tailwind)
    ├── index.html
    ├── package.json
    ├── tailwind.config.js
    ├── postcss.config.js
    └── vite.config.js
```

---

## ⚙️ Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account (free tier works)
- `npm` (comes with Node.js)

---

## 🛠️ Setup Instructions

### 1. Clone or navigate to the project

```bash
cd Assignment
```

### 2. Configure the Backend

Navigate to the `backend` folder and set up your environment variables:

```bash
cd backend
```

Open `.env` and fill in your values:

```env
PORT=5000
MONGO_URI=your_mongodb_atlas_connection_string_here
JWT_SECRET=your_strong_random_secret_here
NODE_ENV=development
```

> **Tip:** To get your `MONGO_URI`, go to [MongoDB Atlas](https://cloud.mongodb.com/) → Connect → Drivers → Copy the connection string.

### 3. Install Backend Dependencies

```bash
cd backend
npm install
```

### 4. Seed the Database

Populate MongoDB with initial Users, Leads, and Tasks:

```bash
node seed.js
```

You should see:
```
✅ 3 Users seeded (admin@example.com / password123)
✅ 9 Leads seeded
✅ 9 Tasks seeded
🚀 Database Seeded Successfully!
```

### 5. Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

---

## ▶️ Running the Application

You need **two terminals** running simultaneously.

### Terminal 1 — Backend Server

```bash
cd backend
node server.js
```

Expected output:
```
Server running on port 5000
MongoDB connected
```

Or use `nodemon` for auto-restart on file changes:

```bash
npm install -g nodemon
nodemon server.js
```

### Terminal 2 — Frontend Dev Server

```bash
cd frontend
npm run dev
```

Expected output:
```
  VITE v5.x.x  ready in xxx ms
  ➜  Local:   http://localhost:5173/
```

---

## 🌐 Accessing the App

- **Frontend URL:** [http://localhost:5173](http://localhost:5173)
- **Backend API URL:** [http://localhost:5000](http://localhost:5000)

> The Vite dev server proxies all `/api/*` requests to the backend automatically.

---

## 🔑 Default Login Credentials

After running `node seed.js`:

| Field    | Value                   |
|----------|-------------------------|
| Email    | `admin@example.com`     |
| Password | `password123`           |

You can also register a new account at [http://localhost:5173/register](http://localhost:5173/register).

---

## 📡 API Endpoints

| Method | Endpoint               | Access    | Description              |
|--------|------------------------|-----------|--------------------------|
| POST   | `/api/auth/login`      | Public    | Login and get JWT token  |
| POST   | `/api/auth/register`   | Public    | Register a new user      |
| GET    | `/api/dashboard`       | Protected | Get dashboard data       |

> Protected routes require `Authorization: Bearer <token>` header.

---

## 🔒 Authentication Flow

1. User logs in → Backend validates credentials → Returns JWT token
2. Frontend stores token in `localStorage`
3. React Router guards the `/dashboard` route via `ProtectedRoute`
4. All API calls to protected endpoints include `Authorization: Bearer <token>`
5. Logout clears `localStorage` and redirects to `/login`

---

## 🧹 Troubleshooting

| Issue | Solution |
|---|---|
| `MongoDB connection error` | Check that your `MONGO_URI` is correct in `.env` and your IP is whitelisted in MongoDB Atlas Network Access |
| `Dashboard not loading` | Clear `localStorage` in the browser console: `localStorage.clear(); location.reload();` then re-login |
| `@tailwind` VS Code warnings | These are harmless editor warnings. The app runs fine — Tailwind is processed by PostCSS, not VS Code |
| Port 5000 or 5173 already in use | Kill the process using the port or change `PORT` in `.env` |

---

## 🛠️ Tech Stack

| Layer      | Technology            |
|------------|-----------------------|
| Frontend   | React 18 + Vite       |
| Styles     | Tailwind CSS 3        |
| Routing    | React Router v6       |
| HTTP       | Axios                 |
| Icons      | Lucide React          |
| Backend    | Node.js + Express     |
| Database   | MongoDB + Mongoose    |
| Auth       | JWT + bcryptjs        |

---

## 📄 License

This project is for educational and assignment purposes.
