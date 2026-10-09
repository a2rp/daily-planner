import { useEffect, useMemo, useRef, useState } from "react";
import { FiCheck, FiClock, FiPlus, FiTrash2 } from "react-icons/fi";
import styles from "./styles.module.css";
const key = "daily-planner-items";
const isoToday = new Date().toISOString().slice(0, 10);
const initial = [{ id: "a", date: isoToday, time: "08:30", title: "Set the three priorities", done: true }, { id: "b", date: isoToday, time: "10:00", title: "Draft the first project outline", done: false }, { id: "c", date: isoToday, time: "13:30", title: "Review notes and make revisions", done: false }, { id: "d", date: isoToday, time: "16:00", title: "Close the day and reset the desk", done: false }];
const load = () => { try { const data = JSON.parse(localStorage.getItem(key)); return Array.isArray(data) ? data : initial; } catch { return initial; } };
const DailyPlanner = () => {
    const [items, setItems] = useState(load);
    const [date, setDate] = useState(isoToday);
    const [title, setTitle] = useState("");
    const [time, setTime] = useState("09:00");
    const [notes, setNotes] = useState(() => localStorage.getItem(key + "-notes") || "");
    const [removing, setRemoving] = useState(null);
    const cancelRef = useRef(null);
    useEffect(() => localStorage.setItem(key, JSON.stringify(items)), [items]);
    useEffect(() => localStorage.setItem(key + "-notes", notes), [notes]);
    useEffect(() => {
        if (!removing) return undefined;
        cancelRef.current?.focus();
        const onKey = (event) => { if (event.key === "Escape") setRemoving(null); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [removing]);
    const todayItems = useMemo(() => items.filter((item) => item.date === date).sort((a, b) => a.time.localeCompare(b.time)), [items, date]);
    const done = todayItems.filter((item) => item.done).length;
    const add = (event) => { event.preventDefault(); if (!title.trim()) return; setItems((current) => [...current, { id: crypto.randomUUID(), date, time, title: title.trim(), done: false }]); setTitle(""); };
    const prettyDate = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date(date + "T12:00:00"));
    return <section className={styles.dailyPage} id="today">
        <div className={styles.topline}><div><p className={styles.label}>A little structure, a lot of room</p><h1>Make today count.</h1></div><label className={styles.datePicker}>Choose a day<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label></div>
        <div className={styles.summary}><div><span>Today</span><strong>{prettyDate}</strong></div><div className={styles.progress}><span>{done} of {todayItems.length} done</span><div><i style={{ width: todayItems.length ? (done / todayItems.length * 100) + "%" : "0%" }} /></div></div><p><FiClock /> Keep a pace you can sustain</p></div>
        <div className={styles.columns}>
            <section className={styles.schedule} aria-label="Daily schedule">
                <div className={styles.sectionHeading}><div><span>01</span><h2>Schedule</h2></div><small>{todayItems.length} blocks</small></div>
                {todayItems.length ? <div className={styles.timeline}>{todayItems.map((item) => <article key={item.id} className={item.done ? styles.completed : ""}><time>{item.time}</time><span className={styles.timelineDot} /><div className={styles.task}><button className={styles.check} onClick={() => setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, done: !entry.done } : entry))} aria-label={(item.done ? "Mark " : "Complete ") + item.title}><FiCheck /></button><strong>{item.title}</strong><button className={styles.remove} onClick={() => setRemoving(item)} aria-label={"Delete " + item.title}><FiTrash2 /></button></div></article>)}</div> : <p className={styles.empty}>A clear day. Add the first block below.</p>}
                <form className={styles.addForm} onSubmit={add}><label>Time<input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label><label>Task<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What needs your attention?" required /></label><button aria-label="Add task"><FiPlus /> Add block</button></form>
            </section>
            <aside className={styles.notes} id="notes"><div className={styles.sectionHeading}><div><span>02</span><h2>Working notes</h2></div><small>Autosaved</small></div><p>Keep a thought or reminder close while you plan.</p><textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="A note for today..." /><div className={styles.noteFooter}><i />Only stored in this browser</div></aside>
        </div>
        {removing && <div className={styles.modal}><section role="dialog" aria-modal="true" aria-labelledby="remove-title" aria-describedby="remove-text"><FiTrash2 /><h2 id="remove-title">Remove this block?</h2><p id="remove-text"><strong>{removing.title}</strong> will be deleted from the day plan.</p><div><button ref={cancelRef} onClick={() => setRemoving(null)}>Keep block</button><button onClick={() => { setItems((current) => current.filter((item) => item.id !== removing.id)); setRemoving(null); }}>Delete block</button></div></section></div>}
    </section>;
};
export default DailyPlanner;
