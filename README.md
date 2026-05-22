# UPI Savings Money Bank – Goal-Based Digital Savings Platform

## 📌 Project Overview

UPI Savings Money Bank is a full-stack web application that simulates a Unified Payments Interface (UPI) system integrated with goal-based savings management. The system allows users to securely register using email OTP verification, create savings goals, add money using a UPI-style payment interface, and track their progress through a dashboard.

This project demonstrates full-stack web development, secure authentication, database management, and email notification integration.

---

## 🚀 Features

### 👤 User Authentication

* User registration with email OTP verification
* Secure login using email or username
* Password hashing using bcrypt
* Session-based authentication
* Logout functionality

### 🎯 Savings Goal Management

* Create multiple savings goals
* Set target amount for each goal
* Automatically track saved amount
* View goal progress on dashboard

### 💳 UPI-Style Payment Simulation

* Select savings goal
* Enter payment amount
* Choose payment method (UPI/Card simulation)
* Automatic savings update

### 📧 Email Notifications

* OTP verification email
* Welcome email after signup
* Payment confirmation email
* Savings update notifications

### 📊 Dashboard

* View all savings goals
* Track savings progress
* Quick actions for adding goals and payments

### 🛠 Admin Module (Optional)

* View users
* Monitor transactions

---

## 🏗 System Architecture

Frontend:

* HTML5
* CSS3
* JavaScript

Backend:

* Node.js
* Express.js

Database:

* PostgreSQL

Email Service:

* Nodemailer

Authentication:

* Express Session
* bcrypt password hashing

---

## 📂 Project Structure

```
UPI-Savings-Money-Bank/
│
├── server/
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── paymentController.js
│   │   └── adminController.js
│   │
│   ├── utils/
│   │   ├── emailService.js
│   │   ├── otpService.js
│   │
│   ├── db.js
│   └── routes.js
│
├── views/
│   ├── index.html
│   ├── login.html
│   ├── signup.html
│   ├── dashboard.html
│   ├── payment.html
│   └── otp.html
│
├── public/
│   ├── css/
│   ├── js/
│   └── uploads/
│
├── server.js
├── package.json
├── database.sql
├── .env.example
└── README.md
```

---

## ⚙ Installation and Setup

### 1️⃣ Install Node.js

Download from:
https://nodejs.org

---

### 2️⃣ Install PostgreSQL

Download from:
https://www.postgresql.org

Create database:

```
upi_savings
```

---

### 3️⃣ Clone or Download Project

```
git clone https://github.com/yourusername/upi-savings-money-bank.git
```

or extract ZIP.

---

### 4️⃣ Install dependencies

```
npm install
```

---

### 5️⃣ Configure Environment Variables

Create file:

```
.env
```

Example:

```
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_NAME=upi_savings
DB_PORT=5432

MAIL_USER=yourgmail@gmail.com
MAIL_PASS=your_app_password

SESSION_SECRET=upi_secret_key
PORT=3000
```

---

### 6️⃣ Create Database Tables

Open PostgreSQL and run:

```
database.sql
```

---

### 7️⃣ Start Server

```
node server.js
```

---

### 8️⃣ Open Browser

```
http://localhost:3000
```

---

## 🧪 Testing Flow

1. Signup with email
2. Verify OTP
3. Login
4. Create savings goal
5. Add money
6. Check dashboard
7. Check email notification

---

## 🔒 Security Features

* Password hashing using bcrypt
* Session authentication
* OTP verification
* Environment variable protection
* Input validation

---

## 📸 Screenshots

Include screenshots in:

```
/screenshots
```

Dashboard
Payment page
Signup page

---

## 📚 Technologies Used

| Technology      | Purpose           |
| --------------- | ----------------- |
| Node.js         | Backend runtime   |
| Express.js      | Web framework     |
| PostgreSQL      | Database          |
| HTML/CSS/JS     | Frontend          |
| Nodemailer      | Email service     |
| bcrypt          | Password security |
| Express-Session | Authentication    |

---

## 🎓 Academic Purpose

This project was developed as a Final Year Engineering Project to demonstrate:

* Full-stack web development
* Secure authentication
* Database integration
* Financial application design

---

## 👨‍💻 Authors

Deepak Pranesh V
Hari Hara Sudan S A
Madhan Raj R
Madhesh R S

Department of Artificial Intelligence and Data Science

---

## 📄 License

This project is for educational and research purposes.
