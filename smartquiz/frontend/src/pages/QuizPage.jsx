import React, { useEffect, useState } from "react";

export default function QuizPage() {
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [email, setEmail] = useState("");
  const [score, setScore] = useState(null);

  useEffect(() => {
    const quizId = new URLSearchParams(window.location.search).get("id");
    if (quizId) {
      fetch(`/quiz/${quizId}`)
        .then((res) => res.json())
        .then(setQuiz);
    }
  }, []);

  const submitQuiz = async () => {
    const quizId = new URLSearchParams(window.location.search).get("id");
    const res = await fetch(`/quiz/${quizId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers, email }),
    });
    const data = await res.json();
    setScore(data.score);
  };

  if (!quiz) return <div className="text-center mt-10">Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl mb-4">{quiz.title}</h1>
      {quiz.questions.map((q, i) => (
        <div key={i} className="mb-6 border p-4 rounded bg-white shadow">
          <p className="font-semibold mb-2">{q.question}</p>
          {q.options.map((opt, j) => (
            <label key={j} className="block">
              <input
                type="radio"
                name={`q${i}`}
                value={opt}
                onChange={(e) => {
                  const newAns = [...answers];
                  newAns[i] = e.target.value;
                  setAnswers(newAns);
                }}
              />
              <span className="ml-2">{opt}</span>
            </label>
          ))}
        </div>
      ))}
      <input
        className="border p-2 mb-4 w-full"
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button
        onClick={submitQuiz}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Submit Quiz
      </button>

      {score !== null && (
        <p className="text-green-600 mt-4">
          Your score: {score}/{quiz.questions.length}
        </p>
      )}
    </div>
  );
}
