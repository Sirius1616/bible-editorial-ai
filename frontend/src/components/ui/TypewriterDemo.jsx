import { useEffect, useRef, useState } from "react";

const DEMOS = [
  {
    verse: "John 3:16",
    type: "Study Note",
    text: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.",
  },
  {
    verse: "Psalm 23:1",
    type: "Devotional",
    text: "The Lord is my shepherd; I shall not want. This opening verse establishes God's intimate, protective care for His people, echoing through every generation.",
  },
  {
    verse: "Romans 8:28",
    type: "Reference Entry",
    text: "And we know that in all things God works for the good of those who love him, who have been called according to his purpose.",
  },
];

export function TypewriterDemo({ className }) {
  const [demoIdx, setDemoIdx] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [showCheck, setShowCheck] = useState(false);
  const [visible, setVisible] = useState(true);
  const timeoutRef = useRef(null);

  const demo = DEMOS[demoIdx];

  useEffect(() => {
    let cancelled = false;
    let charIndex = 0;

    const typeNext = () => {
      if (cancelled) return;
      if (charIndex >= demo.text.length) {
        setShowCheck(true);
        timeoutRef.current = setTimeout(() => {
          if (cancelled) return;
          setVisible(false);
          timeoutRef.current = setTimeout(() => {
            if (cancelled) return;
            setDemoIdx((i) => (i + 1) % DEMOS.length);
            setDisplayed("");
            setShowCheck(false);
            setVisible(true);
          }, 500);
        }, 2000);
        return;
      }
      const ch = demo.text[charIndex];
      charIndex++;
      setDisplayed(demo.text.slice(0, charIndex));
      const delay = ".;:!?".includes(ch)
        ? 85
        : ch === ","
          ? 55
          : ch === " "
            ? 28
            : 18;
      timeoutRef.current = setTimeout(typeNext, delay);
    };

    timeoutRef.current = setTimeout(typeNext, 450);

    return () => {
      cancelled = true;
      clearTimeout(timeoutRef.current);
    };
  }, [demoIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className={"tw-demo" + (className ? " " + className : "")}
      aria-hidden="true"
    >
      <div className="tw-stage" style={{ opacity: visible ? 1 : 0 }}>
        <div className="tw-header">
          <span className="tw-verse">{demo.verse}</span>
          <span className="tw-badge">{demo.type}</span>
        </div>
        <div className="tw-body">
          <span className="tw-text">{displayed}</span>
          {!showCheck && <span className="tw-cursor" />}
        </div>
        {showCheck && (
          <div className="tw-done">
            <span className="tw-check">&#10003;</span> Approved
          </div>
        )}
      </div>
    </div>
  );
}
