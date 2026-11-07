/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Admin from './pages/Admin';
import AdminCharacters from './pages/AdminCharacters';
import AdminTemplates from './pages/AdminTemplates';
import Collection from './pages/Collection';
import CountryMap from './pages/CountryMap';
import Explore from './pages/Explore';
import Friends from './pages/Friends';
import GuildDetail from './pages/GuildDetail';
import Guilds from './pages/Guilds';
import Home from './pages/Home';
import Leaderboard from './pages/Leaderboard';
import Onboarding from './pages/Onboarding';
import TestScenarios from './pages/TestScenarios';
import Trade from './pages/Trade';
import TrophyRoom from './pages/TrophyRoom';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Admin": Admin,
    "AdminCharacters": AdminCharacters,
    "AdminTemplates": AdminTemplates,
    "Collection": Collection,
    "CountryMap": CountryMap,
    "Explore": Explore,
    "Friends": Friends,
    "GuildDetail": GuildDetail,
    "Guilds": Guilds,
    "Home": Home,
    "Leaderboard": Leaderboard,
    "Onboarding": Onboarding,
    "TestScenarios": TestScenarios,
    "Trade": Trade,
    "TrophyRoom": TrophyRoom,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};