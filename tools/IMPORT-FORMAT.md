# FCPS Book import file (for Claude)

The app imports a `.json` file made from Word documents. Attach this page together with the documents
when you ask Claude to prepare an import file. In the app: Import button on the dashboard,
or Settings > Import questions from a file.

## Structure

```json
{
  "app": "fcps-book-import",
  "version": 1,
  "systems": [
    {
      "name": "Neuro Anaesthesia",
      "topics": [
        {
          "name": "Physiology",
          "questions": [ { "q": "Question text", "a": "<p>Answer as HTML</p>", "tags": ["High-yield"], "rev": [] } ],
          "subtopics": [
            { "name": "Cerebral blood flow", "questions": [ { "q": "...", "a": "<p>...</p>" } ] }
          ]
        }
      ]
    }
  ],
  "exams": [
    { "kind": "long", "title": "Long case: ...", "system": "Neuro Anaesthesia", "body": "<h3>Patient summary</h3><p>...</p>", "tags": ["Hard topic"] }
  ]
}
```

## Rules

- `systems[].name`: the app matches it to an existing system by name (ignores case, spaces and punctuation).
  If nothing matches, the person chooses an existing system or creates a new one in the preview.
  The 34 system names in the app are: Neuro Anaesthesia, Obstetric & Gynae Anaesthesia, Cardiothoracic Anaesthesia,
  Paediatric Anaesthesia, Emergency and Trauma Anaesthesia, Burn & Poisoning, Orthopaedic Anaesthesia, Eye, ENT,
  Genitourinary Anaesthesia, Obesity, Liver Disease, Day Case Anaesthesia, Endocrine System, Transplant Anaesthesia,
  Geriatric Anaesthesia, Intercurrent disease and anaesthesia, ICU, General Anaesthesia, Regional Anaesthesia & Block,
  Data, statistics, Pharmacology, Procedural Sedation, Critical incidents, Complications during anaesthesia,
  Pain Medicine, Quality and safety in anaesthesia, Metabolism, stress responses and thermoregulation,
  Nausea and vomiting, Cardiovascular system, Respiratory system, Renal system,
  Fluid, electrolyte and acid-base balance, Physics, Applied Physiology.
- Structure is System > topic > optional subtopic > question. A topic can hold questions directly and also subtopics.
  Topics and subtopics are created when missing and matched by name when they exist.
- `q` is plain text (drop the "Q1." numbering). `a` is HTML: p, b, i, u, ul, ol, li, h3, h4, table, tr, th, td, br, sub, sup.
  Colours and highlights may be given as span style (color, background-color). A box is a table with one cell whose style
  may hold `background-color` and `border-left:5px solid #RRGGBB`. Everything else is removed.
  Plain text is also accepted and is split into paragraphs at line breaks.
- Do not shorten, summarise or reword the text of the documents. Keep every question and every answer as written.
- `tags` (optional): High-yield, Very important, Must-know, Hard topic, Viva, Written, OSPE, Long case, Short case.
  `rev` (optional): Night before exam, 1 week before exam, Last month. Unknown names are left out.
- `exams[].kind` is one of: `viva`, `ospe`, `long`, `short`. `system` is optional.
- Questions that already exist in the same topic are skipped (compared by question text).
- Split very large sets into several files, for example one per system. Several files can be imported together.

## How Claude can make it

1. Convert each .docx to HTML by reading the run formatting with `python-docx` (keeps bold, colour, highlight, lists, tables and shaded boxes).
   `mammoth` is a simpler option when colours do not matter.
2. Split the HTML by headings and by question markers into the structure above.
3. Check the counts: number of questions in the document = number in the JSON, and no empty answers.
4. Write the JSON with `ensure_ascii=False` and hand the file to the user.
