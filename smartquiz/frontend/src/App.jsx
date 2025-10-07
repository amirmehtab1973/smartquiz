import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AdminLogin from "./pages/AdminLogin";
import AdminUpload from "./pages/AdminUpload";
import QuizPage from "./pages/QuizPage";
import ResultPage from "./pages/ResultPage";
import Navbar from "./components/Navbar";

const App = () => (
  <BrowserRouter>
    <Navbar />
    <Routes>
      <Route path="/" element={<QuizPage />} />
      <Route path="/admin" element={<AdminLogin />} />
      <Route path="/admin/upload" element={<AdminUpload />} />
      <Route path="/result" element={<ResultPage />} />
    </Routes>
  </BrowserRouter>
);

createRoot(document.getElementById("root")).render(<App />);
