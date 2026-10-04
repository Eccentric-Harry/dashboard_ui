// Each chapter's first and last stones (course.ts assembles them around its practices).
//
// The story — Duolingo Stories, but for a skill rather than a language: the place's
// resident (residents.ts) and Pip talk it through, one research card says where the idea
// comes from, and one gentle question has no wrong answers. Sources, in order:
//   1 Killingsworth & Gilbert, Science 2010 (mind-wandering); WHO "Doing What Matters"
//   2 Balban et al., Cell Reports Medicine 2023 (cyclic sighing)
//   3 Lieberman et al., Psychological Science 2007 (affect labelling); WHO "making room"
//   4 Wegner et al. 1987 (thought suppression); WHO "unhooking" / ACT defusion
//   5 WHO "dropping anchor"; Tol et al., Lancet Global Health 2020 (Self-Help Plus trial)
//   6 Breines & Chen 2012 (self-compassion and motivation); Neff's three components
//   7 CBT for insomnia (fixed wake time, stimulus control); Scullin et al. 2018 (to-do list)
//   8 The worry tree (NHS talking therapies); McGowan & Behar 2013 (worry postponement)
//   9 Five Ways to Wellbeing (NEF 2008, NHS); behavioural activation (Ekers et al. 2014)
//
// The kit stone packs the chapter's page (kit.ts); the heavy-day page follows the
// Stanley-Brown safety plan (Stanley & Brown 2012; Stanley et al., JAMA Psychiatry 2018).
//
// Same guardrails as every line on the path: no should, no scoring a feeling, and
// thoughts are watched, never argued with (MIND_WELLNESS_PLAN.md).

import type { Session, SessionStep } from './course'
import type { KitKey } from './kit'
import type { Speaker } from './residents'

const line = (who: Speaker, text: string): SessionStep => ({ kind: 'line', who, text })
const fact = (title: string, text: string, source: string): SessionStep => ({ kind: 'fact', title, text, source })
const choice = (who: Speaker, text: string, options: [string, string][]): SessionStep => ({
  kind: 'choice',
  who,
  text,
  options: options.map(([label, reply]) => ({ label, reply })),
})

const story = (id: string, host: Speaker, title: string, why: string, steps: SessionStep[], closing: string): Session => ({
  id,
  kind: 'story',
  host,
  title,
  minutes: 0,
  practice: 'learn',
  icon: 'story',
  why,
  steps,
  closing,
})

const kitStone = (id: string, host: Speaker, kit: KitKey, title: string, why: string, before: string[], closing: string, after?: string): Session => ({
  id,
  kind: 'kit',
  host,
  kit,
  title,
  minutes: 0,
  practice: 'write',
  icon: 'backpack',
  why,
  steps: [...before.map((t) => line(host, t)), { kind: 'kit', page: kit }, ...(after ? [line(host, after)] : [])],
  closing,
})

/** Each chapter's story, by chapter number. */
export const STORIES: Record<number, Session> = {
  1: story(
    'story-arriving',
    'kiri',
    'Welcome to the path',
    'How the path works, and the one skill everything else is built on.',
    [
      line('kiri', 'Welcome to the trailhead. I’m Kiri — I keep this path.'),
      line('pip', 'What’s at the top?'),
      line('kiri', 'A quiet summit. But the walking is the point: nine places, each with something useful to learn and practise.'),
      line('kiri', 'Every place works the same way. A story first, so you know why. Then four short practices. Then you pack one thing into your kit.'),
      line('pip', 'My kit?'),
      line('kiri', 'Your own small plan — what you notice, what helps, who to call. By the summit it’s a map of what works for you.'),
      fact(
        'A wandering mind',
        'In a study that checked in on thousands of people through their day, minds were somewhere other than the task almost half the time — and people felt less at ease while they wandered.',
        'Killingsworth & Gilbert, Science, 2010',
      ),
      line('kiri', 'So the first skill is simple: notice where your attention went, and bring it back. Kindly. Again and again.'),
      choice('kiri', 'When your attention wanders, where does it usually go?', [
        ['To the future', 'Plans and what-ifs. Very common — there’s a whole place up the path for worry.'],
        ['To the past', 'Replaying things. Also common. Noticing the replay is already a step back from it.'],
        ['To my to-do list', 'The busy channel. Short practices fit between things, which helps.'],
        ['Everywhere', 'That’s most minds. You’re in good company here.'],
      ]),
      line('kiri', 'One stone a day is plenty. A few minutes most days does more than a long session now and then.'),
      line('pip', 'Then let’s go!'),
    ],
    'Now you know the way. Your first practice opens tomorrow.',
  ),
  2: story(
    'story-breath',
    'bo',
    'Why the out-breath',
    'What a slow breath actually does in your body.',
    [
      line('bo', 'Oh! Hello. I’m Bo. I sit by this pond and breathe. Mostly that.'),
      line('pip', 'Just… breathing?'),
      line('bo', 'Slowly. Watch my throat — in a little, out a long while.'),
      line('bo', 'Here’s the trick. Your heart speeds up a touch on every in-breath, and slows a touch on every out-breath.'),
      line('bo', 'So a longer out-breath tells your body: you can stand down now.'),
      fact(
        'Five minutes a day',
        'In a month-long study, five minutes a day of slow breathing with long out-breaths eased anxiety and lifted mood — a little more than the same time spent meditating.',
        'Balban et al., Cell Reports Medicine, 2023',
      ),
      line('pip', 'Is there a right way to do it?'),
      line('bo', 'Not really. Through the nose if you can, and out longer than in. That’s most of it.'),
      choice('bo', 'When might a slow breath help you most?', [
        ['Before something hard', 'Box breathing suits that — steady, even, easy to count.'],
        ['Lying in bed', 'Try four-seven-eight at night. The long holds slow everything down.'],
        ['In the middle of a busy day', 'A couple of long exhales between things. Nobody even notices.'],
        ['When a feeling comes on fast', 'Two breaths in, one long breath out. The quickest one I know.'],
      ]),
      line('bo', 'This wood has four ways to breathe. Try them all; keep the one that fits.'),
    ],
    'Now you know why the out-breath matters. Bo will be by the pond.',
  ),
  3: story(
    'story-body',
    'tova',
    'Where stress lives',
    'Why noticing and naming a feeling in the body helps it settle.',
    [
      line('tova', 'Welcome to the hollow. I’m Tova. I take things slowly — it’s how I notice them.'),
      line('tova', 'Stress isn’t only in your head. It shows up in the body: tight shoulders, a clenched jaw, a knot in the stomach, a heavy chest.'),
      line('pip', 'My shoulders creep up to my ears sometimes.'),
      line('tova', 'Mine go into my shell. Everybody has a place.'),
      fact(
        'Name it to tame it',
        'When people put a feeling into words — “this is tension”, “this is worry” — the brain’s alarm quietens, and the parts that steady us get busier.',
        'Lieberman et al., Psychological Science, 2007',
      ),
      line('tova', 'So here we notice, name, and make a little room. Not pushing a feeling away — letting it be there while you breathe around it.'),
      choice('tova', 'Where does stress tend to show up in your body?', [
        ['Shoulders and neck', 'A slow shoulder roll and a long breath out can loosen them.'],
        ['Stomach', 'A warm hand on your belly, breathing into it, can help it settle.'],
        ['Jaw or face', 'Let your tongue rest and your teeth part a little. Try it now.'],
        ['Chest', 'Breathe into it gently, as if making a bit more space.'],
      ]),
      line('tova', 'Whatever you chose — that’s one of your early signs. Worth remembering.'),
    ],
    'You know where to look now. The body has been talking all along.',
  ),
  4: story(
    'story-thoughts',
    'ollie',
    'Getting hooked',
    'How thoughts hook us — and the simple way to unhook.',
    [
      line('ollie', 'Hey! I’m Ollie. I float. Lie back, watch the river carry things past.'),
      line('pip', 'What kind of things?'),
      line('ollie', 'Leaves, twigs, the odd thought.'),
      line('ollie', 'Thoughts are like that. They drift in all day — useful ones, silly ones, scary ones. Making them is just what minds do.'),
      line('ollie', 'The trouble starts when one hooks you and pulls you downstream. Then you’re not here any more; you’re inside the thought.'),
      fact(
        'The white bear',
        'People asked not to think about a white bear kept thinking of it — more than people who were allowed to. Pushing a thought away tends to bring it back.',
        'Wegner et al., 1987',
      ),
      line('pip', 'So pushing them away doesn’t work?'),
      line('ollie', 'Not for long. What works better: notice the hook, name it, and come back to what you were doing.'),
      line('ollie', 'Like: “I’m noticing the thought that I’ll mess this up.” Same thought — but now you’re watching it instead of being dragged along.'),
      line('ollie', 'You don’t have to argue with it or prove it wrong. A thought isn’t an order, and it isn’t a fact about you.'),
      choice('ollie', 'Which channel does your mind play most?', [
        ['What-if', 'The what-if channel. Cloud pass, further up, is all about it.'],
        ['Not good enough', 'A loud one for lots of people. Naming it helps: “ah, the not-enough story.”'],
        ['Replays', 'Replays love the night. Try: “here’s the replay again.”'],
        ['Rush and to-dos', 'Busy-brain. Writing the list down gives it somewhere to go.'],
      ]),
      line('ollie', 'The next four stones are ways to let thoughts float by.'),
    ],
    'Thoughts come and go like leaves. You get to stay on the bank.',
  ),
  5: story(
    'story-grounding',
    'bram',
    'Dropping anchor',
    'A three-step anchor for when feelings blow in like a storm.',
    [
      line('bram', 'Mind the raked lines. I’m Bram. I look after these stones.'),
      line('bram', 'Some days a feeling blows in like a storm. You can’t stop a storm. But a boat in a storm can drop anchor.'),
      line('pip', 'How do you drop anchor?'),
      line('bram', 'Three steps. Notice what’s here inside you. Slow down and feel your body — press your feet into the ground. Then look around: what can you see and hear?'),
      line('bram', 'The storm may keep blowing. Anchored, it can’t sweep you away.'),
      fact(
        'Dropping anchor',
        'It’s the first skill in the World Health Organization’s stress guide: notice, connect with your body, engage with the world. A course built on that guide eased distress in a large trial.',
        'WHO, Doing What Matters in Times of Stress, 2020; Tol et al., 2020',
      ),
      choice('bram', 'Which anchor is easiest for you to reach?', [
        ['My feet', 'Press them down and feel the floor push back. Works anywhere.'],
        ['My hands', 'Something cold, something textured — hands are great at noticing.'],
        ['My eyes', 'Name five things you can see. Slowly, one at a time.'],
        ['My breath', 'One long breath out. You know that one from Bo.'],
      ]),
      line('bram', 'Grounding isn’t about making the feeling go. It’s about keeping your footing while it’s here.'),
    ],
    'Anchored. Storms pass — the ground stays.',
  ),
  6: story(
    'story-kindness',
    'luma',
    'The kinder coach',
    'Why being kind to yourself keeps you going better than being harsh.',
    [
      line('luma', 'Hello, hello! I’m Luma. I light the lanterns on the lake.'),
      line('luma', 'Can I ask you something? When a friend has a hard day, what do you say to them?'),
      line('pip', 'Something warm. “That sounds hard. You’re doing okay.”'),
      line('luma', 'And when it’s you having the hard day?'),
      line('pip', '…Oh. Not that.'),
      line('luma', 'Most people are far harder on themselves than on anyone else. The harsh voice feels like it keeps us going. Mostly it wears us out.'),
      fact(
        'Kindness keeps you going',
        'In a set of experiments, people who met a setback with self-compassion tried harder to improve afterwards than people who were tough on themselves.',
        'Breines & Chen, Personality and Social Psychology Bulletin, 2012',
      ),
      line('luma', 'Self-compassion has three parts: noticing that it’s hard, remembering everyone struggles, and offering yourself some kindness.'),
      choice('luma', 'When things go wrong, your inner voice sounds most like…', [
        ['A strict coach', 'It’s trying to help, in its way. Here you’ll practise a warmer coach.'],
        ['A worried parent', 'Lots of care in there. You can keep the care and soften the worry.'],
        ['Not much at all', 'Sometimes the voice just goes quiet. A kind word can fill the gap.'],
        ['Pretty kind, actually', 'Lovely. This lake will help you keep it that way.'],
      ]),
      line('luma', 'Kindness works outward too — small kind acts for others lift you as well.'),
    ],
    'Lanterns are lit by small, kind things. You can light your own.',
  ),
  7: story(
    'story-rest',
    'dot',
    'How sleep likes to be invited',
    'What actually helps sleep come — from the people who study it.',
    [
      line('dot', '*yawn* Oh — hello. I’m Dot. I’m very good at sleeping.'),
      line('pip', 'Teach me!'),
      line('dot', 'Sleep can’t be forced. Trying hard to sleep keeps you awake. What you can do is set things up so sleep finds you.'),
      line('dot', 'The biggest one: wake at the same time every day. Your body clock sets itself from the morning.'),
      line('dot', 'Morning light helps too — a few minutes outside soon after you get up.'),
      line('dot', 'And if you’ve been lying awake a long while, get up. Somewhere dim, something quiet, back to bed when sleepy. Bed stays a place for sleeping.'),
      fact(
        'Write tomorrow down',
        'People who spent five minutes writing tomorrow’s to-do list at bedtime fell asleep faster than people who wrote about what they’d already done.',
        'Scullin et al., Journal of Experimental Psychology: General, 2018',
      ),
      choice('dot', 'What usually keeps you up?', [
        ['My thoughts', 'Put the day down on paper first — it gives the thoughts somewhere to wait.'],
        ['My phone', 'Try charging it outside the bedroom. Boring, and it works.'],
        ['Different bedtimes', 'Start with the same wake-up time. Bedtime tends to follow.'],
        ['Not tired yet', 'Go to bed when sleepy, not just when it’s late. That’s allowed.'],
      ]),
      line('dot', 'Rest in the daytime counts too. A pause isn’t wasted time — it’s refuelling.'),
    ],
    'Now you know how sleep likes to be invited. Sweet dreams, whenever they come.',
  ),
  8: story(
    'story-worry',
    'gus',
    'Two kinds of worry',
    'Sorting worries into the ones to plan for and the ones to let be.',
    [
      line('gus', 'Careful, it’s foggy up here. I’m Gus. I can’t see far either — I just watch the next step.'),
      line('pip', 'Doesn’t not knowing scare you?'),
      line('gus', 'It used to. Not knowing is uncomfortable. But you can carry discomfort and keep climbing.'),
      line('gus', 'Here’s a sorting trick. Worries come in two kinds.'),
      line('gus', 'Practical worries are about something real you can act on — an email to send, a bill to pay. Those get a plan.'),
      line('gus', 'What-if worries have no step to take right now. Those you can notice, name and let be — and come back to what you’re doing.'),
      fact(
        'A time for worry',
        'People who set aside one short worry time a day, and saved their worries for it, ended up worrying less overall.',
        'McGowan & Behar, Behavior Modification, 2013',
      ),
      choice('gus', 'Try one: “What if tomorrow’s meeting goes badly?” Which kind is it?', [
        ['Practical', 'Part of it is! Getting your notes ready is a step you can take today.'],
        ['What-if', 'The what-if part is. You can’t know tomorrow tonight — so it can wait.'],
        ['A bit of both', 'Exactly. Do the practical bit, let the what-if float. That’s the whole trick.'],
      ]),
      line('gus', 'And if a worry ever turns into a spiral, the Spiral Breaker is at the top of the path, and real people are on the phone any time.'),
    ],
    'Fog lifts in its own time. Until then — one step, then the next.',
  ),
  9: story(
    'story-steadiness',
    'sora',
    'Five ways to keep well',
    'The everyday habits that keep a mind steady, and how to start them.',
    [
      line('sora', 'You made it up! I’m Sora. Nice view, isn’t it?'),
      line('pip', 'Is this the end?'),
      line('sora', 'It’s a resting place. Steadiness isn’t a peak you reach once — it’s small things, done often.'),
      line('sora', 'There’s a well-known list of five: connect with people, be active, take notice, keep learning, and give.'),
      fact(
        'Five ways to wellbeing',
        'Drawn from a large review of the research, these five everyday actions are what the NHS recommends for looking after your mental wellbeing.',
        'New Economics Foundation, 2008; NHS',
      ),
      line('sora', 'And one more thing: do small things that matter to you, even before you feel like it. Often the feeling follows the doing.'),
      fact(
        'Doing comes first',
        'Planning small, meaningful activities into the week lifts mood — in many studies, about as much as talking therapies do.',
        'Behavioural activation — Ekers et al., PLOS ONE, 2014',
      ),
      choice('sora', 'Which of the five feels easiest this week?', [
        ['Connect', 'A message to one person counts. Short is fine.'],
        ['Be active', 'Ten minutes of walking is enough to feel a difference.'],
        ['Take notice', 'You’ve been practising that the whole way up.'],
        ['Keep learning', 'Something small and new — a recipe, a song, a word.'],
        ['Give', 'A small kindness — a thank-you, a hand with something.'],
      ]),
      line('sora', 'The last stones up here are about keeping it going, your way.'),
    ],
    'From up here you can see the whole path — and it’s yours to walk again.',
  ),
}

/** Each chapter's pack-your-kit stone, by chapter number. */
export const KIT_SESSIONS: Record<number, Session> = {
  1: kitStone(
    'kit-signs',
    'kiri',
    'signs',
    'Pack: my early signs',
    'Stress usually knocks quietly before it shouts. Knowing your signs means reaching for a tool sooner.',
    ['Last stone of the trailhead. Time to pack the first page of your kit.', 'Stress usually knocks quietly before it shouts. What are the knocks, for you?'],
    'Your kit has its first page. You can change it whenever you like, from the notebook.',
  ),
  2: kitStone(
    'kit-breath',
    'bo',
    'breath',
    'Pack: my breath',
    'One breath you trust, and when you’ll use it — so it’s there without thinking.',
    ['Which breath fitted you best? Pack it, and when you’ll reach for it.'],
    'A breath of your own, packed and ready.',
  ),
  3: kitStone(
    'kit-body',
    'tova',
    'body',
    'Pack: where I hold it',
    'Where stress settles in you, and what helps it loosen.',
    ['Two things to pack: where you hold stress, and what helps it let go.'],
    'Packed. Next time your shoulders creep up, you’ll know what to reach for.',
  ),
  4: kitStone(
    'kit-stories',
    'ollie',
    'stories',
    'Pack: names for my stories',
    'A name for your mind’s favourite story, and a line for unhooking.',
    ['Pack a name for the story your mind tells most — just the name, not the details.', 'And pick a line for unhooking, so the words are ready next time.'],
    'Now when that story starts, you can say its name and let it float.',
  ),
  5: kitStone(
    'kit-anchors',
    'bram',
    'anchors',
    'Pack: my anchors',
    'Your quickest ways back to the ground.',
    ['Pack your anchors — the quickest ways back to the ground when a feeling blows in.'],
    'Your anchors are packed. Storm days go better with them close.',
  ),
  6: kitStone(
    'kit-kind-words',
    'luma',
    'kind-words',
    'Pack: words for a hard moment',
    'The words you’d give a friend, kept for when you need them.',
    ['Pack some words — the ones you’d say to a friend in your spot.'],
    'Packed. Next hard moment, you won’t have to search for the words.',
  ),
  7: kitStone(
    'kit-wind-down',
    'dot',
    'wind-down',
    'Pack: my wind-down',
    'A few small steps for the evening, the same ones most nights.',
    ['Pack your wind-down: a few small things for the evening.'],
    'Your evening is packed. Same steps, most nights — your body learns them.',
  ),
  8: kitStone(
    'kit-heavy-day',
    'gus',
    'heavy-day',
    'Pack: my heavy-day plan',
    'A plan made while things are calmer, so heavy days have the thinking already done.',
    ['This page matters most: a plan for heavy days, made now while things are calmer.', 'In a hard moment it’s difficult to think clearly. A plan you made earlier does the thinking for you.'],
    'Packed, and close at hand. You don’t have to carry heavy days alone.',
    'Your plan also lives in Anytime, under “If it’s a lot right now”.',
  ),
  9: kitStone(
    'kit-matters',
    'sora',
    'matters',
    'Pack: what matters to me',
    'What you care about, and one small step toward it this week.',
    ['Last page. What matters to you — and one small step toward it this week.'],
    'That’s the last page. Your kit is a map of what works for you — open it whenever you need it.',
  ),
}
