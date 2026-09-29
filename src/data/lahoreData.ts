export interface SpokenPhrase {
  id: string;
  category: 'greetings' | 'business' | 'creative' | 'casual' | 'announcements' | 'support';
  english: string;
  phoneticHint: string;
  contextTip: string;
  recommendedVoice: 'Kore' | 'Puck' | 'Fenrir' | 'Zephyr' | 'Charon';
}

export interface VoiceShowcaseDemo {
  id: string;
  title: string;
  category: string;
  tagline: string;
  description: string;
  spokenTourScript: string;
  recommendedVoice: 'Kore' | 'Puck' | 'Fenrir' | 'Zephyr' | 'Charon';
  audioStyle: string;
}

export const VOICE_PROFILES = [
  {
    id: 'Kore',
    name: 'Kore',
    initial: 'K',
    subLabel: 'Female Voice',
    gender: 'Female',
    description: 'Warm, calm and soothing voice — ideal for natural guides and narrations',
    tag: 'Popular',
    avatar: '/src/assets/images/avatar_female_kore_1790654233509.jpg',
  },
  {
    id: 'Puck',
    name: 'Puck',
    initial: 'P',
    subLabel: 'Male Voice',
    gender: 'Male',
    description: 'Vibrant, energetic and cheerful — great for podcasts, games and dynamic audio',
    tag: 'Energetic',
    avatar: '/src/assets/images/avatar_male_puck_1790654245147.jpg',
  },
  {
    id: 'Zephyr',
    name: 'Zephyr',
    initial: 'Z',
    subLabel: 'Neutral / Clear',
    gender: 'Neutral',
    description: 'Crisp, modern and articulate — optimal for announcements, tutorials and UI prompts',
    tag: 'Straightforward',
    avatar: '/src/assets/images/avatar_female_zephyr_1790654257178.jpg',
  },
  {
    id: 'Fenrir',
    name: 'Fenrir',
    initial: 'F',
    subLabel: 'Male Voice',
    gender: 'Male',
    description: 'Deep, resonant and authoritative — perfect for documentaries and dramatic trailers',
    tag: 'Serious',
    avatar: '/src/assets/images/avatar_male_fenrir_1790654270382.jpg',
  },
  {
    id: 'Charon',
    name: 'Charon',
    initial: 'C',
    subLabel: 'Male Voice',
    gender: 'Male',
    description: 'Reflective, steady and cinematic — captivating for audiobooks and historical stories',
    tag: 'Narrative',
    avatar: '/src/assets/images/avatar_male_charon_1790654285051.jpg',
  },
];

export const STYLE_PRESETS = [
  {
    id: 'warm',
    icon: 'Sun',
    titleBn: 'Warm & Friendly',
    subtitleEn: '(Natural Guide)',
    value: 'Warm, natural, cheerful and friendly tone with clear articulation and welcoming cadence',
  },
  {
    id: 'storyteller',
    icon: 'Landmark',
    titleBn: 'Storyteller',
    subtitleEn: '(Narrative)',
    value: 'Rich, cinematic, expressive and captivating storytelling tone with dramatic pacing',
  },
  {
    id: 'local',
    icon: 'Car',
    titleBn: 'Conversational',
    subtitleEn: '(Daily Casual)',
    value: 'Authentic, approachable everyday conversational voice with natural inflections',
  },
  {
    id: 'slow',
    icon: 'Volume2',
    titleBn: 'Slow & Clear',
    subtitleEn: '(Articulate)',
    value: 'Very clear, measured, well-paced pronunciation for easy listening and comprehension',
  },
];

export const QUICK_PROMPTS = [
  'Welcome to VoiceMack! Experience the next generation of realistic speech synthesis.',
  'The future of voice technology brings natural pacing, emotional nuances, and studio-grade audio.',
  'Good morning everyone! In today’s episode, we explore the groundbreaking frontiers of artificial intelligence.',
  'Please note that the boarding gate has now opened. Kindly have your passport and boarding pass ready.',
  'Thank you for reaching out to customer support. It is an absolute pleasure to assist you today.',
];

export const LAHORE_PHRASES: SpokenPhrase[] = [
  // Greetings
  {
    id: 'gr-1',
    category: 'greetings',
    english: 'Hello and welcome! It is wonderful to meet you today.',
    phoneticHint: 'Warm & inviting greeting',
    contextTip: 'Great for video intros, welcoming guests, and friendly interactions.',
    recommendedVoice: 'Kore',
  },
  {
    id: 'gr-2',
    category: 'greetings',
    english: 'Hey there everyone! How is your day going so far?',
    phoneticHint: 'Casual & upbeat check-in',
    contextTip: 'Ideal for social media content, live streams, and community announcements.',
    recommendedVoice: 'Puck',
  },
  {
    id: 'gr-3',
    category: 'greetings',
    english: 'Good day, ladies and gentlemen. Thank you for joining us.',
    phoneticHint: 'Formal & respectful opening',
    contextTip: 'Recommended for corporate events, formal presentations, and keynote intros.',
    recommendedVoice: 'Fenrir',
  },

  // Business & Work
  {
    id: 'bz-1',
    category: 'business',
    english: 'Let’s review the key quarterly metrics and summarize the action items.',
    phoneticHint: 'Executive & structured tone',
    contextTip: 'Suitable for business presentations, quarterly reports, and executive memos.',
    recommendedVoice: 'Zephyr',
  },
  {
    id: 'bz-2',
    category: 'business',
    english: 'Our goal this year is to drive customer satisfaction and seamless collaboration.',
    phoneticHint: 'Strategic & motivational',
    contextTip: 'Perfect for mission statements, company-wide meetings, and leadership talks.',
    recommendedVoice: 'Fenrir',
  },
  {
    id: 'bz-3',
    category: 'business',
    english: 'I have shared the project timeline and milestones in your inbox.',
    phoneticHint: 'Professional & courteous notification',
    contextTip: 'Use for automated workflow notifications, emails, and CRM updates.',
    recommendedVoice: 'Zephyr',
  },

  // Creative & Podcasts
  {
    id: 'cr-1',
    category: 'creative',
    english: 'Deep in the heart of the ancient forest, a quiet mystery began to unfold.',
    phoneticHint: 'Mysterious & cinematic storytelling',
    contextTip: 'Captivating for audiobook narrations, bedtime stories, and cinematic trailers.',
    recommendedVoice: 'Charon',
  },
  {
    id: 'cr-2',
    category: 'creative',
    english: 'Welcome back to the Creative Mind Podcast! Today we dive into the art of design.',
    phoneticHint: 'Dynamic & enthusiastic host',
    contextTip: 'Ideal for podcast intros, YouTube videos, and creative discussions.',
    recommendedVoice: 'Puck',
  },
  {
    id: 'cr-3',
    category: 'creative',
    english: 'Take a deep breath in, gently close your eyes, and allow your mind to settle.',
    phoneticHint: 'Serene, rhythmic & meditative',
    contextTip: 'Perfect for meditation apps, sleep stories, and wellness guides.',
    recommendedVoice: 'Kore',
  },

  // Casual & Daily
  {
    id: 'cs-1',
    category: 'casual',
    english: 'Could you please pass me the menu? Everything looks delicious!',
    phoneticHint: 'Friendly dining conversation',
    contextTip: 'Useful for language learning apps, dialogue exercises, and daily roleplay.',
    recommendedVoice: 'Kore',
  },
  {
    id: 'cs-2',
    category: 'casual',
    english: 'That sounds like a fantastic plan! Count me in for this weekend.',
    phoneticHint: 'Enthusiastic agreement',
    contextTip: 'Great for interactive conversational bots and casual dialogues.',
    recommendedVoice: 'Puck',
  },

  // Announcements
  {
    id: 'an-1',
    category: 'announcements',
    english: 'Attention all passengers: Train number forty-two is now arriving on platform three.',
    phoneticHint: 'Clear, crisp transit announcement',
    contextTip: 'Optimal for public address systems, transit audio, and airport notifications.',
    recommendedVoice: 'Zephyr',
  },
  {
    id: 'an-2',
    category: 'announcements',
    english: 'Please be reminded that the library will be closing in fifteen minutes.',
    phoneticHint: 'Polite & informative public broadcast',
    contextTip: 'Useful for venue broadcasts, educational campuses, and facilities.',
    recommendedVoice: 'Zephyr',
  },

  // Support & Help
  {
    id: 'sp-1',
    category: 'support',
    english: 'Your security verification code is four, nine, two, eight, one.',
    phoneticHint: 'Deliberate & distinct digits',
    contextTip: 'Essential for two-factor authentication calls and automated IVR phone systems.',
    recommendedVoice: 'Zephyr',
  },
  {
    id: 'sp-2',
    category: 'support',
    english: 'We have successfully updated your account settings. Have a wonderful day!',
    phoneticHint: 'Reassuring & polite customer care',
    contextTip: 'Great for customer support bots, post-purchase confirmations, and helpdesks.',
    recommendedVoice: 'Kore',
  },
];

export const LAHORE_ATTRACTIONS: VoiceShowcaseDemo[] = [
  {
    id: 'deep-space',
    title: 'The Secrets of Deep Space',
    category: 'Documentary & Sci-Fi',
    tagline: 'A cinematic journey beyond the stars and distant galaxies',
    description:
      'Explore the outer boundaries of the cosmos where newborn stars ignite and ancient nebulae dance in the silence of deep space. Perfect for high-production documentaries and science podcasts.',
    spokenTourScript:
      'Beyond the outer perimeter of our solar system lies a vast, silent expanse of starlight and mystery. Billions of light-years away, colossal galaxies spin like glowing jewels in the darkness, each holding untold worlds waiting to be discovered.',
    recommendedVoice: 'Fenrir',
    audioStyle: 'Deep, cinematic, atmospheric and awe-inspiring documentary narration',
  },
  {
    id: 'whispering-forest',
    title: 'The Whispering Forest',
    category: 'Audiobook & Fantasy',
    tagline: 'An enchanting tale of ancient magic and hidden realms',
    description:
      'Immerse listeners in a richly textured fantasy realm with organic pauses, subtle vocal inflections, and immersive storytelling.',
    spokenTourScript:
      'As dusk fell over the valley, an emerald mist drifted between the ancient pines. Legend spoke of an old library hidden within the hollowed trunks, where forgotten tales whispered to those patient enough to listen.',
    recommendedVoice: 'Charon',
    audioStyle: 'Rich, measured, immersive and captivating storytelling voice',
  },
  {
    id: 'morning-mindset',
    title: 'Morning Mindset & Meditation',
    category: 'Wellness & Mindfulness',
    tagline: 'Gentle, soothing guidance to start your day with clarity',
    description:
      'A warm, serene voice persona specifically configured to slow heart rates, ease tension, and guide listeners toward focused calm.',
    spokenTourScript:
      'Welcome to this peaceful morning session. Take a slow, grounding breath in through your nose, pause for a moment, and gently let it go. Today is a fresh canvas, full of quiet potential and calm focus.',
    recommendedVoice: 'Kore',
    audioStyle: 'Calm, gentle, rhythmic and warm mindfulness guide',
  },
  {
    id: 'tech-innovation',
    title: 'Next-Gen Voice Intelligence',
    category: 'Tech Keynote & Product',
    tagline: 'Crisp, authoritative presentation of breakthrough technology',
    description:
      'Clear, articulate, and confident delivery tailored for technology announcements, product launch demos, and corporate presentations.',
    spokenTourScript:
      'Today, we are thrilled to introduce a transformative leap in speech synthesis. By combining advanced acoustic modeling with contextual understanding, voices now speak with genuine nuance, natural breath, and emotional realism.',
    recommendedVoice: 'Zephyr',
    audioStyle: 'Crisp, confident, articulate and modern keynote speaker',
  },
  {
    id: 'creative-podcast',
    title: 'The Creative Pulse Podcast',
    category: 'Podcast & Media',
    tagline: 'High-energy, engaging banter for modern digital creators',
    description:
      'An enthusiastic, upbeat host persona that keeps audiences entertained, engaged, and leaning in for the next insight.',
    spokenTourScript:
      'What is up, creative minds! Welcome back to another high-energy episode. Today we are unpacking how independent creators are leveraging cutting-edge audio tools to build global audiences from their bedrooms.',
    recommendedVoice: 'Puck',
    audioStyle: 'Energetic, upbeat, dynamic and friendly podcast host',
  },
  {
    id: 'silk-road',
    title: 'Chronicles of the Ancient World',
    category: 'History & Culture',
    tagline: 'Echoes of trade, art, and philosophy through the ages',
    description:
      'A timeless, cultured voice capturing the grand tapestry of human civilization, philosophy, and architectural wonder.',
    spokenTourScript:
      'For centuries, caravans laden with silk, spices, and precious jade traversed mountain passes and desert sands, carrying not merely goods, but the shared ideas, poetry, and discoveries that built our modern world.',
    recommendedVoice: 'Charon',
    audioStyle: 'Reflective, historical, wise and cinematic narration',
  },
];
