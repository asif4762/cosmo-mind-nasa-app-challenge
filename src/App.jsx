import Hero from './sections/Hero.jsx';
import Navbar from './sections/Navbar.jsx';

const App = () => {
  return (
    <div className="relative w-full h-screen">
      <Navbar />
      <Hero />
    </div>
  );
};

export default App;