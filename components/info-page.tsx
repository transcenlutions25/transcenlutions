interface InfoPageSection {
  heading: string;
  body: string;
}

interface InfoPageProps {
  eyebrow: string;
  title: string;
  intro: string;
  sections: InfoPageSection[];
}

export function InfoPage({ eyebrow, title, intro, sections }: InfoPageProps) {
  return (
    <main className="info-shell">
      <a className="info-back" href="/">
        Back to Tay command room
      </a>
      <article className="info-panel">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="info-intro">{intro}</p>
        <div className="info-review">
          <strong>Founder review needed</strong>
          <p>
            This is honest starter copy for launch preparation. It is not legal
            advice and must be reviewed before public launch or live payments.
          </p>
        </div>
        <div className="info-section-grid">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2>{section.heading}</h2>
              <p>{section.body}</p>
            </section>
          ))}
        </div>
      </article>
    </main>
  );
}
