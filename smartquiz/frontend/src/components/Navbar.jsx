import React from "react";
import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="p-4 bg-blue-600 text-white flex justify-between">
      <Link to="/">SmartQuiz AI</Link>
      <div>
        <Link className="mr-4" to="/admin">Admin</Link>
        <Link to="/">Student</Link>
      </div>
    </nav>
  );
}
