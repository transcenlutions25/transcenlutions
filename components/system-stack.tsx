const stackItems = [
  { name: "Transcenlutions", status: "Active" },
  { name: "Tay Core", status: "Ready" },
  { name: "Chat System", status: "Active" },
  { name: "Action Engine", status: "Ready" },
  { name: "Passive income focus", status: "Primary" },
  { name: "Review Layer", status: "Protected" },
  { name: "Future helpers", status: "Later" },
];

export function SystemStack() {
  return (
    <aside className="panel system-stack">
      <p className="eyebrow">Workspace</p>
      <h2>What is active</h2>
      <ul>
        {stackItems.map((item) => (
          <li key={item.name}>
            <span>{item.name}</span>
            <em>{item.status}</em>
          </li>
        ))}
      </ul>
    </aside>
  );
}
