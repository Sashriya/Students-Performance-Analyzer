import React, { useState } from "react";

// --------------------------------------------------------------
// JSON → Beautiful Formatted UI Component
// --------------------------------------------------------------
const RenderJSON = ({ data }) => {
  if (!data || typeof data !== "object") return null;

  return (
    <div className="space-y-6 mt-5">

      {/* Subjects */}
      {data.subjects_detected && (
        <div className="bg-white shadow p-5 rounded-xl border">
          <h3 className="font-bold text-xl text-blue-700 mb-3">📚 Subjects Detected</h3>
          <div className="flex flex-wrap gap-2">
            {data.subjects_detected.map((s, i) => (
              <span
                key={i}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Analysis */}
      {data.analysis && (
        <div className="bg-white shadow p-5 rounded-xl border">
          <h3 className="font-bold text-xl text-purple-700 mb-2">🧠 Analysis</h3>
          <p className="text-gray-700 leading-relaxed">{data.analysis}</p>
        </div>
      )}

      {/* Fix */}
      {data.fix && (
        <div className="bg-white shadow p-5 rounded-xl border">
          <h3 className="font-bold text-xl text-red-700 mb-2">🔧 Fix / Explanation</h3>
          <p className="text-gray-700 leading-relaxed">{data.fix}</p>
        </div>
      )}

      {/* Habits */}
      {data.habits && data.habits.length > 0 && (
        <div className="bg-white shadow p-5 rounded-xl border">
          <h3 className="font-bold text-xl text-green-700 mb-2">🌿 Suggested Habits</h3>
          <ul className="list-disc ml-5 space-y-2">
            {data.habits.map((h, i) => (
              <li key={i} className="text-gray-700">{h}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Motivation */}
      {data.motivation && (
        <div className="bg-white shadow p-5 rounded-xl border">
          <h3 className="font-bold text-xl text-yellow-600 mb-2">✨ Motivation</h3>
          <p className="text-gray-700">{data.motivation}</p>
        </div>
      )}
    </div>
  );
};

// --------------------------------------------------------------
// MAIN APP COMPONENT
// --------------------------------------------------------------
export default function App() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [step, setStep] = useState("upload");

  const [reason, setReason] = useState("");
  const [finalAdvice, setFinalAdvice] = useState(null);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]);

  // Extract JSON from AI messy text
  const extract = (text) => {
    try {
      const m = text.match(/\{[\s\S]*\}/);
      return m ? m[0] : "{}";
    } catch {
      return "{}";
    }
  };

  // -------------------------
  // Upload & Analyze Marksheet
  // -------------------------
  const analyzeMarks = async () => {
    if (!file) return alert("Upload a file!");

    setLoading(true);

    const form = new FormData();
    form.append("image", file);

    const res = await fetch("http://127.0.0.1:8000/analyze-marksheet", {
      method: "POST",
      body: form,
    });

    const data = await res.json();
    const pure = extract(data.result);
    setResult(JSON.parse(pure));

    setStep("result");
    setLoading(false);
  };

  // -------------------------
  // Student Reason → Advice
  // -------------------------
  const analyzeReason = async () => {
    if (!reason.trim()) return alert("Type your reason!");

    setLoading(true);

    const res = await fetch("http://127.0.0.1:8000/student-reason", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });

    const data = await res.json();
    const pure = extract(data.result);
    setFinalAdvice(JSON.parse(pure));

    setStep("advice");
    setLoading(false);
  };

  // -------------------------
  // Chatbot
  // -------------------------
  const sendChat = async () => {
    if (!chatInput.trim()) return;

    setChatMessages((p) => [...p, { me: true, text: chatInput }]);

    const res = await fetch("http://127.0.0.1:8000/chatbot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: chatInput }),
    });

    const data = await res.json();
    setChatMessages((p) => [...p, { me: false, text: data.reply }]);
    setChatInput("");
  };

  // --------------------------------------------------------------
  // UI
  // --------------------------------------------------------------
  return (
    <div className="min-h-screen bg-linear-to-br from-[#d9eafd] to-[#fefefe] p-8 flex items-center justify-center">

      {/* Floating Chat Button */}
      <button
        onClick={() => setChatOpen(true)}
        className="fixed top-6 right-6 bg-yellow-400 px-5 py-3 rounded-full shadow-md font-semibold"
      >
        💬 Chat With AI Friend
      </button>

      {/* Chat Popup */}
      {chatOpen && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <div className="bg-white rounded-2xl w-96 p-5 shadow-xl">
            <div className="flex justify-between mb-4">
              <h2 className="font-bold text-blue-600 text-lg">💛 AI Friend</h2>
              <button onClick={() => setChatOpen(false)}>❌</button>
            </div>

            <div className="h-72 overflow-y-auto bg-gray-100 p-3 rounded-xl">
              {chatMessages.map((m, i) => (
                <p key={i} className={`my-2 ${m.me ? "text-right" : "text-left"}`}>
                  <span
                    className={`px-3 py-2 rounded-xl inline-block ${
                      m.me ? "bg-blue-300" : "bg-yellow-300"
                    }`}
                  >
                    {m.text}
                  </span>
                </p>
              ))}
            </div>

            <div className="flex gap-2 mt-4">
              <input
                className="grow p-2 border rounded-xl"
                placeholder="Type..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
              />
              <button className="bg-blue-500 px-4 text-white rounded-xl" onClick={sendChat}>
                ➤
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Card */}
      <div className="w-full max-w-3xl p-10 bg-white/70 backdrop-blur-lg rounded-3xl shadow-xl border border-white">

        {/* Step 1: Upload */}
        {step === "upload" && (
          <div>
            <h1 className="text-4xl font-extrabold text-blue-700 text-center mb-8">
              📘 AI Student assistant
            </h1>

            <div className="border border-blue-300 p-4 rounded-xl bg-blue-50">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setFile(e.target.files[0])}
              />
            </div>

            <button
              onClick={analyzeMarks}
              className="mt-6 w-full bg-yellow-400 hover:bg-yellow-500 p-4 rounded-xl text-lg font-bold shadow-md"
            >
              {loading ? "Analyzing..." : "Analyze Marksheet"}
            </button>
          </div>
        )}

        {/* Step 2: Result */}
        {step === "result" && (
          <div>
            <h2 className="text-3xl font-bold text-blue-700 mb-4">📄 Analysis Result</h2>

            <RenderJSON data={result} />

            <textarea
              className="mt-6 w-full p-4 border rounded-xl"
              placeholder="Why do you think you're not focusing?"
              onChange={(e) => setReason(e.target.value)}
            />

            <button
              onClick={analyzeReason}
              className="mt-4 w-full bg-yellow-400 p-4 rounded-xl text-lg font-bold"
            >
              Continue →
            </button>
          </div>
        )}

        {/* Step 3: Final Advice */}
        {step === "advice" && (
          <div>
            <h2 className="text-3xl font-bold text-green-600 mb-4">🌟 Personalized Guidance</h2>

            <RenderJSON data={finalAdvice} />
          </div>
        )}

      </div>
    </div>
  );
}
