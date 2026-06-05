# ⬡ InternHub — Internship Application Management Platform

A full-stack web application that allows companies to post internship opportunities and applicants to browse and apply — without needing a dedicated recruitment website.

**Built with:** HTML • CSS • JavaScript • Python Flask • MongoDB Atlas

---

## 🌐 Live Demo

**Deployed on Render:**
https://internhub-76nv.onrender.com

---

## 📌 What is InternHub?

Many startups, small companies, and agencies offer internship opportunities but often lack the resources to build a complete recruitment portal.

**InternHub** provides a centralized internship management platform where:

* Companies can register, post internship roles, manage applicants, and update application statuses.
* Applicants can register, browse internships, apply for opportunities, and track application progress in real time.
* No subscription fees are required.
* Companies get an instant professional internship recruitment portal.

---

## ✨ Features

### 🏢 For Companies

* Register company accounts
* Add company details (name, industry, location, website)
* Post internship opportunities
* View applicants for each role
* Update application status:

  * Pending
  * Shortlisted
  * Selected
  * Rejected
* Delete internship roles
* Search and sort posted roles

### 👨‍🎓 For Applicants

* Register applicant accounts
* Browse all available internship opportunities
* Search internships by keyword
* Filter internships by domain
* Sort roles by newest or deadline
* Apply using:

  * Skills
  * Phone Number
  * College Name
  * Resume Summary
* Prevent duplicate applications
* Track application status in real time

### ⚙️ Platform Features

* JWT-based Authentication
* 7-Day Session Expiry
* bcrypt Password Hashing
* Role-Based Access Control
* XSS Protection
* Responsive Design
* Server Offline Detection
* Real-Time Application Tracking

---

## 🗂️ Project Structure

InternHub/
│
├── frontend/
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── company-dashboard.html
│   ├── post-role.html
│   ├── applicant-dashboard.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── app.js
│
├── backend/
│   ├── app.py
│   ├── wsgi.py
│   ├── config.py
│   ├── requirements.txt
│   └── routes/
│       ├── __init__.py
│       ├── auth.py
│       ├── roles.py
│       └── applications.py
│
└── README.md


---

## 🛠️ Technology Stack

### Frontend

* HTML5
* CSS3
* JavaScript (ES6)

### Backend

* Python
* Flask
* Flask-CORS

### Database

* MongoDB Atlas
* PyMongo

### Authentication & Security

* JWT (JSON Web Tokens)
* bcrypt Password Hashing

### Deployment

* Render
* MongoDB Atlas


## 🛡️ Security Features

### Password Security

* Passwords are never stored in plain text.
* Passwords are hashed using bcrypt with random salt.

### Authentication

* JWT-based authentication
* Tokens expire after 7 days
* Secure route protection

### Authorization

* Role-based access control
* Companies cannot access applicant routes
* Applicants cannot access company routes

### Data Protection

* XSS Prevention
* Input Validation
* Duplicate Application Prevention
* Object-Level Authorization

---

## 📈 Future Enhancements

* Resume PDF Upload
* Email Notifications
* Interview Scheduling
* Applicant Profile Management
* Company Verification System
* Analytics Dashboard
* Mobile Application

---

## 🎓 Learning Outcomes

This project helped me gain practical experience in:

* Frontend Development
* Backend Development with Flask
* REST API Design
* MongoDB Database Integration
* Authentication & Security
* Cloud Deployment
* Full Stack Web Development

---

## 👤 Author

**Parth Harnol**
VS Software Lab – 6 Week Internship
Academic Year: 2026–2027

---

## 📄 License

This project was developed as part of an internship program.

Feel free to use, modify, and deploy it for educational and personal learning purposes.
