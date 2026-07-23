import { useState } from "react";
import { SkillList } from "../components/SkillList.jsx";
import { CVUpload } from "../components/CVUpload.jsx";
import { BackLink } from "../components/ui/BackLink.jsx";

export default function Profile() {
  const [skillsVersion, setSkillsVersion] = useState(0);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <BackLink />

      <div className="grid gap-4 md:grid-cols-2">
        <SkillList refreshKey={skillsVersion} />
        <CVUpload onSkillsAdded={() => setSkillsVersion((v) => v + 1)} />
      </div>
    </main>
  );
}
