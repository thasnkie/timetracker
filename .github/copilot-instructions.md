# TimeTracker Project - GitHub Copilot Instructions

## Project Overview

This is a React TimeTracker web app with Firebase integration, designed with a mobile-first approach for Android and iOS users. The app provides simple Time In/Time Out functionality for tracking work hours.

## Technology Stack

- **Frontend**: React 18 with Vite
- **Database**: Firebase Firestore
- **Styling**: Mobile-first CSS3 with responsive design
- **Build Tool**: Vite for development and production builds

## Key Features

- Mobile-optimized Time In/Time Out buttons
- Real-time Firebase data storage
- Daily work time calculation
- Today's activity vs. All-time activity toggle
- Paginated all-time history with date grouping
- Daily work time summaries for each day
- Activity history display with session durations
- Touch-friendly interface
- Progressive Web App capabilities
- Google Authentication with admin access control

## Development Guidelines

- Maintain mobile-first design principles
- Ensure accessibility standards are met
- Use modern React patterns (hooks, functional components)
- Follow Firebase best practices for Firestore operations
- Optimize for touch interfaces and mobile performance

## Project Structure

- `/src/firebase/` - Firebase configuration and time tracking services
- `/src/App.jsx` - Main application component
- `/src/App.css` - Mobile-first component styles
- `/src/index.css` - Global mobile optimizations

## Setup Requirements

1. Firebase project with Firestore enabled
2. Environment variables for Firebase configuration
3. Node.js 14+ for development

## Deployment Notes

- App is optimized for mobile browsers
- Can be installed as PWA on mobile devices
- Requires active Firebase project for data storage
