/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from "react";

function App() {
  const [image, setImage] = useState(null);
  const [step, setStep] = useState("upload");
  const [result, setResult] = useState(null);
  const [studentAnswer, setStudentAnswer] = useState("");
  const [finalAdvice, setFinalAdvice] = useState(null);

  const [chatMessages, setChatMessages] = useState([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");

  const [loading, setLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);

  // Extract JSON safely
  function extractJSON(text) {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? match[0] : null;
  }

  // ⭐ GLOBAL ENTER KEY HANDLER
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Enter") {
        // Shift+Enter → Do nothing (new line)
        if (e.shiftKey) return;

        e.preventDefault();

        if (chatOpen) {
          sendChatMessage();
        } else if (step === "upload" && !loading) {
          uploadMarksheet();
        } else if (step === "ask-student" && !loading) {
          sendStudentAnswer();
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [chatOpen, chatInput, step, studentAnswer, image, loading]);

  // Upload marksheet → AI analysis
  const uploadMarksheet = async () => {
    if (!image) {
      alert("Please upload your marksheet!");
      return;
    }

    setLoading(true);

    const form = new FormData();
    form.append("image", image);

    const res = await fetch("http://127.0.0.1:8000/analyze-marksheet", {
      method: "POST",
      body: form,
    });

    const json = await res.json();
    const clean = extractJSON(json.result);
    setResult(JSON.parse(clean));

    setLoading(false);
    setStep("ask-student");
  };

  // Student concentration complaint → AI reply
  const sendStudentAnswer = async () => {
    if (!studentAnswer.trim()) return;

    setLoading(true);

    const res = await fetch("http://127.0.0.1:8000/student-response", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ complaint: studentAnswer }),
    });

    const json = await res.json();
    const clean = extractJSON(json.result);
    setFinalAdvice(JSON.parse(clean));

    setLoading(false);
    setStep("final");
  };

  // Open chatbot popup + load first message
  const openChat = () => {
    setChatOpen(true);
    if (chatMessages.length === 0) {
      setChatMessages([
        { sender: "ai", text: "Hi da💛, Eppdi irukka?" },
      ]);
    }
  };

  // Send chat message
  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;

    const userMsg = { sender: "you", text: chatInput };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true); // ⭐ show typing

    const res = await fetch("http://127.0.0.1:8000/chatbot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userMsg.text }),
    });

    const data = await res.json();
    const aiMsg = { sender: "ai", text: data.reply };

    setChatMessages((prev) => [...prev, aiMsg]);
    setChatLoading(false); // stop typing
  };

  return (
    <div className="min-h-screen bg-[#DFF3FF] p-8 flex justify-center items-center">

      {/* CHATBOT POPUP */}
      {chatOpen && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <div className="bg-white w-110 p-5 rounded-2xl shadow-lg border border-gray-300">

            {/* HEADER */}
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-xl font-bold text-yellow-600">💬 AI Friend</h2>
              <button onClick={() => setChatOpen(false)} className="text-red-500 text-lg font-bold">
                ✖
              </button>
            </div>

            {/* MESSAGES */}
            <div className="h-110 overflow-y-auto bg-[#FFFCE2] p-3 rounded-xl border border-gray-300 space-y-3">
              {chatMessages.map((msg, i) => (
                <div key={i} className={msg.sender === "you" ? "text-right" : "text-left"}>
                  <span className={msg.sender === "you"
                    ? "inline-block bg-blue-200 px-3 py-2 rounded-xl"
                    : "inline-block bg-yellow-200 px-3 py-2 rounded-xl"}
                  >
                    {msg.text}
                  </span>
                </div>
              ))}

              {/* ⭐ CHATBOT TYPING INDICATOR */}
              {chatLoading && (
                <div className="text-left">
                  <span className="inline-block bg-yellow-100 px-3 py-2 rounded-xl text-sm">
                    typing…
                  </span>
                </div>
              )}
            </div>

            {/* INPUT */}
            <div className="mt-3 flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="grow p-2 border border-yellow-400 rounded-xl"
                placeholder="Type here sweetie..."
              />
              <button
                onClick={sendChatMessage}
                className="bg-yellow-400 px-4 py-2 rounded-xl font-bold hover:bg-yellow-500"
              >
                ➤
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CARD */}
      <div className="max-w-3xl w-full bg-white shadow-xl rounded-3xl p-8 border border-gray-200">

        {/* CHAT BUTTON */}
        <div className="flex justify-end mb-3">
          <button
            onClick={openChat}
            className="px-5 py-2 bg-yellow-300 hover:bg-yellow-400 text-gray-800 rounded-xl shadow-md font-semibold transition"
          >
            💬 Chat with AI Friend
          </button>
        </div>

        {/* STEP 1 — UPLOAD */}
        {step === "upload" && (
          <>
            <h1 className="text-4xl font-bold text-blue-700 text-center mb-4">
              📘 Student Performance Analyzer
            </h1>

            <p className="text-gray-700 text-center mb-6 text-lg">
              Upload your marksheet 
            </p>

            <input
              type="file"
              accept="image/*,.pdf"
              className="w-full p-3 bg-blue-50 rounded-xl border border-blue-300 mb-6"
              onChange={(e) => setImage(e.target.files[0])}
            />

            <button
              onClick={uploadMarksheet}
              className="w-full py-3 bg-yellow-300 hover:bg-yellow-400 font-semibold rounded-xl shadow"
            >
              {loading ? "Analyzing..." : "Analyze Marksheet"}
            </button>
          </>
        )}

        {/* STEP 2 — ASK STUDENT  */}
        {step === "ask-student" && (
          <>
            <h2 className="text-3xl font-bold text-blue-700 mb-4 text-center">
              🌟 Your Performance Summary
            </h2>

            <div className="bg-blue-50 p-6 rounded-xl border border-blue-300">
              <h3 className="font-bold text-green-700 text-xl">✔ Strong Subjects</h3>
              <ul className="list-disc ml-6 mt-2 text-gray-800 space-y-1">
                {result.strengths.length > 0
                  ? result.strengths.map((s, i) => <li key={i}>{s}</li>)
                  : <p>No strong subjects yet sweetie 💙</p>}
              </ul>

              <h3 className="font-bold text-red-600 mt-6 text-xl">⚠ Weak Areas</h3>
              <ul className="list-disc ml-6 mt-2 text-gray-800">
                {result.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
              </ul>

              <h3 className="font-bold text-blue-600 mt-6 text-xl">📘 Study Plan</h3>
              <ul className="list-disc ml-6 mt-2 text-gray-800">
                {result.study_plan.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>

            <h3 className="text-lg font-semibold text-blue-700 mt-4">
              💭 What is distracting you?
            </h3>

            <textarea
              className="w-full p-4 rounded-xl bg-yellow-50 border border-yellow-400 mt-2 resize-none"
              placeholder="Tell me what your distractions are..."
              rows={4}
              onChange={(e) => setStudentAnswer(e.target.value)}
            />

            <button
              onClick={sendStudentAnswer}
              className="w-full py-3 mt-4 bg-yellow-300 hover:bg-yellow-400 font-semibold rounded-xl"
            >
              {loading ? "Submitting..." : "Submit"}
            </button>
          </>
        )}

        {/* STEP 3 — FINAL GUIDANCE */}
        {step === "final" && (
          <>
            <h2 className="text-3xl font-bold text-green-700 text-center mb-6">
              🌼 Personalized Guidance
            </h2>

            <div className="bg-yellow-50 p-6 rounded-xl border border-yellow-400">
              <h3 className="text-blue-700 font-bold text-xl">🧠 Understanding You</h3>
              <p className="text-gray-800 mt-2 whitespace-pre-line">{finalAdvice.analysis}</p>

              <h3 className="text-red-600 font-bold text-xl mt-5">💡 Advice</h3>
              <p className="text-gray-800 whitespace-pre-line">{finalAdvice.advice}</p>

              <h3 className="text-blue-600 font-bold text-xl mt-5">✔ Good Habits</h3>
              <ul className="ml-6 mt-2 space-y-1 text-gray-800">
                {finalAdvice.habits?.map((h, i) => <li key={i}> {h}</li>)}
              </ul>

              <h3 className="text-green-700 font-bold text-xl mt-5">🌈 Motivation</h3>
              <p className="text-gray-900 font-semibold whitespace-pre-line">
                {finalAdvice.motivation}
              </p>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

export default App;
