import { useState, useEffect, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Storage layer — prefers window.storage (Claude artifacts), falls back to
// localStorage so the component works outside artifact environments too.
// ---------------------------------------------------------------------------
const store = {
  get(k) {
    try { return (typeof window !== 'undefined' && window.storage?.getItem?.(k)) ?? localStorage.getItem(k); }
    catch { try { return localStorage.getItem(k); } catch { return null; } }
  },
  set(k, v) {
    try {
      if (typeof window !== 'undefined' && window.storage?.setItem) window.storage.setItem(k, v);
      else localStorage.setItem(k, v);
    } catch { try { localStorage.setItem(k, v); } catch {} }
  },
};

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const makeSet = (id) => ({
  id,
  title: '',
  coreIdea: '',
  sections: [
    { id: uid(), title: 'Open',  type: 'story',  bullets: [] },
    { id: uid(), title: 'Build', type: 'points', bullets: [] },
    { id: uid(), title: 'Close', type: 'story',  bullets: [] },
  ],
});

// ---------------------------------------------------------------------------
// EditableText — shows a span; clicking switches to an input.
// ---------------------------------------------------------------------------
function EditableText({ value, onSave, className = '', inputClass = '', placeholder = 'Click to edit' }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(value);

  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onSave(trimmed);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); commit(); }
          if (e.key === 'Escape') { setDraft(value); setEditing(false); }
        }}
        className={inputClass || className}
      />
    );
  }

  return (
    <span
      onClick={() => { setDraft(value); setEditing(true); }}
      className={`${className} cursor-text hover:border-b hover:border-stone-200`}
      title="Click to edit"
    >
      {value || <span className="opacity-40 italic">{placeholder}</span>}
    </span>
  );
}

// ---------------------------------------------------------------------------
// BulletRow — single bullet inside a section
// ---------------------------------------------------------------------------
function BulletRow({ bullet, idx, onEdit, onRemove, onDragStart, onBulletDrop }) {
  const [over, setOver] = useState(false);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={e => { e.preventDefault(); e.stopPropagation(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={e => {
        const raw = e.dataTransfer.getData('bulletDrag');
        if (raw) {
          e.preventDefault();
          e.stopPropagation();
          onBulletDrop(e, idx);
        }
        setOver(false);
      }}
      className={`flex items-start gap-2 group py-0.5 rounded-lg transition-colors ${over ? 'bg-amber-50' : ''}`}
    >
      <span className="text-amber-400 mt-1 text-sm shrink-0 cursor-grab select-none">•</span>
      <EditableText
        value={bullet.text}
        onSave={text => onEdit(bullet.id, text)}
        className="flex-1 text-sm text-stone-700 leading-snug"
        inputClass="flex-1 text-sm text-stone-700 bg-amber-50 border-b border-amber-300 outline-none w-full"
        placeholder="Add a beat…"
      />
      <button
        onClick={() => onRemove(bullet.id)}
        className="text-stone-200 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-sm mt-0.5 shrink-0"
      >×</button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SectionCard
// ---------------------------------------------------------------------------
function SectionCard({
  section, onUpdate, onRemove, onAddBullet, onRemoveBullet, onEditBullet,
  onBulletDragStart, onBulletDrop,
  isDragOver, onDragOver, onDragLeave, onDrop,
  isCollapsed, onToggleCollapse,
}) {
  return (
    <div
      className={`transition-colors group/section ${isDragOver ? 'bg-amber-50 rounded-xl' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-1 pt-6 pb-1">
        <button
          onClick={onToggleCollapse}
          className="text-stone-300 hover:text-stone-500 transition-colors text-xs w-3 shrink-0 leading-none"
          title={isCollapsed ? 'Expand' : 'Collapse'}
        >
          {isCollapsed ? '›' : '⌄'}
        </button>
        <EditableText
          value={section.title}
          onSave={t => onUpdate({ title: t })}
          className="font-semibold text-stone-500 text-xs uppercase tracking-widest"
          inputClass="font-semibold text-stone-500 text-xs uppercase tracking-widest border-b border-amber-400 outline-none bg-transparent"
          placeholder="Section title"
        />
        {section.bullets.length > 0 && (
          <span className="text-xs text-stone-300 tabular-nums">{section.bullets.length}</span>
        )}
        <button
          onClick={() => onUpdate({ type: section.type === 'story' ? 'points' : 'story' })}
          className={`text-xs rounded-full px-2.5 py-0.5 border transition-all ml-1 shrink-0 opacity-0 group-hover/section:opacity-100 ${
            section.type === 'story'
              ? 'border-amber-300 text-amber-700 bg-amber-50'
              : 'border-stone-200 text-stone-500 bg-stone-50'
          }`}
        >
          {section.type}
        </button>
        <button
          onClick={onRemove}
          className="ml-auto text-stone-200 hover:text-red-400 transition-colors text-lg leading-none opacity-0 group-hover/section:opacity-100"
        >×</button>
      </div>

      {/* Bullets */}
      {!isCollapsed && (
        <div className="px-1 pb-6 space-y-1">
          {section.bullets.map((bullet, idx) => (
            <BulletRow
              key={bullet.id}
              bullet={bullet}
              idx={idx}
              onEdit={onEditBullet}
              onRemove={onRemoveBullet}
              onDragStart={e => onBulletDragStart(e, bullet.id, idx)}
              onBulletDrop={onBulletDrop}
            />
          ))}
          <button
            onClick={onAddBullet}
            className="text-xs text-stone-400 hover:text-amber-600 mt-2 transition-colors"
          >
            + bullet
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function JarSetBuilder() {
  const [mode, setMode]                           = useState('dev');
  const [sets, setSets]                           = useState({});
  const [index, setIndex]                         = useState([]);
  const [currentSetId, setCurrentSetId]           = useState(null);
  const [conductorInput, setConductorInput]       = useState('');
  const [conductorOutput, setConductorOutput]     = useState(null);
  const [conductorLoading, setConductorLoading]   = useState(false);
  const [conductorOpen, setConductorOpen]         = useState(false);
  const [apiKey, setApiKey]                       = useState('');
  const [showKeyInput, setShowKeyInput]           = useState(false);
  const [dragOverSection, setDragOverSection]     = useState(null);
  const [collapsedSections, setCollapsedSections] = useState(new Set());

  const currentSet = currentSetId ? sets[currentSetId] : null;

  // ---- Boot: load from storage ----
  useEffect(() => {
    setApiKey(localStorage.getItem('jar:apiKey') || '');

    const savedIndex = JSON.parse(store.get('sets:index') || '[]');
    const loadedSets = {};
    savedIndex.forEach(({ id }) => {
      const raw = store.get(`set:${id}`);
      if (raw) try { loadedSets[id] = JSON.parse(raw); } catch {}
    });

    if (savedIndex.length > 0 && Object.keys(loadedSets).length > 0) {
      setSets(loadedSets);
      setIndex(savedIndex);
      setCurrentSetId(savedIndex[0].id);
    } else {
      const id = uid();
      const s  = makeSet(id);
      const newIndex = [{ id, title: s.title }];
      setSets({ [id]: s });
      setIndex(newIndex);
      setCurrentSetId(id);
      store.set('sets:index', JSON.stringify(newIndex));
      store.set(`set:${id}`, JSON.stringify(s));
    }
  }, []);

  // ---- Auto-save on every change ----
  useEffect(() => {
    if (!currentSet) return;
    store.set(`set:${currentSet.id}`, JSON.stringify(currentSet));
    setIndex(prev => {
      const updated = prev.map(item =>
        item.id === currentSet.id ? { ...item, title: currentSet.title } : item
      );
      store.set('sets:index', JSON.stringify(updated));
      return updated;
    });
  }, [currentSet]);

  const updateSet = useCallback((updater) => {
    if (!currentSetId) return;
    setSets(prev => ({ ...prev, [currentSetId]: updater(prev[currentSetId]) }));
  }, [currentSetId]);

  // ---- Library ----
  const newSet = () => {
    const id = uid();
    const s  = makeSet(id);
    setSets(prev => ({ ...prev, [id]: s }));
    setIndex(prev => {
      const updated = [{ id, title: s.title }, ...prev];
      store.set('sets:index', JSON.stringify(updated));
      return updated;
    });
    store.set(`set:${id}`, JSON.stringify(s));
    setCurrentSetId(id);
    setConductorInput('');
    setConductorOutput(null);
    setConductorOpen(false);
    setCollapsedSections(new Set());
  };

  const duplicateSet = () => {
    if (!currentSet) return;
    const id = uid();
    const s  = { ...JSON.parse(JSON.stringify(currentSet)), id, title: `Copy of ${currentSet.title}` };
    setSets(prev => ({ ...prev, [id]: s }));
    setIndex(prev => {
      const updated = [{ id, title: s.title }, ...prev];
      store.set('sets:index', JSON.stringify(updated));
      return updated;
    });
    store.set(`set:${id}`, JSON.stringify(s));
    setCurrentSetId(id);
    setConductorInput('');
    setConductorOutput(null);
    setConductorOpen(false);
    setCollapsedSections(new Set());
  };

  const loadSet = (id) => {
    setCurrentSetId(id);
    setConductorInput('');
    setConductorOutput(null);
    setConductorOpen(false);
    setCollapsedSections(new Set());
  };

  // ---- Section actions ----
  const addSection    = () => updateSet(s => ({ ...s, sections: [...s.sections, { id: uid(), title: 'New Section', type: 'points', bullets: [] }] }));
  const removeSection = id => updateSet(s => ({ ...s, sections: s.sections.filter(sec => sec.id !== id) }));
  const updateSection = (id, patch) => updateSet(s => ({ ...s, sections: s.sections.map(sec => sec.id === id ? { ...sec, ...patch } : sec) }));

  const toggleSectionCollapse = (id) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ---- Bullet actions ----
  const addBullet    = sId => updateSet(s => ({ ...s, sections: s.sections.map(sec => sec.id === sId ? { ...sec, bullets: [...sec.bullets, { id: uid(), text: '' }] } : sec) }));
  const removeBullet = (sId, bId) => updateSet(s => ({ ...s, sections: s.sections.map(sec => sec.id === sId ? { ...sec, bullets: sec.bullets.filter(b => b.id !== bId) } : sec) }));
  const editBullet   = (sId, bId, text) => updateSet(s => ({ ...s, sections: s.sections.map(sec => sec.id === sId ? { ...sec, bullets: sec.bullets.map(b => b.id === bId ? { ...b, text } : b) } : sec) }));

  // ---- Bullet drag reorder ----
  const onBulletDragStart = (e, sectionId, bulletId, idx) => {
    e.dataTransfer.setData('bulletDrag', JSON.stringify({ sectionId, bulletId, index: idx }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const onBulletDrop = (e, sectionId, targetIdx) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('bulletDrag');
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data.sectionId !== sectionId) return;
    updateSet(s => ({
      ...s,
      sections: s.sections.map(sec => {
        if (sec.id !== sectionId) return sec;
        const bullets  = [...sec.bullets];
        const [moved]  = bullets.splice(data.index, 1);
        const insertAt = data.index < targetIdx ? targetIdx - 1 : targetIdx;
        bullets.splice(insertAt, 0, moved);
        return { ...sec, bullets };
      }),
    }));
  };

  // ---- Conductor ----
  const toggleConductor = () => {
    setConductorOpen(o => !o);
  };

  const runConductor = async () => {
    if (!conductorInput.trim()) return;
    if (!apiKey) { setShowKeyInput(true); return; }
    setConductorLoading(true);
    setConductorOutput(null);

    const prompt = `You are the Conductor — a writing assistant for Gabriel, a YouTube creator. Gabriel has ADHD and struggles to build bridges between ideas. He will paste raw, messy notes, half-finished thoughts, and fragments.

Your job:
1. Read the notes and find the natural topic clusters — the distinct ideas or beats that belong together.
2. Name each section based on what it's actually about. Use specific, evocative names ("The Mistake I Made", "Why This Actually Matters") not generic ones ("Intro", "Point 1").
3. If Gabriel has marked sections with [brackets] like [intro] or [point 2], treat those as anchors and organize the content around them.
4. Write natural spoken bridge transitions between sections.
5. Find the one through-line that ties everything together.

RULES:
- Do not force Open/Build/Close unless that structure genuinely fits. Let the content decide the shape. Aim for 3–5 sections.
- Do not invent new content. Only use ideas present in the input.
- Keep Gabriel's voice — don't make it corporate or polished.
- Bridge lines should sound like natural spoken transitions, not written prose.
- Every bullet should be one concrete beat — one idea, one moment, one point.
- The last section should have bridge: null.

INPUT (Gabriel's raw notes):
${conductorInput}

Return ONLY a valid JSON object — no explanation, no markdown, just raw JSON:
{
  "coreIdea": "One sentence thesis of the whole video",
  "sections": [
    { "title": "Descriptive section name", "type": "story", "bullets": ["..."], "bridge": "Spoken transition to next section" },
    { "title": "Descriptive section name", "type": "points", "bullets": ["..."], "bridge": null }
  ]
}`;

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const text  = data.content?.[0]?.text || '{}';
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        setConductorOutput(JSON.parse(match[0]));
      } else {
        throw new Error('Could not parse response.');
      }
    } catch (err) {
      setConductorOutput({ error: err.message || 'Check your API key and network.' });
    } finally {
      setConductorLoading(false);
    }
  };

  const applyConductorOutput = () => {
    if (!conductorOutput || conductorOutput.error) return;
    updateSet(s => ({
      ...s,
      coreIdea: conductorOutput.coreIdea ?? s.coreIdea,
      sections: conductorOutput.sections.map(sec => ({
        id: uid(),
        title: sec.title,
        type: sec.type,
        bullets: [
          ...sec.bullets.map(text => ({ id: uid(), text })),
          ...(sec.bridge ? [{ id: uid(), text: sec.bridge }] : []),
        ],
      })),
    }));
    setConductorOutput(null);
    setConductorInput('');
    setConductorOpen(false);
    setCollapsedSections(new Set());
  };

  // ---- Loading guard ----
  if (!currentSet) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center text-stone-400 text-sm">
        Loading…
      </div>
    );
  }

  const isEmptySet = !currentSet.coreIdea && currentSet.sections.every(s => s.bullets.length === 0);

  // ==========================================================================
  // DELIVERY MODE
  // ==========================================================================
  if (mode === 'delivery') {
    return (
      <div className="min-h-screen bg-stone-950 px-8 py-12 md:px-16 md:py-16">
        <button
          onClick={() => setMode('dev')}
          className="fixed top-4 right-5 text-xs text-stone-600 hover:text-stone-400 transition-colors z-10"
        >
          ← Edit
        </button>

        <div className="max-w-3xl mx-auto">
          {currentSet.title && (
            <p className="text-xs uppercase tracking-widest text-stone-600 mb-3">{currentSet.title}</p>
          )}

          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-14">
            {currentSet.coreIdea || <span className="text-stone-700 italic font-normal">No core idea set</span>}
          </h1>

          {currentSet.sections.map(section => (
            <div key={section.id} className="mb-12">
              <div className="flex items-baseline gap-3 mb-5">
                <h2 className="text-amber-400 text-2xl font-semibold">{section.title}</h2>
                <span className="text-stone-700 text-xs uppercase tracking-wider">{section.type}</span>
              </div>
              <ul className="space-y-4 pl-1">
                {section.bullets.map(b => (
                  <li key={b.id} className="flex gap-3 text-stone-100 text-xl leading-relaxed">
                    <span className="text-amber-600 shrink-0 mt-1">•</span>
                    <span>{b.text || <span className="text-stone-700 italic">—</span>}</span>
                  </li>
                ))}
                {section.bullets.length === 0 && (
                  <li className="text-stone-700 italic text-lg">—</li>
                )}
              </ul>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ==========================================================================
  // DEV MODE
  // ==========================================================================
  return (
    <div className="min-h-screen bg-amber-50 relative">

      {/* ---- Library Bar ---- */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-stone-100 px-4 py-2.5 flex items-center gap-2 flex-wrap">
        <select
          value={currentSetId || ''}
          onChange={e => loadSet(e.target.value)}
          className="text-sm text-stone-700 bg-transparent border border-stone-200 rounded-lg px-2 py-1.5 max-w-xs cursor-pointer focus:outline-none focus:border-amber-400"
        >
          {index.map(({ id, title }) => (
            <option key={id} value={id}>{title || 'Untitled Video'}</option>
          ))}
        </select>

        <button
          onClick={newSet}
          className="text-sm text-amber-700 border border-amber-200 rounded-lg px-3 py-1.5 hover:bg-amber-50 transition-colors"
        >
          + New
        </button>

        <button
          onClick={duplicateSet}
          className="text-sm text-stone-400 border border-stone-200 rounded-lg px-3 py-1.5 hover:bg-stone-50 transition-colors"
        >
          Duplicate
        </button>

        <div className="ml-auto flex items-center gap-2">
          {showKeyInput ? (
            <input
              autoFocus
              type="password"
              placeholder="sk-ant-…"
              defaultValue={apiKey}
              onBlur={e => { setApiKey(e.target.value); localStorage.setItem('jar:apiKey', e.target.value); setShowKeyInput(false); }}
              onKeyDown={e => {
                if (e.key === 'Enter') { setApiKey(e.target.value); localStorage.setItem('jar:apiKey', e.target.value); setShowKeyInput(false); }
                if (e.key === 'Escape') setShowKeyInput(false);
              }}
              className="text-sm border border-stone-200 rounded-lg px-3 py-1.5 outline-none focus:border-amber-400 w-52 transition-colors"
            />
          ) : (
            <button
              onClick={() => setShowKeyInput(true)}
              className={`text-sm transition-colors ${apiKey ? 'text-amber-500' : 'text-stone-300 hover:text-stone-500'}`}
              title={apiKey ? 'API key saved — click to update' : 'Set Anthropic API key'}
            >
              ⚙
            </button>
          )}

          <button
            onClick={toggleConductor}
            className={`text-sm rounded-lg px-4 py-1.5 transition-colors font-medium ${
              conductorOpen
                ? 'bg-stone-100 text-stone-700'
                : 'bg-amber-500 text-white hover:bg-amber-600'
            }`}
          >
            Conductor
          </button>

          <button
            onClick={() => setMode('delivery')}
            className="text-sm bg-stone-800 text-white rounded-lg px-4 py-1.5 hover:bg-stone-700 transition-colors"
          >
            Deliver →
          </button>
        </div>
      </div>

      {/* ---- Main + optional Conductor panel ---- */}
      <div className="flex">
        <div className={`flex-1 transition-all duration-200 ${conductorOpen ? 'mr-96' : ''}`}>
          <div className="max-w-2xl mx-auto px-4 py-8">

            {/* Sticky header: Video Title + Core Idea */}
            <div className="sticky top-11 z-10 bg-amber-50 -mx-4 px-4 pb-4">
              <div className="mb-4">
                <p className="text-xs uppercase tracking-widest text-stone-400 mb-2">Video Title</p>
                <input
                  type="text"
                  value={currentSet.title}
                  onChange={e => updateSet(s => ({ ...s, title: e.target.value }))}
                  placeholder="Name this video…"
                  className="w-full text-xl font-semibold text-stone-800 bg-transparent border-b border-stone-200 focus:border-amber-400 outline-none pb-2 placeholder-stone-300 transition-colors"
                />
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-stone-400 mb-2">Core Idea</p>
                <input
                  type="text"
                  value={currentSet.coreIdea}
                  onChange={e => updateSet(s => ({ ...s, coreIdea: e.target.value }))}
                  placeholder="The one sentence this whole video proves…"
                  className="w-full text-lg font-medium text-stone-800 bg-transparent border-b border-stone-200 focus:border-amber-400 outline-none pb-2 placeholder-stone-300 transition-colors"
                />
              </div>
            </div>

            {/* Empty state or Sections */}
            {isEmptySet ? (
              <div className="text-center py-20 mt-4">
                <p className="text-stone-400 text-base mb-1">Ready when you are.</p>
                <p className="text-stone-300 text-sm mb-6">
                  Paste your raw notes into{' '}
                  <button onClick={toggleConductor} className="text-stone-400 underline underline-offset-2 hover:text-amber-600 transition-colors">
                    Conductor
                  </button>
                  {' '}and it will organize them for you.
                </p>
              </div>
            ) : (
              <div className="space-y-0 divide-y divide-stone-100 mt-4">
                {currentSet.sections.map(section => (
                  <SectionCard
                    key={section.id}
                    section={section}
                    onUpdate={patch => updateSection(section.id, patch)}
                    onRemove={() => removeSection(section.id)}
                    onAddBullet={() => addBullet(section.id)}
                    onRemoveBullet={bId => removeBullet(section.id, bId)}
                    onEditBullet={(bId, text) => editBullet(section.id, bId, text)}
                    onBulletDragStart={(e, bId, idx) => onBulletDragStart(e, section.id, bId, idx)}
                    onBulletDrop={(e, idx) => onBulletDrop(e, section.id, idx)}
                    isDragOver={dragOverSection === section.id}
                    onDragOver={e => { e.preventDefault(); setDragOverSection(section.id); }}
                    onDragLeave={() => setDragOverSection(null)}
                    onDrop={e => { e.preventDefault(); setDragOverSection(null); }}
                    isCollapsed={collapsedSections.has(section.id)}
                    onToggleCollapse={() => toggleSectionCollapse(section.id)}
                  />
                ))}

                <button
                  onClick={addSection}
                  className="text-xs text-stone-300 hover:text-amber-600 px-1 py-4 w-full text-left transition-colors"
                >
                  + Add Section
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Conductor side panel */}
        {conductorOpen && (
          <div className="fixed right-0 top-0 bottom-0 w-96 bg-white border-l border-stone-100 z-20 shadow-lg flex flex-col">
            <div className="p-5 flex flex-col h-full">

              {/* Header */}
              <div className="flex items-center justify-between mb-4 shrink-0">
                <h3 className="text-sm font-semibold text-stone-700">Conductor</h3>
                <button
                  onClick={() => setConductorOpen(false)}
                  className="text-stone-300 hover:text-stone-600 text-xl leading-none transition-colors"
                >×</button>
              </div>

              {/* Input zone */}
              <div className="shrink-0 mb-4">
                <p className="text-xs text-stone-400 mb-2 leading-snug">
                  Paste your raw notes, voice memo transcript, or anything you've got. The Conductor will find the natural structure and organize it for you.
                </p>
                <textarea
                  value={conductorInput}
                  onChange={e => setConductorInput(e.target.value)}
                  placeholder="Paste everything here — messy notes, half sentences, bullet points, transcript, whatever you've got…"
                  className="w-full text-sm text-stone-700 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 outline-none focus:border-amber-300 transition-colors resize-none leading-snug"
                  rows={10}
                />
                <button
                  onClick={runConductor}
                  disabled={conductorLoading || !conductorInput.trim()}
                  className="mt-2 w-full text-sm bg-amber-500 text-white rounded-xl px-4 py-2 hover:bg-amber-600 disabled:opacity-40 transition-colors font-medium"
                >
                  {conductorLoading ? 'Organizing…' : 'Organize →'}
                </button>
              </div>

              {/* Output zone */}
              {conductorOutput && !conductorOutput.error && (
                <div className="flex-1 overflow-y-auto">
                  <div className="border-t border-stone-100 pt-4">
                    <p className="text-xs text-stone-400 uppercase tracking-widest mb-3">Result</p>

                    <p className="text-xs text-stone-500 mb-1 font-medium">Core Idea</p>
                    <p className="text-sm text-stone-800 mb-4 leading-snug">{conductorOutput.coreIdea}</p>

                    {conductorOutput.sections?.map((sec, i) => (
                      <div key={i} className="mb-4">
                        <p className="text-xs text-stone-400 uppercase tracking-widest mb-1">{sec.title}</p>
                        <ul className="space-y-1 mb-2">
                          {sec.bullets?.map((b, j) => (
                            <li key={j} className="text-sm text-stone-700 flex gap-1.5 leading-snug">
                              <span className="text-amber-400 shrink-0">•</span>
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                        {sec.bridge && (
                          <p className="text-xs text-stone-400 italic pl-3 border-l border-stone-200">
                            Bridge → {sec.bridge}
                          </p>
                        )}
                      </div>
                    ))}

                    <div className="border-t border-stone-100 pt-4 mt-2">
                      <p className="text-xs text-stone-400 mb-2">This will replace your current sections.</p>
                      <button
                        onClick={applyConductorOutput}
                        className="w-full text-sm bg-amber-500 text-white rounded-xl px-4 py-2 hover:bg-amber-600 transition-colors font-medium"
                      >
                        Use This
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Error state */}
              {conductorOutput?.error && (
                <div className="mt-2 bg-red-50 border border-red-100 rounded-xl p-3">
                  <p className="text-sm text-red-600">{conductorOutput.error}</p>
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
