const stackItems = [
  { name: "Transcenlutions", status: "Active" },
  { name: "Tay", status: "Ready" },
  { name: "Conversation", status: "Active" },
  { name: "Actions", status: "Ready" },
  { name: "Passive income focus", status: "Primary" },
  { name: "Review", status: "Protected" },
  { name: "More capabilities", status: "Later" },
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
