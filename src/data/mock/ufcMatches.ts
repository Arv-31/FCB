import type { UFCMatchDetail } from '@/types'
import { DEMO_SOURCE } from './helpers'

/**
 * DEMO DATA — fictional fights on fictional "Demo" cards.
 * Round-by-round stats must add up to fight totals (checked by `npm run validate:data`).
 */
export const ufcDetails: UFCMatchDetail[] = [
  {
    id: 'ufc-demo-2026-06-27-makhachev-oliveira',
    sport: 'ufc',
    date: '2026-06-27',
    competition: 'UFC Demo Fight Night 2',
    stage: 'Lightweight · Title fight',
    venue: { name: 'T-Mobile Arena', city: 'Las Vegas', country: 'USA' },
    competitorIds: ['makhachev', 'oliveira'],
    score: null,
    result: { outcome: 'win', winnerId: 'makhachev', text: 'Makhachev def. Oliveira — Unanimous decision (49–46, 49–46, 48–47)' },
    source: DEMO_SOURCE,
    hasDetail: true,
    stats: {
      event: 'UFC Demo Fight Night 2',
      weightClass: 'Lightweight (155 lb)',
      titleFight: true,
      scheduledRounds: 5,
      method: 'Decision (Unanimous)',
      endRound: 5,
      endTime: '5:00',
      referee: 'M. Delgado (demo)',
      totals: [
        { sigStrikes: { landed: 69, attempted: 154 }, totalStrikes: { landed: 112, attempted: 201 }, takedowns: { landed: 4, attempted: 9 }, submissionAttempts: 0, knockdowns: 1, controlTime: '8:48' },
        { sigStrikes: { landed: 63, attempted: 155 }, totalStrikes: { landed: 81, attempted: 176 }, takedowns: { landed: 0, attempted: 2 }, submissionAttempts: 3, knockdowns: 0, controlTime: '1:05' },
      ],
      rounds: [
        { round: 1, fighters: [
          { sigStrikes: { landed: 14, attempted: 31 }, takedowns: { landed: 1, attempted: 2 }, submissionAttempts: 0, knockdowns: 0, controlTime: '2:10' },
          { sigStrikes: { landed: 11, attempted: 29 }, takedowns: { landed: 0, attempted: 0 }, submissionAttempts: 0, knockdowns: 0, controlTime: '0:00' },
        ] },
        { round: 2, fighters: [
          { sigStrikes: { landed: 18, attempted: 40 }, takedowns: { landed: 0, attempted: 1 }, submissionAttempts: 0, knockdowns: 1, controlTime: '0:45' },
          { sigStrikes: { landed: 13, attempted: 34 }, takedowns: { landed: 0, attempted: 1 }, submissionAttempts: 0, knockdowns: 0, controlTime: '0:00' },
        ] },
        { round: 3, fighters: [
          { sigStrikes: { landed: 9, attempted: 22 }, takedowns: { landed: 0, attempted: 0 }, submissionAttempts: 0, knockdowns: 0, controlTime: '0:20' },
          { sigStrikes: { landed: 21, attempted: 45 }, takedowns: { landed: 0, attempted: 1 }, submissionAttempts: 2, knockdowns: 0, controlTime: '1:05' },
        ] },
        { round: 4, fighters: [
          { sigStrikes: { landed: 16, attempted: 33 }, takedowns: { landed: 2, attempted: 3 }, submissionAttempts: 0, knockdowns: 0, controlTime: '3:02' },
          { sigStrikes: { landed: 8, attempted: 21 }, takedowns: { landed: 0, attempted: 0 }, submissionAttempts: 1, knockdowns: 0, controlTime: '0:00' },
        ] },
        { round: 5, fighters: [
          { sigStrikes: { landed: 12, attempted: 28 }, takedowns: { landed: 1, attempted: 3 }, submissionAttempts: 0, knockdowns: 0, controlTime: '2:31' },
          { sigStrikes: { landed: 10, attempted: 26 }, takedowns: { landed: 0, attempted: 0 }, submissionAttempts: 0, knockdowns: 0, controlTime: '0:00' },
        ] },
      ],
      scorecards: [
        { judge: 'Judge A (demo)', scores: [49, 46] },
        { judge: 'Judge B (demo)', scores: [49, 46] },
        { judge: 'Judge C (demo)', scores: [48, 47] },
      ],
      bonuses: ['Fight of the Night'],
      records: { before: ['26-1-0', '34-10-0'], after: ['27-1-0', '34-11-0'] },
      keyMoments: [
        { round: 1, time: '1:20', type: 'takedown', fighterId: 'makhachev', text: 'Makhachev completes his first takedown and controls against the fence.' },
        { round: 2, time: '3:41', type: 'knockdown', fighterId: 'makhachev', text: 'A counter left hand drops Oliveira, who recovers to survive the round.', major: true },
        { round: 3, time: '2:12', type: 'submission-attempt', fighterId: 'oliveira', text: 'Oliveira jumps on a guillotine in a scramble.' },
        { round: 3, time: '2:58', type: 'submission-attempt', fighterId: 'oliveira', text: 'Second guillotine attempt — Makhachev escapes. Oliveira takes the round.', major: true },
        { round: 4, time: '0:48', type: 'takedown', fighterId: 'makhachev', text: 'Makhachev chains a takedown and holds top position for most of the round.', major: true },
        { round: 5, time: '1:10', type: 'takedown', fighterId: 'makhachev', text: 'Late takedown secures the final round.' },
      ],
    },
  },
  {
    id: 'ufc-demo-2025-02-15-makhachev-oliveira',
    sport: 'ufc',
    date: '2025-02-15',
    competition: 'UFC Demo Fight Night 1',
    stage: 'Lightweight · Title fight',
    venue: { name: 'Etihad Arena', city: 'Abu Dhabi', country: 'UAE' },
    competitorIds: ['makhachev', 'oliveira'],
    score: null,
    result: { outcome: 'win', winnerId: 'oliveira', text: 'Oliveira def. Makhachev — Submission (rear-naked choke), R1 4:02' },
    source: DEMO_SOURCE,
    hasDetail: true,
    stats: {
      event: 'UFC Demo Fight Night 1',
      weightClass: 'Lightweight (155 lb)',
      titleFight: true,
      scheduledRounds: 5,
      method: 'Submission',
      methodDetail: 'Rear-naked choke',
      endRound: 1,
      endTime: '4:02',
      totals: [
        { sigStrikes: { landed: 9, attempted: 20 }, totalStrikes: { landed: 15, attempted: 27 }, takedowns: { landed: 1, attempted: 1 }, submissionAttempts: 0, knockdowns: 0, controlTime: '1:40' },
        { sigStrikes: { landed: 12, attempted: 24 }, totalStrikes: { landed: 22, attempted: 36 }, takedowns: { landed: 0, attempted: 0 }, submissionAttempts: 1, knockdowns: 0, controlTime: '1:02' },
      ],
      rounds: [
        { round: 1, fighters: [
          { sigStrikes: { landed: 9, attempted: 20 }, takedowns: { landed: 1, attempted: 1 }, submissionAttempts: 0, knockdowns: 0, controlTime: '1:40' },
          { sigStrikes: { landed: 12, attempted: 24 }, takedowns: { landed: 0, attempted: 0 }, submissionAttempts: 1, knockdowns: 0, controlTime: '1:02' },
        ] },
      ],
      bonuses: ['Performance of the Night — Oliveira'],
      keyMoments: [
        { round: 1, time: '1:05', type: 'takedown', fighterId: 'makhachev', text: 'Makhachev lands an early single-leg takedown.' },
        { round: 1, time: '2:50', type: 'note', fighterId: 'oliveira', text: 'Oliveira reverses in a scramble and takes the back.', major: true },
        { round: 1, time: '4:02', type: 'finish', fighterId: 'oliveira', text: 'Rear-naked choke locked in — Makhachev taps.', major: true },
      ],
    },
  },
]
