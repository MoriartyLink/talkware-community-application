import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import React, { useState } from "react";
import LandingPage from "./pages/LandingPage";
import EventDetailPage from "./pages/EventDetailPage";
import SplashScreen from "./components/SplashScreen";
import { AnimatePresence, motion } from "motion/react";

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <Router>
      <AnimatePresence mode="wait">
        {showSplash ? (
          <SplashScreen key="splash" onFinish={() => setShowSplash(false)} />
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          >
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/event/:id" element={<EventDetailPage />} />
            </Routes>
          </motion.div>
        )}
      </AnimatePresence>
    </Router>
  );
}
