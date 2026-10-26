export type ProjectStage = 'planned' | 'in-progress' | 'completed'

export interface ProjectMilestone {
  label: string
  stage: ProjectStage
  date: string
}

export interface ProjectMedia {
  id: string
  url: string
  filename: string
  mimeType: string
  description: string
  file?: File
  uploadProgress?: number
}

export interface ProjectUpdate {
  id: string
  title: string
  description: string
  createdAt: string
  stage: ProjectStage
  attachments: ProjectMedia[]
}

export interface Project {
  id: string
  makerId: string
  slug?: string
  ownerProfileSlug?: string
  title: string
  category: string
  location: string
  description: string
  image: string
  imageAlt: string
  ownerName?: string
  ownerCraft?: string
  ownerLocation?: string
  ownerBio?: string
  attachments?: ProjectMedia[]
  updates?: ProjectUpdate[]
  status: 'draft' | 'published'
  stage: ProjectStage
  visibility?: 'private' | 'public' | 'client_only'
  includeContact?: boolean
  contactOptions?: ContactOptions
  milestones: ProjectMilestone[]
}

export interface ContactOptions {
  email?: string
  phone?: string
  whatsapp?: string
}

export interface Maker {
  id: string
  name: string
  craft: string
  location: string
  bio: string
  initials: string
  avatarUrl?: string
  contactOptions?: ContactOptions
}

export const SAMPLE_MAKERS: Maker[] = [
  {
    id: 'adaeze',
    name: 'Adaeze Nwosu',
    craft: 'Ceramics',
    location: 'Yaba, Lagos',
    bio: 'Small-batch tableware made slowly, with a focus on useful forms and quiet glazes.',
    initials: 'AN',
    contactOptions: {
      email: 'adaeze@example.test',
      phone: '+234 800 000 0000',
      whatsapp: '+234 800 000 0000',
    },
  },
  {
    id: 'chidi',
    name: 'Chidi Okafor',
    craft: 'Woodwork',
    location: 'Surulere, Lagos',
    bio: 'Furniture and workshop pieces built for everyday use, repaired when they can be.',
    initials: 'CO',
    contactOptions: {
      email: 'chidi@example.test',
      phone: '+234 800 000 0000',
      whatsapp: '+234 800 000 0000',
    },
  },
  {
    id: 'zainab',
    name: 'Zainab Bello',
    craft: 'Upholstery',
    location: 'Lekki, Lagos',
    bio: 'Furniture restoration and upholstery, keeping good frames in use for longer.',
    initials: 'ZB',
    contactOptions: {
      email: 'zainab@example.test',
      phone: '+234 800 000 0000',
      whatsapp: '+234 800 000 0000',
    },
  },
]

export const SAMPLE_PROJECTS: Project[] = [
  {
    id: 'stoneware-table',
    makerId: 'adaeze',
    title: 'Tableware for a slow Sunday',
    category: 'Ceramics',
    location: 'Yaba, Lagos',
    description: 'A set of everyday serving pieces shaped by hand, finished in a soft blue glaze, and made to be used often.',
    image: '/images/ceramics.jpg',
    imageAlt: 'Handmade blue and dark ceramic plates arranged on a wooden shelf',
    status: 'published',
    stage: 'completed',
    includeContact: true,
    contactOptions: SAMPLE_MAKERS[0].contactOptions,
    milestones: [
      { label: 'Shapes and clay chosen', stage: 'planned', date: '12 March 2026' },
      { label: 'Pieces thrown and trimmed', stage: 'in-progress', date: '18 March 2026' },
      { label: 'Glazed and ready to use', stage: 'completed', date: '26 March 2026' },
    ],
  },
  {
    id: 'bench-wall',
    makerId: 'chidi',
    title: 'A tool wall built around the bench',
    category: 'Woodwork',
    location: 'Surulere, Lagos',
    description: 'A compact workshop wall organized around the tools used every day, with a place for each one close to the bench.',
    image: '/images/woodshop.jpg',
    imageAlt: 'Hand tools arranged in a well-used workshop',
    status: 'published',
    stage: 'in-progress',
    includeContact: true,
    contactOptions: SAMPLE_MAKERS[1].contactOptions,
    milestones: [
      { label: 'Measured the work wall', stage: 'planned', date: '4 April 2026' },
      { label: 'Built and fitted the tool rack', stage: 'in-progress', date: '14 April 2026' },
    ],
  },
  {
    id: 'family-sofa',
    makerId: 'zainab',
    title: 'A family sofa, given another life',
    category: 'Upholstery',
    location: 'Lekki, Lagos',
    description: 'The original frame was sound, so the work focused on new seat support, careful repairs, and a durable green cover.',
    image: '/images/upholstery.jpg',
    imageAlt: 'Restored deep-green sofa with clean upholstery and a solid wood frame',
    status: 'published',
    stage: 'completed',
    includeContact: true,
    contactOptions: SAMPLE_MAKERS[2].contactOptions,
    milestones: [
      { label: 'Frame assessed with the owner', stage: 'planned', date: '7 February 2026' },
      { label: 'Seat support repaired', stage: 'in-progress', date: '11 February 2026' },
      { label: 'New cover fitted', stage: 'completed', date: '19 February 2026' },
    ],
  },
]
