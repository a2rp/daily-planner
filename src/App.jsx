import { useEffect, useState } from "react";
import DailyPlanner from "./components/dailyPlanner/index.jsx";
import BackToTop from "./components/backToTop/index.jsx";
import SiteFooter from "./components/siteFooter/index.jsx";
import SiteHeader from "./components/siteHeader/index.jsx";
import styles from "./App.module.css";
const App = () => {
 const [showBackToTop, setShowBackToTop] = useState(false);
 useEffect(() => { const update = () => setShowBackToTop(window.scrollY > 50); window.addEventListener("scroll", update, { passive: true }); update(); return () => window.removeEventListener("scroll", update); }, []);
 return <div className={styles.appShell} id="top"><SiteHeader title="Daily Planner" mark="D" repoUrl="https://github.com/a2rp/daily-planner" navItems={[["Today","#today"],["Notes","#notes"]]} /><main className={styles.pageContent}><DailyPlanner /></main><SiteFooter repoUrl="https://github.com/a2rp/daily-planner" /><BackToTop visible={showBackToTop} /></div>;
};
export default App;