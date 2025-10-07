import React, { useState } from "react";

export default function AdminUpload() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");

  const uploadQuiz = async () => {
    const token = localStorage.getItem("token");
    if(!token){ setMessage("Please login as admin"); return; }
    const form = new FormData();
    form.append("file", file);

    const res = await fetch("/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const data = await res.json();
    setMessage(data.message || data.error);
  };

  return (
    <div className="flex flex-col items-center mt-20">
      <h1 className="text-2xl mb-4">Upload Quiz Document</h1>
      <input
        type="file"
        className="mb-4"
        onChange={(e) => setFile(e.target.files[0])}
      />
      <button
        onClick={uploadQuiz}
        className="bg-green-600 text-white px-4 py-2 rounded"
      >
        Upload
      </button>
      <p className="mt-4 text-blue-500">{message}</p>
    </div>
  );
}
