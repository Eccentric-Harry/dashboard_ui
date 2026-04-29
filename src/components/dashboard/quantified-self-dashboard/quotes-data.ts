export interface Quote {
  text: string;
  author: string;
}

export const quotes: Quote[] = [
  { text: "The successful warrior is the average man with laser-like focus.", author: "Bruce Lee" },
  { text: "Action is the foundational key to all success.", author: "Pablo Picasso" },
  { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
  { text: "Productivity is never an accident. It is always the result of a commitment to excellence.", author: "Paul J. Meyer" },
  { text: "Efficiency is doing things right; effectiveness is doing the right things.", author: "Peter Drucker" },
  { text: "Amateurs sit and wait for inspiration, the rest of us just get up and go to work.", author: "Stephen King" },
  { text: "Nothing will work unless you do.", author: "Maya Angelou" },
  { text: "The key is not to prioritize what's on your schedule, but to schedule your priorities.", author: "Stephen R. Covey" },
  { text: "You can do anything, but not everything.", author: "David Allen" },
  { text: "The true price of anything you do is the amount of time you exchange for it.", author: "Henry David Thoreau" },
  { text: "Concentrate all your thoughts upon the work at hand. The sun's rays do not burn until brought to a focus.", author: "Alexander Graham Bell" },
  { text: "Never mistake motion for action.", author: "Ernest Hemingway" },
  { text: "Simplicity boils down to two steps: Identify the essential. Eliminate the rest.", author: "Leo Babauta" },
  { text: "It is not necessary to do extraordinary things to get extraordinary results.", author: "Warren Buffett" },
  { text: "It's not that I'm so smart, it's just that I stay with problems longer.", author: "Albert Einstein" }
];

export const getQuoteOfDay = (): Quote => {
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
  return quotes[dayOfYear % quotes.length];
};
