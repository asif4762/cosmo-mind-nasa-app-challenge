import { createBrowserRouter } from "react-router";
import App from "../App";
import TerraEarthGame from "../sections/TerraEarthGame";
import { element } from "three/tsl";
import Book from "../sections/Book";
import About from "../sections/About";
import  Contact  from "../sections/Contact";

export const router = createBrowserRouter([
    {
        path: '/',
        element: <App />
    },
    {
        path: '/terra-game',
        element: <TerraEarthGame />
    },
    {
        path:'/about',
        element:<About/>
    },
    {
        path:'/contact',
        element:<Contact/>
    }
])