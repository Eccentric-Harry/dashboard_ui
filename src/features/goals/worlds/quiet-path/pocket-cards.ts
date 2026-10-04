// Pocket cards: one small, practical thing per chapter, found in the satchel that sits on
// the path after the chapter's third stone (Duolingo puts a chest there; ours holds a
// tip instead of gems — nothing in this world pays out for calm). Each card says where
// the idea comes from. Found cards live in the notebook.

export interface PocketCard {
  chapter: number
  title: string
  text: string
  /** Try it: one line. */
  tryIt: string
  source: string
}

export const POCKET_CARDS: PocketCard[] = [
  {
    chapter: 1,
    title: 'Tie it to something',
    text: 'New habits stick far better as a plan of the form “after I do X, I’ll do Y” — tied to something you already do every day.',
    tryIt: 'After my first cup of tea, I’ll walk today’s stone.',
    source: 'Gollwitzer & Sheeran, 2006 — a review of 94 studies',
  },
  {
    chapter: 2,
    title: 'Out longer than in',
    text: 'No time for a session? Make your out-breath a little longer than your in-breath, a few times over. It works in a queue, on a call, anywhere.',
    tryIt: 'In for four, out for six — three times.',
    source: 'Balban et al., Cell Reports Medicine, 2023',
  },
  {
    chapter: 3,
    title: 'Ten minutes of moving',
    text: 'Even a brisk ten-minute walk can lift your mood and take the edge off stress. Gentle movement counts.',
    tryIt: 'Once round the block, phone in your pocket.',
    source: 'NHS — five steps to mental wellbeing',
  },
  {
    chapter: 4,
    title: 'Let it come, let it go',
    text: 'Pushing a thought away tends to bring it back. Letting it be there — like a radio playing in another room — usually lets it fade sooner.',
    tryIt: '“There’s that thought.” Then back to what you were doing.',
    source: 'Wegner et al., 1987 — the “white bear” studies',
  },
  {
    chapter: 5,
    title: 'Twenty minutes outside',
    text: 'Twenty minutes sitting or walking somewhere green lowered a stress hormone in a study of city dwellers; about two hours a week outdoors goes with better wellbeing.',
    tryIt: 'A park bench, a tree-lined street, a balcony with plants.',
    source: 'Hunter et al., 2019; White et al., Scientific Reports, 2019',
  },
  {
    chapter: 6,
    title: 'Small kind acts',
    text: 'Doing something kind for someone else — a thank-you, a hand with something — gives your own wellbeing a small, reliable lift.',
    tryIt: 'Send one thank-you you’ve been meaning to.',
    source: 'Curry et al., 2018 — a review of 27 experiments',
  },
  {
    chapter: 7,
    title: 'The long-awake rule',
    text: 'If you’ve been lying awake for what feels like twenty minutes, get up, do something calm in dim light, and go back when sleepy. It teaches your body that bed means sleep.',
    tryIt: 'Keep a paper book by a chair that isn’t your bed.',
    source: 'Stimulus control, part of CBT for insomnia',
  },
  {
    chapter: 8,
    title: 'Practical or what-if?',
    text: 'Ask: can I do something about this right now? If yes, make a small plan. If not, it’s a what-if — notice it, name it, and come back to now.',
    tryIt: 'Sort one worry today into “plan” or “let be”.',
    source: 'The worry tree — NHS talking therapies',
  },
  {
    chapter: 9,
    title: 'Start before you feel like it',
    text: 'Waiting to feel ready can take a while. Starting small often brings the motivation with it — the feeling tends to follow the doing.',
    tryIt: 'Two minutes of the thing. Just two.',
    source: 'Behavioural activation — Ekers et al., PLOS ONE, 2014',
  },
]

export const pocketCardOf = (chapter: number) => POCKET_CARDS.find((c) => c.chapter === chapter) ?? null
