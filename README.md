# Transitly

Platform komunitas untuk berbagi informasi, tips, dan diskusi seputar transportasi di Indonesia.

## 🚀 Tech Stack

### Frontend
- **React 18+** dengan TypeScript
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Routing
- **Zustand** - State management
- **React Query** - Server state management
- **Axios** - HTTP client
- **React Hook Form** - Form handling
- **React Hot Toast** - Notifications

### Backend
- **Next.js 14+** - API Routes
- **Prisma ORM** - Database ORM
- **PostgreSQL** (Supabase) - Database
- **JWT** (Jose) - Authentication
- **Bcrypt** - Password hashing
- **Zod** - Validation

## 📁 Struktur Project

```
Transitly/
├── frontend/           # React Frontend (Port 5173)
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── lib/
│   │   ├── store/
│   │   └── types/
│   └── package.json
│
├── backend/            # Next.js Backend (Port 3000)
│   ├── src/
│   │   ├── app/api/   # API Routes
│   │   └── lib/       # Utilities
│   ├── prisma/
│   │   └── schema.prisma
│   └── package.json
│
└── README.md
```

## 🛠️ Setup Development

### Prerequisites
- Node.js 18+
- npm atau pnpm
- PostgreSQL database (atau Supabase account)

### 1. Clone Repository
```bash
git clone https://github.com/Biyu-aja/Transitly.git
cd Transitly
```

### 2. Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Setup environment variables
# Copy .env dan sesuaikan dengan database Anda
# DATABASE_URL="postgresql://user:password@host:port/database"

# Generate Prisma Client
npx prisma generate

# Run migrations (setelah setup database)
npx prisma migrate dev --name init

# Run backend development server
npm run dev
```

Backend akan running di `http://localhost:3000`

### 3. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run frontend development server
npm run dev
```

Frontend akan running di `http://localhost:5173`

## 🗄️ Database Setup

### Option 1: Local PostgreSQL
1. Install PostgreSQL
2. Buat database baru: `CREATE DATABASE transitly;`
3. Update `DATABASE_URL` di `backend/.env`

### Option 2: Supabase (Recommended)
1. Buat project di [supabase.com](https://supabase.com)
2. Copy connection string dari Settings > Database
3. Update `DATABASE_URL` di `backend/.env`
4. Update `NEXT_PUBLIC_SUPABASE_URL` dan `SUPABASE_SERVICE_KEY`

## 📝 API Endpoints

### Authentication
- `POST /api/auth/register` - Register user baru
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires auth)

### Posts (Coming Soon)
- `GET /api/posts` - Get all posts
- `POST /api/posts` - Create post
- `GET /api/posts/[id]` - Get post detail
- `PUT /api/posts/[id]` - Update post
- `DELETE /api/posts/[id]` - Delete post

### Comments (Coming Soon)
- `POST /api/comments` - Create comment
- `PUT /api/comments/[id]` - Update comment
- `DELETE /api/comments/[id]` - Delete comment

## 🎯 Features

### ✅ Implemented
- [x] User authentication (register, login)
- [x] **Google OAuth** - Login dengan akun Google
- [x] Protected routes
- [x] Basic UI components
- [x] Responsive design
- [x] Database schema (with OAuth support)

### 🚧 In Progress
- [ ] Post management (CRUD)
- [ ] Comment system
- [ ] Upvote/downvote
- [ ] User profile
- [ ] Search & filter

### 📅 Planned
- [ ] Real-time chat
- [ ] Notifications
- [ ] Image upload
- [ ] Location-based posts
- [ ] Route planning
- [ ] Mobile responsive optimization

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 🚀 Deployment

### Backend (Vercel)
```bash
cd backend
vercel
```

### Frontend (Vercel)
```bash
cd frontend
vercel
```

## � Additional Documentation

- **[SETUP.md](SETUP.md)** - Detailed setup guide
- **[GOOGLE_OAUTH_SETUP.md](GOOGLE_OAUTH_SETUP.md)** - Google OAuth configuration guide

## �📄 License

MIT License

## 👥 Contributors

- Your Name (@Biyu-aja)

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first.
