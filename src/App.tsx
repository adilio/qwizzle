import { appTitle } from "./brand";
import acronyms from "./data/acronyms.json";

export default function App() {
  return (
    <div className="app">
      <header className="app__header">
        <div className="title">
          <h1>
            <img src="/favicon.svg" alt="" className="title__logo" />
            {appTitle()}
          </h1>
          <p>A Wordle-inspired quiz engine</p>
        </div>
      </header>
      <section className="grid" aria-label="Guess grid placeholder">
        {Array.from({ length: 6 }, (_, row) => (
          <div key={row} className="grid__row">
            {Array.from({ length: 5 }, (_, col) => (
              <div key={col} className="t" />
            ))}
          </div>
        ))}
      </section>
      <footer className="footer">
        <div>{acronyms.length} acronyms loaded — game coming in P1.</div>
      </footer>
    </div>
  );
}
