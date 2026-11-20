"use client";

import { useId, useState } from "react";

/** Short on purpose (Miller's law / Hick's law): six common jobs, or type your own. */
export const TOPICS = ["An AI receptionist", "Appointment booking", "Lead follow-up", "Invoicing", "CRM updates", "Review requests"];

/**
 * Combobox (WAI-ARIA 1.2 pattern): a text field with a suggestion list.
 * Type to filter, ↑ ↓ to move, Enter to pick, Escape to close. Free text is
 * accepted too (Postel's law). The list only appears once the field is in use
 * (progressive disclosure). The answer becomes the email subject.
 */
export function TopicCombobox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const id = useId();
  const listId = `${id}-list`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const q = value.trim().toLowerCase();
  const options = TOPICS.filter((t) => t.toLowerCase().includes(q));
  const shown = open && options.length > 0;

  const choose = (t: string) => {
    onChange(t);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && shown && active >= 0) {
      e.preventDefault();
      choose(options[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  };

  return (
    <div className="relative w-full max-w-md">
      <label htmlFor={id} className="font-label text-flag">
        // What should run on its own?
      </label>
      <input
        id={id}
        data-combobox
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={shown}
        aria-controls={listId}
        aria-activedescendant={shown && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        value={value}
        placeholder="Type or pick a task"
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        className="mt-3 block w-full border-b border-beige/50 bg-transparent py-3 text-lead text-beige placeholder:text-flag focus:border-beige"
      />
      <ul id={listId} role="listbox" aria-label="Suggested tasks" hidden={!shown} className="absolute top-full left-0 z-30 mt-2 w-full border border-slate-line bg-slate">
        {options.map((t, i) => (
          <li
            key={t}
            id={`${listId}-${i}`}
            role="option"
            aria-selected={i === active}
            data-cursor
            // keep focus in the field so the click lands before the list closes
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => choose(t)}
            className={`px-4 py-3 ${i === active ? "bg-slate-line text-beige" : "text-flag hover:bg-slate-line/60"}`}
          >
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}
