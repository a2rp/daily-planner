import { useEffect, useMemo, useRef, useState } from "react";
import { FiCheck, FiClock, FiPlus, FiTrash2 } from "react-icons/fi";
import styles from "./styles.module.css";

const key = "daily-planner-items";
const notesKey = `${key}-notes`;
const getLocalDate = (value) => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};
const isoToday = getLocalDate(new Date());
const initial = [
    { id: "a", date: isoToday, time: "08:30", title: "Set the three priorities", done: true },
    { id: "b", date: isoToday, time: "10:00", title: "Draft the first project outline", done: false },
    { id: "c", date: isoToday, time: "13:30", title: "Review notes and make revisions", done: false },
    { id: "d", date: isoToday, time: "16:00", title: "Close the day and reset the desk", done: false },
];
let storageUnavailable = false;

const isDateKey = (value) => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T12:00:00`);
    return !Number.isNaN(date.getTime()) && getLocalDate(date) === value;
};

const loadItems = () => {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return initial;
        const data = JSON.parse(raw);
        if (!Array.isArray(data)) {
            storageUnavailable = true;
            return initial;
        }
        const ids = new Set();
        return data
            .filter((item) =>
                item &&
                typeof item === "object" &&
                typeof item.title === "string" &&
                isDateKey(item.date),
            )
            .map((item, index) => {
                let id = typeof item.id === "string" ? item.id : `saved-${index}`;
                while (ids.has(id)) id = `${id}-${index}`;
                ids.add(id);
                return {
                    id,
                    date: item.date,
                    time: typeof item.time === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(item.time)
                        ? item.time
                        : "09:00",
                    title: item.title.slice(0, 160),
                    done: item.done === true,
                };
            });
    } catch {
        storageUnavailable = true;
        return initial;
    }
};

const loadNotesByDate = () => {
    try {
        const raw = localStorage.getItem(notesKey);
        if (!raw) return {};
        let data;
        try {
            data = JSON.parse(raw);
        } catch {
            return { [isoToday]: raw.slice(0, 3000) };
        }
        if (typeof data === "string") return { [isoToday]: data.slice(0, 3000) };
        if (!data || typeof data !== "object" || Array.isArray(data)) {
            storageUnavailable = true;
            return {};
        }
        const datedNotes = Object.entries(data)
            .filter(([date, value]) => isDateKey(date) && typeof value === "string")
            .map(([date, value]) => [date, value.slice(0, 3000)]);
        if (!datedNotes.length && Object.keys(data).length) {
            return { [isoToday]: raw.slice(0, 3000) };
        }
        return Object.fromEntries(datedNotes);
    } catch {
        storageUnavailable = true;
        return {};
    }
};

const makeId = () =>
    globalThis.crypto?.randomUUID?.() ||
    `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const DailyPlanner = () => {
    const [items, setItems] = useState(loadItems);
    const [date, setDate] = useState(isoToday);
    const [title, setTitle] = useState("");
    const [time, setTime] = useState("09:00");
    const [notesByDate, setNotesByDate] = useState(loadNotesByDate);
    const [storageWarning, setStorageWarning] = useState(() => storageUnavailable);
    const [removing, setRemoving] = useState(null);
    const cancelRef = useRef(null);
    const dialogRef = useRef(null);
    const scheduleHeadingRef = useRef(null);
    const notes = notesByDate[date] || "";

    const persist = (storageKey, value) => {
        try {
            localStorage.setItem(storageKey, JSON.stringify(value));
        } catch {
            setStorageWarning(true);
        }
    };
    useEffect(() => {
        if (!removing) return undefined;
        const previousFocus = document.activeElement;
        const scheduleHeading = scheduleHeadingRef.current;
        cancelRef.current?.focus();
        const onKey = (event) => {
            if (event.key === "Escape") {
                event.preventDefault();
                setRemoving(null);
                return;
            }
            if (event.key !== "Tab" || !dialogRef.current) return;
            const controls = [...dialogRef.current.querySelectorAll("button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])")];
            const first = controls[0];
            const last = controls.at(-1);
            if (event.shiftKey && (document.activeElement === first || !dialogRef.current.contains(document.activeElement))) {
                event.preventDefault();
                last?.focus();
            } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current.contains(document.activeElement))) {
                event.preventDefault();
                first?.focus();
            }
        };
        const keepFocusInside = (event) => {
            if (dialogRef.current && !dialogRef.current.contains(event.target)) {
                cancelRef.current?.focus();
            }
        };
        document.addEventListener("keydown", onKey);
        document.addEventListener("focusin", keepFocusInside);
        return () => {
            document.removeEventListener("keydown", onKey);
            document.removeEventListener("focusin", keepFocusInside);
            if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
                previousFocus.focus();
            } else {
                scheduleHeading?.focus();
            }
        };
    }, [removing]);

    const todayItems = useMemo(
        () => items.filter((item) => item.date === date).sort((a, b) => a.time.localeCompare(b.time)),
        [items, date],
    );
    const done = todayItems.filter((item) => item.done).length;
    const prettyDate = new Intl.DateTimeFormat("en", {
        weekday: "long",
        month: "long",
        day: "numeric",
    }).format(new Date(`${date}T12:00:00`));

    const add = (event) => {
        event.preventDefault();
        if (!title.trim() || !time) return;
        const nextItems = [...items, {
            id: makeId(),
            date,
            time,
            title: title.trim().slice(0, 160),
            done: false,
        }];
        setItems(nextItems);
        persist(key, nextItems);
        setTitle("");
    };
    const toggleItem = (id) => {
        const nextItems = items.map((item) =>
            item.id === id ? { ...item, done: !item.done } : item,
        );
        setItems(nextItems);
        persist(key, nextItems);
    };
    const updateNotes = (event) => {
        const nextNotes = { ...notesByDate, [date]: event.target.value };
        setNotesByDate(nextNotes);
        persist(notesKey, nextNotes);
    };
    const deleteItem = () => {
        if (!removing) return;
        const nextItems = items.filter((item) => item.id !== removing.id);
        setItems(nextItems);
        persist(key, nextItems);
        setRemoving(null);
    };

    return <section className={styles.dailyPage} id="today">
        {storageWarning && <p className={styles.storageWarning} role="status" aria-live="polite">Browser storage is unavailable or invalid. Your plan will work for this page, but changes may not persist after you leave.</p>}
        <div className={styles.topline}>
            <div><p className={styles.label}>A little structure, a lot of room</p><h1>{date === isoToday ? "Make today count." : "Make this day count."}</h1></div>
            <label className={styles.datePicker}>Choose a day<input type="date" value={date} onChange={(event) => { if (event.target.value) setDate(event.target.value); }} /></label>
        </div>
        <div className={styles.summary}>
            <div><span>{date === isoToday ? "Today" : "Selected day"}</span><strong>{prettyDate}</strong></div>
            <div className={styles.progress}><span>{done} of {todayItems.length} done</span><div><i style={{ width: todayItems.length ? (done / todayItems.length * 100) + "%" : "0%" }} /></div></div>
            <p><FiClock aria-hidden="true" /> Keep a pace you can sustain</p>
        </div>
        <div className={styles.columns}>
            <section className={styles.schedule} aria-label="Daily schedule">
                <div className={styles.sectionHeading}><div><span>01</span><h2 ref={scheduleHeadingRef} tabIndex="-1">Schedule</h2></div><small>{todayItems.length} blocks</small></div>
                {todayItems.length ? <div className={styles.timeline}>{todayItems.map((item) => <article key={item.id} className={item.done ? styles.completed : ""}><time dateTime={item.time}>{item.time}</time><span className={styles.timelineDot} aria-hidden="true" /><div className={styles.task}><button className={styles.check} type="button" onClick={() => toggleItem(item.id)} aria-label={(item.done ? "Mark " : "Complete ") + item.title} aria-pressed={item.done}><FiCheck aria-hidden="true" /></button><strong>{item.title}</strong><button className={styles.remove} type="button" onClick={() => setRemoving(item)} aria-label={"Delete " + item.title}><FiTrash2 aria-hidden="true" /></button></div></article>)}</div> : <p className={styles.empty}>A clear day. Add the first block below.</p>}
                <form className={styles.addForm} onSubmit={add}><label>Time<input type="time" value={time} onChange={(event) => setTime(event.target.value)} required /></label><label>Task<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What needs your attention?" maxLength="160" required /></label><button type="submit" aria-label="Add task block"><FiPlus aria-hidden="true" /> Add block</button></form>
            </section>
            <aside className={styles.notes} id="notes"><div className={styles.sectionHeading}><div><span>02</span><h2>Working notes</h2></div><small>{storageWarning ? "Not saved" : "Autosaved"}</small></div><p>Keep a thought or reminder close while you plan.</p><textarea aria-label={`Working notes for ${prettyDate}`} maxLength="3000" value={notes} onChange={updateNotes} placeholder="A note for this day..." /><div className={styles.noteFooter}><i />{storageWarning ? "May not persist after you leave this page" : "Stored in this browser for this date"}</div></aside>
        </div>
        {removing && <div className={styles.modal}><section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="remove-title" aria-describedby="remove-text"><FiTrash2 aria-hidden="true" /><h2 id="remove-title">Remove this block?</h2><p id="remove-text"><strong>{removing.title}</strong> will be deleted from the day plan.</p><div><button ref={cancelRef} type="button" onClick={() => setRemoving(null)}>Keep block</button><button type="button" onClick={deleteItem}>Delete block</button></div></section></div>}
    </section>;
};

export default DailyPlanner;
