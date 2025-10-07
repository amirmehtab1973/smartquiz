import React, { useState } from "react";

export default function AdminLogin() {
  const [username, setU] = useState("");
  const [password, setP] = useState("");
  const [msg, setMsg] = useState("");

  const handleLogin = async () => {
    const res = await fetch("/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (data.token) {
      localStorage.setItem("token", data.token);
      window.location.href = "/admin/upload";
    } else {
      setMsg("Invalid credentials");
    }
  };

  return (
    <div className="flex flex-col items-center mt-20">
      <h1 className="text-2xl mb-4">Admin Login</h1>
      <input
        className="border p-2 mb-2"
        placeholder="Username"
        value={username}
        onChange={(e) => setU(e.target.value)}
      />
      <input
        type="password"
        className="border p-2 mb-2"
        placeholder="Password"
        value={password}
        onChange={(e) => setP(e.target.value)}
      />
      <button
        onClick={handleLogin}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Login
      </button>
      <p className="text-red-500 mt-2">{msg}</p>
    </div>
  );
}
