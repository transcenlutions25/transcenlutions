const stackItems = [
  { name: "Transcenlutions", status: "Foundation" },
  { name: "Tay Core", status: "Box 1" },
  { name: "Chat System", status: "Box 1" },
  { name: "Action Engine", status: "Box 1" },
  { name: "Governance Placeholder", status: "Locked Until Foundation Is Stable" },
  { name: "Supporting Agents Coming Later", status: "Coming Later" },
];

export function SystemStack() {
  return (
    <aside className="panel system-stack">
      <p className="eyebrow">System Stack</p>
      <h2>Small foundation panel</h2>
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
