import { redirect } from "next/navigation";

export const metadata = {
  title: "Transcenlutions Arcade",
  description: "Four original games by Transcenlutions: Crown Grid, Prism Sort, Orbit Link, and Lumen Run.",
};

export default function ArcadePage() {
  redirect("/arcade/index.html");
}
