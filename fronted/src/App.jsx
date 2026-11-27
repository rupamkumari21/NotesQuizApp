import { useState, useRef } from "react";
import "./App.css";

import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Features from "./components/Features";

const cleanKeyPoints = (rawPoints) => {
  // Step 1: Saare strings ko jod ke ek bada text bana, fir points mein todo
  const fullText = rawPoints.join(' ');
  
  // Step 2: Text ko sentences/points mein split kar
  let points = fullText
    .split(/•|→|\n|(?<=\.)\s+(?=[A-Z])/) // Bullet, arrow, new line, ya . ke baad capital letter
    .map(point => point.trim())
    
};

function App() {
  const uploadRef = useRef(null);

  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [summary, setSummary] = useState("");
  const [quiz, setQuiz] = useState([]);
  const [keyPoints, setKeyPoints] = useState([]);
  const [loading, setLoading] = useState(false);

  const scrollToUpload = () => {
    uploadRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage("Please Select File");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("notes", file);

    try {
      const res = await fetch("http://13.10.1.168:5000/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      setMessage(data.message);
      setSummary(data.summary || "");
      setQuiz(data.quiz || []);
      setKeyPoints(data.keyPoints || []);
    } catch (err) {
      setMessage("Upload Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>

      <Navbar />

      <Hero onGetStarted={scrollToUpload} />

      <Features />

      {/* Upload Section */}

      <section
        ref={uploadRef}
        className="upload-section"
      >
        <h2>📄 Upload Notes</h2>

        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
        />

        <br />
        <br />

        <button onClick={handleUpload}>
          Upload Notes
        </button>

        <p>{message}</p>

        {loading && <p>Loading...</p>}
      </section>

      {/* Preview */}

      <section className="preview-section">

        <h2>📂 Notes Preview</h2>

        {file ? (
          <p>{file.name}</p>
        ) : (
          <p>No File Selected</p>
        )}

      </section>

      {/* Summary */}

      <section className="summary-section">

        <h2>🤖 AI Summary</h2>

        <div className="summary-box">
          {summary || "No Summary Yet"}
        </div>

      </section>

      {/* Quiz */}

      <section className="quiz-section">

        <h2>🧠 AI Quiz</h2>

        {quiz.length > 0 ? (

          quiz.map((q, index) => (

            <div key={index} className="quiz-card">

              <h3>
                {index + 1}. {q.question}
              </h3>

              {q.options.map((option, i) => (

                <p key={i}>
                  • {option}
                </p>

              ))}

              <p>

                <strong>Answer:</strong> {q.answer}

              </p>

              <hr />

            </div>

          ))

        ) : (

          <p>No Quiz Generated Yet</p>

        )}

      </section>

      {/* Key Points */}
<section className="keypoints-section">
  <h2 className="keypoints-title">
    <span className="title-icon">📌</span> Key Points
  </h2>

  {keyPoints.length > 0 ? (
    <ul className="keypoints-list">
     {keyPoints
  .map(point => point.replace(/page\s*\d+\s*of\s*\d+|\d+\s*of\s*\d+/gi, ''))
  .map(point => point.trim())
  .filter(point => point.length > 0)
  .map((point, index) => (
    <li key={index} className="keypoint-item">
      {point}
    </li>
))}
    </ul>
  ) : (
    <p className="no-points">No key points available yet.</p>
  )}
</section>

      
      {/* Download */}

      <section className="download-section">

        <button
          className="download-btn"
          onClick={() =>
            window.open(
              `http://localhost:5000/api/download?text=${encodeURIComponent(summary)}`
            )
          }
        >
          📥 Download Notes
        </button>

      </section>

      <footer>

        © 2026 Smart Notes App

      </footer>

    </div>
  );
}

export default App;