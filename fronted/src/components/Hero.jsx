function Hero({ onGetStarted }) {
  return (
    <section className="hero">
      <h1>AI Notes Summarizer & Quiz Generator</h1>

      <p>
        Upload your PDF notes, generate AI-powered summaries,
        extract key points, and practice with automatically
        generated quizzes.
      </p>

      <button onClick={onGetStarted}>
        Get Started
      </button>
    </section>
  );
}

export default Hero;