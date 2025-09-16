# Habits tracker

## 📝 Description

This app is a modern, responsive habit tracking web application built with Next.js that helps users build and maintain daily habits with seamless Google Sheets synchronization.

🚀 Live Demo: https://habbits-tracker-six.vercel.app/

## ✨ Features

- Create & Track Habits - Set daily goals and track progress with one-click counters
- 30-Day History - View your habit completion trends over the past month
- Real-time Cross-Device Sync - Update habits on PC and instantly see changes on mobile (and vice versa)
- Google Sheets table - You can edit your data and plan habits in Google Sheets table
- Responsive Design - Optimized for mobile, tablet, and desktop

## 🛠️ Tech Stack

- Frontend: Next.js 14, TypeScript, Tailwind CSS
- Backend: Next.js API Routes, Google OAuth 2.0
- Storage: Local Storage + Google Sheets API
- Deployment: Vercel

## 🎯 Key Problems Solved

- You can use local storage or sync with google. It's your choice
- Token Management - The refresh token is saved. The access token is updated if necessary using Next.js route
- Data Gaps - Automatic backfilling for missed tracking days
- Google sheet safe edit - You can edit google sheet data safely: remove columns, change habits data
- Performance - Debounced syncing (500ms) to minimize API calls

## 🚀 Getting Started

1) Clone & Install
  ```
  clone https://github.com/yourusername/habits-tracker.git
  cd habits-tracker
  npm install
  ```

2) Environment Setup\
  Create .env.local:\
  GOOGLE_CLIENT_ID=your_google_client_id\
  GOOGLE_CLIENT_SECRET=your_google_client_secret

3) Setup Google services:\
  a) Create app in Google console: https://console.cloud.google.com/ \
  b) Enable Spreadsheet and Drive APIs \
  c) Create OAuth 2.0 Client \
  d) Setup Authorized JavaScript origins and Redirect urls

4) Run `npm run dev` \
  Visit http://localhost:3000

