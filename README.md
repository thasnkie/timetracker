# ⏰ TimeTracker

A simple, mobile-first React web app for tracking work hours with Firebase integration. Perfect for Android and iOS users who need to quickly clock in and out.

## ✨ Features

- **📱 Mobile-First Design**: Optimized for Android and iOS devices
- **🔘 Simple Interface**: Large, touch-friendly Time In/Time Out buttons
- **🔥 Firebase Integration**: Real-time data storage and synchronization
- **📊 Time Tracking**: Automatic calculation of daily work hours
- **📝 Activity History**: View today's clock-in/out entries
- **🎨 Modern UI**: Clean, responsive design with smooth animations
- **♿ Accessibility**: Built with accessibility best practices

## 🚀 Quick Start

### Prerequisites

- Node.js (version 14 or higher)
- A Firebase project with Firestore enabled

### Installation

1. **Clone or download the project**
2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Firebase:**
   - Create a Firebase project at [https://console.firebase.google.com](https://console.firebase.google.com)
   - Enable Firestore Database
   - Get your Firebase configuration from Project Settings
   - Copy `.env.example` to `.env` and fill in your Firebase config:
   ```env
   VITE_FIREBASE_API_KEY=your-api-key-here
   VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain-here
   VITE_FIREBASE_PROJECT_ID=your-project-id-here
   VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket-here
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id-here
   VITE_FIREBASE_APP_ID=your-app-id-here
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser and navigate to `http://localhost:5173`**

## 📱 Mobile Usage

- **Access on mobile**: Open the app in your mobile browser
- **Add to home screen**: Use your browser's "Add to Home Screen" option for a native app-like experience
- **Clock In**: Tap the green "Clock In" button when you start work
- **Clock Out**: Tap the red "Clock Out" button when you finish work
- **View Progress**: See your total work time and today's activity automatically

## 🏗️ Project Structure

```
src/
├── firebase/
│   ├── config.js          # Firebase configuration
│   └── timeService.js     # Time tracking Firebase operations
├── App.jsx                # Main application component
├── App.css                # Mobile-first styles
├── index.css              # Global styles and mobile optimizations
└── main.jsx               # Application entry point
```

## 🔧 Firebase Setup

### Firestore Security Rules

Add these security rules to your Firestore database:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /timeEntries/{document} {
      allow read, write: if true; // For demo purposes - customize as needed
    }
  }
}
```

### Data Structure

Time entries are stored in the `timeEntries` collection with this structure:

```javascript
{
  type: "clock-in" | "clock-out",
  timestamp: Firestore Timestamp,
  userId: "default-user", // Can be expanded for multi-user support
  createdAt: Firestore Timestamp
}
```

## 📱 Mobile Optimizations

- **Touch Targets**: All interactive elements meet the 44px minimum touch target size
- **Viewport Handling**: Proper viewport meta tags and safe area support for notched devices
- **Performance**: Optimized loading and smooth animations
- **Accessibility**: Screen reader support and proper focus management
- **PWA Ready**: Configured for Progressive Web App installation

## 🛠️ Built With

- **React 18** - Modern React with hooks
- **Vite** - Fast development and build tool
- **Firebase/Firestore** - Real-time database
- **CSS3** - Mobile-first responsive design
- **Modern JavaScript** - ES6+ features

## 🔮 Future Enhancements

- [ ] User authentication and multi-user support
- [ ] Weekly/monthly time reports
- [ ] Break time tracking
- [ ] Export data functionality
- [ ] Push notifications
- [ ] Offline support with sync

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🤝 Contributing

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 🐛 Troubleshooting

### Firebase Connection Issues
- Verify your Firebase configuration in `.env`
- Check that Firestore is enabled in your Firebase project
- Ensure your Firebase project has the correct security rules

### Mobile Display Issues
- Clear your browser cache
- Ensure you're using a modern mobile browser
- Check that the viewport meta tag is properly set

### Development Server Issues
- Run `npm install` to ensure all dependencies are installed
- Try deleting `node_modules` and `package-lock.json`, then run `npm install` again
- Ensure you're using Node.js version 14 or higher

---

**Happy time tracking! ⏰**
