# 🌍 Cosmic Globe Visualization

An immersive, interactive 3D globe experience built by **Team Cosmo Minds**, featuring cutting-edge web technologies to create a stunning cosmic visualization that connects the world.
## DEMO
<img width="1918" height="972" alt="image" src="https://github.com/user-attachments/assets/77afeb9a-fa18-4fc4-9475-af0901ab83f4" />

## ✨ Features

### 🌟 **Cosmic Experience**

- **Infinite Starfield** - 1000+ animated stars creating a sense of boundless space
- **Dynamic Globe Rotation** - Smooth, interactive Earth model with realistic textures
- **Atmospheric Glow** - Authentic atmospheric rendering for immersive depth

### 🌐 **Global Connectivity**

- **Interactive Location Markers** - Major cities and landmarks across all continents
- **Animated Arc Networks** - Beautiful connection lines linking global locations
- **Real-time Interactivity** - Pan, zoom, and rotate with intuitive controls

### 📱 **Responsive Design**

- **Multi-device Support** - Optimized for mobile, tablet, and desktop
- **Adaptive Scaling** - Globe size adjusts intelligently to screen dimensions
- **Touch-friendly Controls** - Seamless interaction across all devices

### 🎨 **Modern UI/UX**

- **Glassmorphism Navigation** - Contemporary backdrop-blur navigation bar
- **Smooth Animations** - Fluid transitions and micro-interactions
- **Dark Cosmic Theme** - Carefully crafted color palette for space aesthetics

## 🛠️ Tech Stack

| Technology         | Purpose                 | Version |
| ------------------ | ----------------------- | ------- |
| **React**          | Frontend Framework      | 18+     |
| **Vite**           | Build Tool & Dev Server | Latest  |
| **Three.js**       | 3D Graphics Engine      | r128    |
| **react-globe.gl** | Globe Visualization     | Latest  |
| **Tailwind CSS**   | Utility-first Styling   | 3.0+    |

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ and npm/yarn
- Modern browser with WebGL support

### Installation

```bash
# Clone the repository
git clone https://github.com/iamafridi/Cosmo-Minds-Nasa-Space-App-Challenge.git
cd Cosmo-Minds-Nasa-Space-App-Challenge

# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:5173 in your browser
```

### Build for Production

```bash
# Create optimized production build
npm run build

# Preview production build locally
npm run preview
```

## 📂 Project Architecture

```
src/
├── components/
│   ├── Alert.jsx
│   ├── Button.jsx
│   ├── GlobeComponent.jsx
│   ├── LocationModal.jsx
│   ├── StarsEffect.jsx
├── sections/
│   ├── Hero.jsx
│   └── Navbar.jsx
├── hooks/
│   └── useAlert.js
├── constants/
│   └── globeConfig.js
│   └── index.js
│   └── locationData.js
├── App.jsx
├── main.jsx
└── index.css
```

## 🎨 Customization Guide

### 🌍 **Adding New Locations**

```javascript
// In Hero.jsx, extend the locations array
const locations = [
  { name: "Your City", lat: 40.7128, lng: -74.006 },
  // Add more locations...
];
```

### 🌈 **Customizing Arc Colors**

```javascript
// Modify arc colors in the arcsData generation
arcsData.push({
  // ... other properties
  color: "#your-hex-color",
});
```

### ⭐ **Adjusting Star Density**

```javascript
// Change the number of background stars
const starCount = 1500; // Increase for more stars
```

### 🎯 **Globe Appearance**

```javascript
// Customize globe textures and atmosphere
globeImageUrl="//your-custom-earth-texture.jpg"
showAtmosphere={true}
```

## 🎮 Interactive Controls

- **Mouse Drag** - Rotate the globe
- **Mouse Wheel** - Zoom in/out
- **Touch Gestures** - Mobile-friendly pan and zoom
- **Location Clicks** - Interact with city markers

## 🌟 Team Cosmo Minds

We're a passionate team of developers creating immersive digital experiences that connect people with the cosmos and our beautiful planet Earth.

### 🤝 **Contributing**

We welcome contributions! Please feel free to submit issues and pull requests.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

**Made by Team Cosmo Minds** | _Connecting the world through cosmic visualization_
