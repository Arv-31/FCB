import type { Competitor } from '@/types'

/**
 * DEMO competitor directory. Team/fighter names are real so search works,
 * but every match in /data/mock is fictional demonstration data.
 */
export const mockCompetitors: Competitor[] = [
  // Cricket
  {
    id: 'ind', sport: 'cricket', kind: 'team', name: 'India', shortName: 'IND', country: 'India',
    aliases: ['ind', 'bharat', 'team india', 'men in blue', 'india cricket'],
    colors: { primary: '#2563eb', secondary: '#f97316' },
  },
  {
    id: 'aus', sport: 'cricket', kind: 'team', name: 'Australia', shortName: 'AUS', country: 'Australia',
    aliases: ['aus', 'aussies', 'australia cricket', 'baggy greens'],
    colors: { primary: '#eab308', secondary: '#15803d' },
  },
  {
    id: 'eng', sport: 'cricket', kind: 'team', name: 'England', shortName: 'ENG', country: 'England',
    aliases: ['eng', 'three lions cricket', 'england cricket'],
    colors: { primary: '#1e40af', secondary: '#dc2626' },
  },

  // Football
  {
    id: 'rma', sport: 'football', kind: 'team', name: 'Real Madrid', shortName: 'RMA', country: 'Spain',
    aliases: ['real', 'madrid', 'real madrid cf', 'rm', 'los blancos', 'rmcf'],
    colors: { primary: '#f8fafc', secondary: '#7c3aed' },
    externalIds: { footballData: '86' },
  },
  {
    id: 'fcb', sport: 'football', kind: 'team', name: 'Barcelona', shortName: 'BAR', country: 'Spain',
    aliases: ['barca', 'barça', 'fc barcelona', 'fcb', 'blaugrana', 'bar'],
    colors: { primary: '#a50044', secondary: '#004d98' },
    externalIds: { footballData: '81' },
  },
  {
    id: 'mun', sport: 'football', kind: 'team', name: 'Manchester United', shortName: 'MUN', country: 'England',
    aliases: ['man utd', 'man united', 'mufc', 'united', 'man u', 'red devils'],
    colors: { primary: '#da291c', secondary: '#fbe122' },
    externalIds: { footballData: '66' },
  },
  {
    id: 'liv', sport: 'football', kind: 'team', name: 'Liverpool', shortName: 'LIV', country: 'England',
    aliases: ['lfc', 'liverpool fc', 'the reds', 'pool'],
    colors: { primary: '#c8102e', secondary: '#00b2a9' },
    externalIds: { footballData: '64' },
  },

  // UFC
  {
    id: 'makhachev', sport: 'ufc', kind: 'fighter', name: 'Islam Makhachev', shortName: 'Makhachev', country: 'Russia',
    aliases: ['islam', 'makhachev', 'makachev', 'makhachov'],
    colors: { primary: '#dc2626', secondary: '#111827' },
  },
  {
    id: 'oliveira', sport: 'ufc', kind: 'fighter', name: 'Charles Oliveira', shortName: 'Oliveira', country: 'Brazil',
    aliases: ['charles', 'oliveira', 'do bronx', 'charles do bronx', 'olivera'],
    colors: { primary: '#16a34a', secondary: '#facc15' },
  },
  {
    id: 'tsarukyan', sport: 'ufc', kind: 'fighter', name: 'Arman Tsarukyan', shortName: 'Tsarukyan', country: 'Armenia',
    aliases: ['arman', 'tsarukyan', 'ahalkalakets'],
    colors: { primary: '#ea580c', secondary: '#1d4ed8' },
  },
]
