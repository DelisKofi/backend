# Retail Pro Backend

Retail Pro Backend is a robust, modular, and type-safe API service built for retail management. It provides a comprehensive suite of tools for managing multiple branches, inventory, transactions, customers, and more.

## 🚀 Features

- **Multi-Branch Support**: Manage inventory and sales across multiple retail locations.
- **Inventory Management**: Track products, SKUs, categories, and low-stock thresholds.
- **Transaction Processing**: Handle retail and wholesale transactions with real-time stock updates.
- **User Invitations**: Secure invitation-based user registration system.
- **Role-Based Access Control (RBAC)**: Fine-grained permissions for different user roles.
- **Audit Logging**: Immutable logs for tracking all critical system actions.
- **Expense & Damage Tracking**: Log store expenses and product damages for accurate reporting.
- **Media Management**: Support for product images and presigned URLs.
- **Offline Sync**: Built-in support for pulling and pushing data for offline-capable clients.
- **API Documentation**: Integrated Swagger/OpenAPI documentation.

## 🛠️ Technology Stack

- **Runtime**: Node.js (v24+)
- **Framework**: Express.js (v5+)
- **Language**: TypeScript (v6+)
- **Database**: MongoDB with Mongoose (v9+)
- **Validation**: Zod (v4+)
- **Authentication**: JWT & Bcrypt
- **Documentation**: Swagger UI & JSDoc

## 📦 Getting Started

### Prerequisites

- Node.js (v24 or higher recommended)
- MongoDB (local or Atlas)

### Installation

1. Clone the repository:
   ```bash
   git clone git@github.com-williyem:williyem/retail-pro-backend.git
   cd retail-pro-backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and configure your environment variables:
   ```env
   MONGO_URI=your_mongodb_connection_string
   PORT=8000
   JWT_SECRET=your_secure_jwt_secret
   JWT_EXPIRES_IN=1d
   ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
   ```

### Running the Application

- **Development Mode**:
  ```bash
  npm run dev
  ```
  The server will start on `http://localhost:8000` (or your configured port).

## 📖 API Documentation

Once the server is running, you can access the interactive Swagger documentation at:
`http://localhost:8000/api-docs`

## 🏗️ Project Structure

The project follows a modular architecture for better maintainability:

```text
src/
├── config/             # Configuration files (DB, Env, Swagger)
├── errors/             # Custom error classes
├── middlewares/        # Express middlewares (Auth, Validation, Errors)
├── modules/            # Domain-specific modules
│   ├── auth/           # Login, Invitation acceptance
│   ├── branches/       # Branch management
│   ├── products/       # Inventory and stock
│   ├── transactions/   # Sales and orders
│   └── ...             # Other modules (Users, Roles, etc.)
├── utils/              # Helper utilities and shared types
└── index.ts            # Entry point
```

## 🔒 Security

- **JWT Authentication**: Protected routes require a valid Bearer token.
- **Input Validation**: All request bodies are strictly validated using Zod schemas.
- **Password Hashing**: Secure password storage using Bcrypt.
- **Role Enforcement**: Middleware-based permission checks.

## 🤝 Contributing

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Distributed under the ISC License.
