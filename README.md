⬡ InternHub — Internship Application Management Platform
A full-stack web application that lets any company post internship roles and applicants browse and apply — without needing a dedicated recruitment website.
Built with HTML · CSS · JavaScript · Python Flask · MongoDB Atlas

🌐 Live Demo

Deployed on Render: https://internhub-76nv.onrender.com


📌 What is InternHub?
Many small companies, startups, and agencies offer internship positions but cannot afford to build a full recruitment website. InternHub solves that.

Companies register, post internship roles, review applicants, and update their status
Applicants register, browse all open roles from all companies, apply, and track their application status in real time
No subscription fees — completely free to use and self-host
No extra website needed — companies get a professional application portal instantly


✨ Features
For Companies

Register with company name, industry, location, and website
Post internship roles with title, domain, location, duration, stipend, skills, and description
View all applicants for each posted role
Change applicant status: Pending → Shortlisted → Selected / Rejected
Delete roles (automatically removes all related applications)
Search and sort posted roles

For Applicants

Register with name and email
Browse all open internship roles from all registered companies
Search by keyword, filter by domain, sort by newest or deadline
Apply to roles with skills, phone number, college, and resume summary
Cannot apply to the same role twice
Track all submitted applications with live status updates

Platform

JWT-based authentication with 7-day token expiry
bcrypt password hashing — passwords never stored as plain text
Role-based access control — companies and applicants have separate dashboards
XSS prevention on all user-generated content
Fully responsive UI — works on mobile, tablet, and desktop
Server offline detection with helpful error messages


🗂️ Project Structure
InternHub/
│
├── frontend/                        ← All HTML, CSS, JS files
│   ├── index.html                   ← Landing page (public)
│   ├── login.html                   ← Login page for both roles
│   ├── register.html                ← Registration page
│   ├── company-dashboard.html       ← Company control panel
│   ├── post-role.html               ← Post a new internship role
│   ├── applicant-dashboard.html     ← Applicant control panel
│   ├── css/
│   │   └── style.css                ← Complete stylesheet (617 lines)
│   └── js/
│       └── app.js                   ← All frontend logic (830 lines)
│
├── backend/                         ← Python Flask server
│   ├── app.py                       ← Main Flask application
│   ├── wsgi.py                      ← Gunicorn entry point (production)
│   ├── config.py                    ← MongoDB connection and config
│   ├── requirements.txt             ← Python dependencies
│   └── routes/
│       ├── __init__.py              ← Makes routes a Python package
│       ├── auth.py                  ← Register, Login, Company Slots
│       ├── roles.py                 ← Post, List, Delete roles
│       └── applications.py         ← Submit, View, Update status
│
└── README.md

Technology Stack

Frontend

* HTML5
* CSS3
* JavaScript (ES6)

Backend

* Python
* Flask
* Flask-CORS

Database

* MongoDB Atlas
* PyMongo

Authentication & Security

* JWT (JSON Web Tokens)
* bcrypt Password Hashing

Deployment

* Render
* MongoDB Atlas


Future Enhancements

* Resume PDF Upload
* Email Notifications
* Interview Scheduling
* Applicant Profile Management
* Company Verification System
* Analytics Dashboard
* Mobile Application

Learning Outcomes

Through this project, I gained practical experience in:

* Frontend Development
* Backend Development using Flask
* REST API Design
* MongoDB Database Integration
* Authentication and Security
* Deployment and Cloud Hosting
* Full Stack Web Development

🛡️ Security Features

Passwords — never stored as plain text, hashed with bcrypt using a random salt
Authentication — JWT tokens signed with SECRET_KEY, expire after 7 days
Route protection — every protected endpoint verifies the JWT before processing
Role-based access — companies cannot access applicant routes and vice versa
Object-level authorization — companies can only see/modify their own roles and applicants
XSS prevention — all user input is sanitized before being inserted into the DOM
Input validation — validated on both frontend (JavaScript) and backend (Python)
Duplicate prevention — compound unique index prevents double applications at database level


👤 Author
Parth Harnol
VS Software Lab — 6-Week Internship
Academic Year: 2026–2027

📄 License
This project was built as part of an internship program.
Free to use, modify, and deploy for educational and personal purposes.
