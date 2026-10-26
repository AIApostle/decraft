import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FolderSimple, GearSix, House, LockKey, PencilSimple, Plus, SignOut, UserCircle } from '@phosphor-icons/react'
import { SAMPLE_MAKERS, SAMPLE_PROJECTS, type Maker, type Project, type ProjectMedia, type ProjectStage, type ProjectUpdate } from './data/sampleData'
import { ApiError, getCurrentUser, logIn, logOut, signUp, type AuthUser } from './lib/authApi'
import {
  createProject,
  createProjectUpdate,
  getProject,
  getPublicProfile,
  getPublicProject,
  getProfileSettings,
  listDiscoverProjects,
  listProjects,
  publishProject,
  removeProjectMedia,
  updateProfileSettings,
  updateProject,
  uploadProfileAvatar,
  uploadProjectMedia,
  type PublicMakerProfile,
} from './lib/projectsApi'
import { LoginPage, SignUpPage } from './pages/AuthPages'
import './App.css'

type View =
  | 'home'
  | 'how'
  | 'discover'
  | 'portfolio'
  | 'project'
  | 'public-profile'
  | 'public-project'
  | 'dashboard'
  | 'profile'
  | 'settings'
  | 'project-space'
  | 'workspace'
  | 'review'
  | 'login'
  | 'signup'
  | 'not-found'
type AuthStatus = 'loading' | 'signed-out' | 'signed-in' | 'error'
type ProfileDetails = {
  slug: string
  craft: string
  location: string
  bio: string
  isPublic: boolean
  contactEmail: string
  contactPhone: string
  contactWhatsapp: string
  showContactOnProfile: boolean
  avatarUrl: string
}

const currentMaker = SAMPLE_MAKERS[0]
const craftOptions = [
  'Ceramics',
  'Furniture',
  'Woodwork',
  'Textiles',
  'Jewellery',
  'Metalwork',
  'Leatherwork',
  'Painting',
  'Photography',
  'Repairs',
]
const locationOptions = [
  'Lagos',
  'Abuja',
  'Ibadan',
  'Port Harcourt',
  'Kano',
  'Enugu',
  'Benin City',
  'Kaduna',
  'Lekki',
  'Yaba',
]

function SuggestedChoiceField({
  label,
  value,
  options,
  onChange,
  placeholder,
  required = false,
  maxLength,
}: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
  placeholder: string
  required?: boolean
  maxLength: number
}) {
  const fieldId = useId()
  const inputId = `${fieldId}-value`

  return (
    <div className="project-form-choice">
      <label htmlFor={inputId}>{label}</label>
      <select
        aria-label={`${label} suggestions`}
        value={options.includes(value) ? value : value ? 'other' : ''}
        onChange={(event) => {
          const nextValue = event.target.value
          onChange(nextValue === 'other' ? '' : nextValue)
        }}
      >
        <option value="">Choose a suggestion</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
        <option value="other">Other — type your own below</option>
      </select>
      <input
        id={inputId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        maxLength={maxLength}
        placeholder={placeholder}
        aria-describedby={`${fieldId}-help`}
      />
      <small id={`${fieldId}-help`}>Choose a suggestion or type a name of your own.</small>
    </div>
  )
}

function makerForProject(project: Project): Maker {
  const name = project.ownerName ?? 'Maker'
  const sampleMaker = SAMPLE_MAKERS.find((maker) => maker.id === project.makerId)
  return {
    id: project.makerId,
    name,
    craft: project.ownerCraft ?? project.category,
    location: project.ownerLocation ?? project.location,
    bio: project.ownerBio ?? '',
    initials: name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toLocaleUpperCase(),
    contactOptions: project.contactOptions ?? sampleMaker?.contactOptions,
  }
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="icon-arrow">
      <path d="M3.5 10h12m-5-5 5 5-5 5" />
    </svg>
  )
}

function BrandMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 36 36" className="brand-mark">
      <path d="M6 27V9l12 10L30 9v18" />
      <path d="M6 27h24" />
    </svg>
  )
}

function createProjectMedia(files: File[], urlRegistry: string[]): ProjectMedia[] {
  return files
    .filter((file) => file.type.startsWith('image/') || file.type.startsWith('video/'))
    .map((file) => {
      const url = URL.createObjectURL(file)
      urlRegistry.push(url)
      return {
        id: crypto.randomUUID(),
        file,
        url,
        filename: file.name,
        mimeType: file.type,
        description: '',
      }
    })
}

function groupUpdatesByDay(updates: ProjectUpdate[]) {
  const groups = new Map<string, { label: string; updates: ProjectUpdate[] }>()
  const orderedUpdates = [...updates].sort(
    (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
  )

  for (const update of orderedUpdates) {
    const date = new Date(update.createdAt)
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
    const group = groups.get(key)
    if (group) {
      group.updates.push(update)
      continue
    }
    groups.set(key, {
      label: new Intl.DateTimeFormat(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(date),
      updates: [update],
    })
  }

  return [...groups.entries()].map(([key, group]) => ({ key, ...group }))
}

function formatUpdateTime(date: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(date))
}

function viewForPath(pathname: string): View {
  if (pathname === '/') return 'home'
  if (pathname === '/how-it-works') return 'home'
  if (pathname === '/find-work' || pathname === '/app/find-work') return 'discover'
  if (/^\/(?:portfolio|app\/makers)\/[^/]+$/.test(pathname)) return 'portfolio'
  if (/^\/(?:project|app\/discovery\/projects)\/[^/]+$/.test(pathname)) return 'project'
  if (/^\/@[^/]+\/[^/]+$/.test(pathname)) return 'public-project'
  if (/^\/@[^/]+$/.test(pathname)) return 'public-profile'
  if (pathname === '/app') return 'dashboard'
  if (pathname === '/app/profile') return 'profile'
  if (pathname === '/app/settings') return 'settings'
  if (pathname === '/app/projects/new') return 'workspace'
  if (/^\/app\/projects\/[^/]+$/.test(pathname)) return 'project-space'
  if (pathname === '/app/review' || /^\/app\/projects\/[^/]+\/review$/.test(pathname)) return 'review'
  if (pathname === '/login') return 'login'
  if (pathname === '/signup') return 'signup'
  return 'not-found'
}

function App() {
  const routeLocation = useLocation()
  const routerNavigate = useNavigate()
  const view = viewForPath(routeLocation.pathname)
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading')
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [discoveryProjects, setDiscoveryProjects] = useState<Project[]>([])
  const [discoveryLoaded, setDiscoveryLoaded] = useState(false)
  const [publicRouteResult, setPublicRouteResult] = useState<{
    pathname: string
    profile?: PublicMakerProfile
    project?: Project
    error?: string
  } | null>(null)
  const [loadedProjectsUserId, setLoadedProjectsUserId] = useState<string | null>(null)
  const [projectsError, setProjectsError] = useState('')
  const [profileLoading, setProfileLoading] = useState(true)
  const [savingProject, setSavingProject] = useState(false)
  const [draftProjectId, setDraftProjectId] = useState<string | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [selectedMakerId, setSelectedMakerId] = useState('')
  const [announcement, setAnnouncement] = useState('')
  const [search, setSearch] = useState('')
  const [location, setLocation] = useState('')
  const [category, setCategory] = useState('All crafts')
  const [draftTitle, setDraftTitle] = useState('')
  const [draftDescription, setDraftDescription] = useState('')
  const [draftStage, setDraftStage] = useState<ProjectStage>('planned')
  const [draftVisibility, setDraftVisibility] = useState<'private' | 'public'>('public')
  const [draftIncludeContact, setDraftIncludeContact] = useState(false)
  const [draftCategory, setDraftCategory] = useState('')
  const [draftLocation, setDraftLocation] = useState('')
  const [draftAttachments, setDraftAttachments] = useState<ProjectMedia[]>([])
  const [profileDetails, setProfileDetails] = useState<ProfileDetails>({
    slug: '',
    craft: '',
    location: '',
    bio: '',
    isPublic: false,
    contactEmail: '',
    contactPhone: '',
    contactWhatsapp: '',
    showContactOnProfile: false,
    avatarUrl: '',
  })
  const mediaUrls = useRef<string[]>([])
  const authUserId = authUser?.id
  const publicRoute = routeLocation.pathname.match(/^\/@([^/]+)(?:\/([^/]+))?$/)
  const publicProfileSlug = publicRoute?.[1]
  const publicProjectSlug = publicRoute?.[2]
  const currentPublicRoute = publicRouteResult?.pathname === routeLocation.pathname
    ? publicRouteResult
    : null
  const publicProfile = currentPublicRoute?.profile ?? null
  const publicProject = currentPublicRoute?.project ?? null
  const publicRouteLoading = Boolean(publicProfileSlug && !currentPublicRoute)
  const publicRouteError = currentPublicRoute?.error ?? ''
  const projectsLoading = authStatus === 'signed-in' && Boolean(authUserId) && loadedProjectsUserId !== authUserId
  const protectedViews: View[] = ['discover', 'portfolio', 'project', 'dashboard', 'profile', 'settings', 'project-space', 'workspace', 'review']
  const isProtectedView = protectedViews.includes(view)
  const showMobileAppNav = authStatus === 'signed-in' && (isProtectedView || view === 'home')
  const requestedNextPath = new URLSearchParams(routeLocation.search).get('next')
  const safeNextPath = requestedNextPath?.startsWith('/app/') && !requestedNextPath.startsWith('//')
    ? requestedNextPath
    : '/app'

  useEffect(() => {
    let active = true
    getCurrentUser()
      .then(({ user }) => {
        if (!active) return
        setAuthUser(user)
        setAuthStatus('signed-in')
      })
      .catch((error: unknown) => {
        if (!active) return
        setAuthUser(null)
        setAuthStatus(error instanceof ApiError && error.status === 401 ? 'signed-out' : 'error')
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => () => {
    mediaUrls.current.forEach((url) => URL.revokeObjectURL(url))
  }, [])

  useEffect(() => {
    if (authStatus !== 'signed-in' || !authUserId) return

    let active = true
    void listProjects()
      .then((items) => {
        if (active) setProjects(items)
      })
      .catch((error: unknown) => {
        if (active) setProjectsError(error instanceof Error ? error.message : 'We could not load your projects.')
      })
      .finally(() => {
        if (active) setLoadedProjectsUserId(authUserId)
      })
    void listDiscoverProjects()
      .then((items) => {
        if (!active) return
        setDiscoveryProjects(items)
        setDiscoveryLoaded(true)
      })
      .catch((error: unknown) => {
        if (active) setAnnouncement(error instanceof Error ? error.message : 'We could not load published projects.')
      })
    void getProfileSettings()
      .then((profile) => {
        if (!active) return
        setProfileDetails({
          slug: profile.slug,
          craft: profile.primary_craft ?? '',
          location: profile.city ?? '',
          bio: profile.bio ?? '',
          isPublic: profile.is_public,
          contactEmail: profile.contact_email ?? '',
          contactPhone: profile.contact_phone ?? '',
          contactWhatsapp: profile.contact_whatsapp ?? '',
          showContactOnProfile: profile.show_contact_on_profile,
          avatarUrl: profile.avatar_url ?? '',
        })
      })
      .catch((error: unknown) => {
        if (active) setAnnouncement(error instanceof Error ? error.message : 'We could not load your profile settings.')
      })
      .finally(() => {
        if (active) setProfileLoading(false)
      })

    return () => {
      active = false
    }
  }, [authStatus, authUserId])

  useEffect(() => {
    if (!publicProfileSlug) return

    let active = true
    const pathname = routeLocation.pathname
    const request = publicProjectSlug
      ? getPublicProject(publicProfileSlug, publicProjectSlug).then((project) => {
          if (active) setPublicRouteResult({ pathname, project })
        })
      : getPublicProfile(publicProfileSlug).then((profile) => {
          if (active) setPublicRouteResult({ pathname, profile })
        })
    void request
      .catch((error: unknown) => {
        if (!active) return
        setPublicRouteResult({
          pathname,
          error: error instanceof Error ? error.message : 'We could not load this page.',
        })
      })
    return () => {
      active = false
    }
  }, [publicProfileSlug, publicProjectSlug, routeLocation.pathname])

  useEffect(() => {
    const legacyRoutes: Record<string, string> = {
      '/find-work': '/app/find-work',
      '/check-email': '/login',
    }
    const legacyPortfolio = routeLocation.pathname.match(/^\/portfolio\/([^/]+)$/)
    const legacyProject = routeLocation.pathname.match(/^\/project\/([^/]+)$/)
    const replacement = legacyRoutes[routeLocation.pathname]
      ?? (legacyPortfolio ? `/app/makers/${legacyPortfolio[1]}` : undefined)
      ?? (legacyProject ? `/app/discovery/projects/${legacyProject[1]}` : undefined)
    if (replacement) {
      routerNavigate(replacement, { replace: true })
      return
    }
    if (
      isProtectedView
      && authStatus === 'signed-out'
    ) {
      routerNavigate(`/login?next=${encodeURIComponent(routeLocation.pathname)}`, { replace: true })
    }
  }, [authStatus, isProtectedView, routeLocation.pathname, routerNavigate])

  useEffect(() => {
    if (routeLocation.pathname === '/how-it-works') {
      routerNavigate('/#how-it-works', { replace: true })
      return
    }
    if (routeLocation.pathname === '/' && routeLocation.hash === '#how-it-works') {
      document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })
    }
    if (routeLocation.pathname === '/app/settings' && routeLocation.hash && !profileLoading) {
      document.getElementById(routeLocation.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [profileLoading, routeLocation.hash, routeLocation.pathname, routerNavigate])

  const projectIdFromPath = routeLocation.pathname.match(/^\/(?:project|app\/discovery\/projects|app\/projects)\/([^/]+)(?:\/review)?$/)?.[1]
  const makerIdFromPath = routeLocation.pathname.match(/^\/(?:portfolio|app\/makers)\/([^/]+)$/)?.[1]
  const visibleProjects = discoveryLoaded && discoveryProjects.length === 0 ? SAMPLE_PROJECTS : discoveryProjects
  const selectedProject = [...projects, ...visibleProjects].find((project) => project.id === projectIdFromPath)
    ?? [...projects, ...visibleProjects].find((project) => project.id === selectedProjectId)
  const selectedMakerIdValue = makerIdFromPath ?? selectedMakerId
  const selectedMakerProject = visibleProjects.find((project) => project.makerId === selectedMakerIdValue)
  const selectedMakerName = selectedMakerProject?.ownerName ?? 'Maker'
  const selectedMaker: Maker = {
    id: selectedMakerIdValue,
    name: selectedMakerName,
    craft: selectedMakerProject?.ownerCraft ?? 'Craft or service',
    location: selectedMakerProject?.ownerLocation ?? '',
    bio: selectedMakerProject?.ownerBio ?? '',
    initials: selectedMakerName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toLocaleUpperCase(),
    contactOptions: selectedMakerProject?.contactOptions,
  }
  const landingProjects = SAMPLE_PROJECTS.slice(0, 3)

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    const area = location.trim().toLocaleLowerCase()
    return visibleProjects.filter((project) => {
      const matchesQuery =
        !query ||
        [project.title, project.description, project.category, project.ownerName, project.ownerCraft]
          .filter(Boolean)
          .some((value) => value!.toLocaleLowerCase().includes(query))
      const matchesLocation =
        !area || `${project.location} ${project.ownerLocation}`.toLocaleLowerCase().includes(area)
      const matchesCategory = category === 'All crafts' || project.category === category
      return matchesQuery && matchesLocation && matchesCategory
    })
  }, [category, location, search, visibleProjects])

  function navigate(nextView: View, id?: string) {
    const paths: Record<View, string> = {
      home: '/',
      how: '/#how-it-works',
      discover: '/app/find-work',
      portfolio: `/app/makers/${id || selectedMakerId || makerIdFromPath || ''}`,
      project: `/app/discovery/projects/${id || selectedProjectId || projectIdFromPath || ''}`,
      dashboard: '/app',
      profile: '/app/profile',
      settings: `/app/settings${id === 'privacy' ? '#privacy' : ''}`,
      'project-space': `/app/projects/${id || selectedProjectId || projectIdFromPath || ''}`,
      workspace: '/app/projects/new',
      review: id ? `/app/projects/${id}/review` : '/app/review',
      'public-profile': id ? `/@${id}` : '/',
      'public-project': id ?? '/',
      login: '/login',
      signup: '/signup',
      'not-found': '/not-found',
    }
    if (protectedViews.includes(nextView) && authStatus !== 'signed-in') {
      routerNavigate(`/signup?next=${encodeURIComponent(paths[nextView])}`)
    } else {
      routerNavigate(paths[nextView])
    }
    setMobileMenuOpen(false)
    setAnnouncement('')
    if (nextView !== 'how') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openPortfolio(makerId: string) {
    setSelectedMakerId(makerId)
    navigate('portfolio', makerId)
  }

  function openProject(project: Project) {
    setSelectedProjectId(project.id)
    setSelectedMakerId(project.makerId)
    navigate('project', project.id)
  }

  async function saveDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!authUser || savingProject) return

    setSavingProject(true)
    setAnnouncement('')
    try {
      const project = draftProjectId
        ? await updateProject(draftProjectId, {
            title: draftTitle.trim(),
            description: draftDescription.trim(),
            category: draftCategory.trim(),
            location_label: draftLocation.trim() || null,
            stage: draftStage,
            visibility: draftVisibility,
            include_contact: draftIncludeContact,
          })
        : await createProject({
            title: draftTitle.trim(),
            description: draftDescription.trim(),
            category: draftCategory.trim(),
            location_label: draftLocation.trim() || null,
            stage: draftStage,
            visibility: draftVisibility,
            include_contact: draftIncludeContact,
          })
      setDraftProjectId(project.id)
      setProjects((current) => [project, ...current.filter((item) => item.id !== project.id)])

      const pendingMedia = draftAttachments.filter((media) => media.file && media.uploadProgress !== 100)
      for (const [index, media] of pendingMedia.entries()) {
        const persistedMedia = await uploadProjectMedia(project.id, media, {
          sortOrder: draftAttachments.indexOf(media),
          onProgress: (uploadProgress) => setDraftAttachments((current) => current.map((item) => (
            item.id === media.id ? { ...item, uploadProgress } : item
          ))),
        })
        setDraftAttachments((current) => current.map((item) => (
          item.id === media.id
            ? { ...item, ...persistedMedia, file: media.file, uploadProgress: 100 }
            : item
        )))
        setAnnouncement(`Uploading project media (${index + 1} of ${pendingMedia.length}).`)
      }

      const savedProject = await getProject(project.id)
      setProjects((current) => [savedProject, ...current.filter((item) => item.id !== savedProject.id)])
      setSelectedProjectId(savedProject.id)
      setDraftProjectId(null)
      setDraftAttachments([])
      navigate('review', savedProject.id)
      setAnnouncement('Project draft saved to your account.')
    } catch (error) {
      setAnnouncement(error instanceof Error ? error.message : 'We could not save this project. Try again.')
    } finally {
      setSavingProject(false)
    }
  }

  async function publishDraft() {
    if (!selectedProject) return
    try {
      const publishedProject = await publishProject(selectedProject.id)
      setProjects((current) => current.map((project) => project.id === publishedProject.id ? publishedProject : project))
      setDiscoveryProjects((current) => [publishedProject, ...current.filter((project) => project.id !== publishedProject.id)])
      navigate('project-space', selectedProject.id)
      setAnnouncement('Project published. Customers can now find it in Home.')
    } catch (error) {
      setAnnouncement(error instanceof Error ? error.message : 'We could not publish this project.')
    }
  }

  function startNewProject() {
    setDraftTitle('')
    setDraftDescription('')
    setDraftStage('planned')
    setDraftVisibility('public')
    setDraftIncludeContact(false)
    setDraftCategory('')
    setDraftLocation('')
    setDraftAttachments([])
    setDraftProjectId(null)
    navigate('workspace')
  }

  function setProjectAttachments(files: File[]) {
    setDraftAttachments((current) => [...current, ...createProjectMedia(files, mediaUrls.current)])
  }

  function discardMedia(media: ProjectMedia) {
    if (media.file) URL.revokeObjectURL(media.url)
  }

  async function addProjectUpdate(projectId: string, update: Omit<ProjectUpdate, 'id' | 'createdAt'>) {
    try {
      const createdUpdate = await createProjectUpdate(projectId, {
        title: update.title,
        description: update.description,
        stage: update.stage,
      })
      const failedUploads: string[] = []
      for (const [index, media] of update.attachments.entries()) {
        try {
          await uploadProjectMedia(projectId, media, {
            projectUpdateId: createdUpdate.id,
            sortOrder: index,
            onProgress: () => undefined,
          })
        } catch (error) {
          failedUploads.push(error instanceof Error ? error.message : `We couldn't upload ${media.filename}.`)
        }
      }
      const refreshedProject = await getProject(projectId)
      setProjects((current) => current.map((project) => project.id === refreshedProject.id ? refreshedProject : project))
      setDiscoveryProjects((current) => current.map((project) => project.id === refreshedProject.id ? refreshedProject : project))
      setAnnouncement(failedUploads.length
        ? `Update saved, but some media could not be uploaded: ${failedUploads.join(' ')}`
        : 'Progress update saved to your project.')
    } catch (error) {
      setAnnouncement(error instanceof Error ? error.message : 'We could not save this progress update.')
      throw error
    }
  }

  async function saveProfile(details: Omit<ProfileDetails, 'avatarUrl'>) {
    try {
      const profile = await updateProfileSettings({
        slug: details.slug.trim(),
        primary_craft: details.craft.trim() || null,
        city: details.location.trim() || null,
        bio: details.bio.trim() || null,
        is_public: details.isPublic,
        contact_email: details.contactEmail.trim() || null,
        contact_phone: details.contactPhone.trim() || null,
        contact_whatsapp: details.contactWhatsapp.trim() || null,
        show_contact_on_profile: details.showContactOnProfile,
      })
      const savedDetails = {
        slug: profile.slug,
        craft: profile.primary_craft ?? '',
        location: profile.city ?? '',
        bio: profile.bio ?? '',
        isPublic: profile.is_public,
        contactEmail: profile.contact_email ?? '',
        contactPhone: profile.contact_phone ?? '',
        contactWhatsapp: profile.contact_whatsapp ?? '',
        showContactOnProfile: profile.show_contact_on_profile,
        avatarUrl: profile.avatar_url ?? '',
      }
      setProfileDetails(savedDetails)
      try {
        setDiscoveryProjects(await listDiscoverProjects())
        setDiscoveryLoaded(true)
      } catch (error) {
        setAnnouncement(`Profile saved, but Home could not refresh: ${error instanceof Error ? error.message : 'Try reloading Home.'}`)
        return
      }
      setAnnouncement('Profile saved to your account.')
    } catch (error) {
      setAnnouncement(error instanceof Error ? error.message : 'We could not save your profile.')
      throw error
    }
  }

  async function saveProfileAvatar(file: File): Promise<string | null> {
    try {
      const profile = await uploadProfileAvatar(file)
      setProfileDetails((current) => ({ ...current, avatarUrl: profile.avatar_url ?? '' }))
      setAnnouncement('Profile photo updated.')
      return profile.avatar_url
    } catch (error) {
      setAnnouncement(error instanceof Error ? error.message : 'We could not upload your profile photo.')
      throw error
    }
  }

  async function saveProjectSettings(projectId: string, values: Pick<Project, 'title' | 'description' | 'category' | 'location' | 'stage' | 'visibility' | 'includeContact'>) {
    try {
      const updated = await updateProject(projectId, {
        title: values.title,
        description: values.description,
        category: values.category,
        location_label: values.location.trim() || null,
        stage: values.stage,
        visibility: values.visibility === 'public' ? 'public' : 'private',
        include_contact: values.includeContact,
      })
      setProjects((current) => current.map((project) => project.id === updated.id ? updated : project))
      setDiscoveryProjects((current) => current.map((project) => project.id === updated.id ? updated : project))
      setAnnouncement('Project settings saved.')
    } catch (error) {
      setAnnouncement(error instanceof Error ? error.message : 'We could not save project settings.')
      throw error
    }
  }

  async function submitLogin(email: string, password: string) {
    const { user } = await logIn(email, password)
    setAuthUser(user)
    setProjectsError('')
    setAuthStatus('signed-in')
    routerNavigate(safeNextPath, { replace: true })
  }

  async function submitSignup(
    displayName: string,
    email: string,
    password: string,
    profileType: AuthUser['profile']['profile_type'],
  ) {
    const { user } = await signUp(displayName, email, password, profileType)
    setAuthUser(user)
    setProjectsError('')
    setAuthStatus('signed-in')
    routerNavigate(safeNextPath, { replace: true })
  }

  async function submitLogout() {
    try {
      await logOut()
      setAuthUser(null)
      setAuthStatus('signed-out')
      setProjects([])
      setDiscoveryProjects([])
      setDiscoveryLoaded(false)
      setLoadedProjectsUserId(null)
      setProfileDetails({
        slug: '',
        craft: '',
        location: '',
        bio: '',
        isPublic: false,
        contactEmail: '',
        contactPhone: '',
        contactWhatsapp: '',
        showContactOnProfile: false,
        avatarUrl: '',
      })
      setProfileLoading(true)
      routerNavigate('/')
    } catch (error) {
      setAnnouncement(error instanceof Error ? error.message : 'We could not sign you out. Try again.')
    }
  }

  async function retryAuth() {
    setAuthStatus('loading')
    try {
      const { user } = await getCurrentUser()
      setAuthUser(user)
      setAuthStatus('signed-in')
    } catch (error) {
      setAuthUser(null)
      setAuthStatus(error instanceof ApiError && error.status === 401 ? 'signed-out' : 'error')
    }
  }

  async function copyShareLink(url: string, label: string) {
    try {
      await navigator.clipboard.writeText(url)
      setAnnouncement(`${label} copied to your clipboard.`)
    } catch {
      setAnnouncement(`Clipboard access is unavailable. Select and copy the ${label.toLocaleLowerCase()} shown on the page.`)
    }
  }

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <div className={`site-shell${showMobileAppNav ? ' has-mobile-app-nav' : ''}`}>
        <Header
          activeView={view}
          menuOpen={mobileMenuOpen}
          isAuthenticated={authStatus === 'signed-in'}
          showLandingMenu={view === 'home' && authStatus !== 'signed-in'}
          onMenuToggle={() => setMobileMenuOpen((open) => !open)}
          onNavigate={navigate}
          onLogout={submitLogout}
        />

        {announcement && (
          <p className="status-banner" role="status">
            {announcement}
          </p>
        )}

        <main id="main-content">
          {isProtectedView && authStatus === 'loading' && <AuthStatePage message="Checking your account…" />}
          {isProtectedView && authStatus === 'error' && (
            <AuthStatePage message="We couldn't verify your account. Check your connection and try again." onRetry={retryAuth} />
          )}
          {view === 'home' && authStatus === 'signed-in' && (
            <DiscoveryPage
              projects={filteredProjects}
              availableCategories={[...new Set(visibleProjects.map((project) => project.category))]}
              search={search}
              location={location}
              category={category}
              onSearchChange={setSearch}
              onLocationChange={setLocation}
              onCategoryChange={setCategory}
              onOpenProject={openProject}
              onOpenPortfolio={openPortfolio}
            />
          )}
          {view === 'home' && authStatus !== 'signed-in' && (
            <LandingPage
              featuredProjects={landingProjects}
              onNavigate={navigate}
            />
          )}
          {view === 'discover' && authStatus === 'signed-in' && (
            <DiscoveryPage
              projects={filteredProjects}
              availableCategories={[...new Set(visibleProjects.map((project) => project.category))]}
              search={search}
              location={location}
              category={category}
              onSearchChange={setSearch}
              onLocationChange={setLocation}
              onCategoryChange={setCategory}
              onOpenProject={openProject}
              onOpenPortfolio={openPortfolio}
            />
          )}
          {view === 'portfolio' && authStatus === 'signed-in' && (!makerIdFromPath || visibleProjects.some((project) => project.makerId === makerIdFromPath)) && (
            <PortfolioPage
              maker={selectedMaker}
              projects={visibleProjects.filter((project) => project.makerId === selectedMaker.id)}
              onOpenProject={openProject}
              onContactMaker={() => {
                const makerProject = visibleProjects.find((project) => project.makerId === selectedMaker.id)
                if (makerProject) openProject(makerProject)
              }}
              onBack={() => navigate('discover')}
            />
          )}
          {(view === 'public-profile' || view === 'public-project') && publicRouteLoading && (
            <AuthStatePage message="Loading this public page…" />
          )}
          {(view === 'public-profile' || view === 'public-project') && !publicRouteLoading && publicRouteError && (
            <section className="page-section empty-state">
              <h1>This page is unavailable.</h1>
              <p>{publicRouteError}</p>
              <button className="text-link" type="button" onClick={() => routerNavigate('/')}>Back to Decraft <ArrowIcon /></button>
            </section>
          )}
          {view === 'public-profile' && !publicRouteLoading && publicProfile && (
            <PortfolioPage
              maker={publicProfile.maker}
              projects={publicProfile.projects}
              onOpenProject={(project) => {
                if (!project.slug) return
                routerNavigate(`/@${encodeURIComponent(publicProfile.slug)}/${encodeURIComponent(project.slug)}`)
              }}
              onContactMaker={() => {
                const project = publicProfile.projects[0]
                if (project?.slug) {
                  routerNavigate(`/@${encodeURIComponent(publicProfile.slug)}/${encodeURIComponent(project.slug)}`)
                }
              }}
              onBack={() => routerNavigate('/')}
              backLabel="Back to Decraft"
            />
          )}
          {view === 'public-project' && !publicRouteLoading && publicProject && (
            <ProjectPage
              project={publicProject}
              onNavigate={navigate}
              onBack={() => routerNavigate(`/@${encodeURIComponent(publicProfileSlug ?? '')}`)}
              backLabel="Back to maker profile"
              shareLink={window.location.href}
              onCopyShare={(url) => void copyShareLink(url, 'Project link')}
            />
          )}
          {view === 'project' && authStatus === 'signed-in' && selectedProject && (
            <ProjectPage project={selectedProject} onNavigate={navigate} />
          )}
          {view === 'project' && authStatus === 'signed-in' && !selectedProject && <NotFoundPage onNavigate={navigate} />}
          {view === 'dashboard' && authStatus === 'loading' && <AuthStatePage message="Checking your account…" />}
          {view === 'dashboard' && authStatus === 'error' && (
            <AuthStatePage message="We couldn't verify your account. Check your connection and try again." onRetry={retryAuth} />
          )}
          {view === 'dashboard' && authStatus === 'signed-in' && authUser && (
            <ProjectDashboard
              projects={projects.filter((project) => project.makerId === authUser.id)}
              accountName={authUser.profile.display_name}
              isLoading={projectsLoading}
              error={projectsError}
              onCreateProject={startNewProject}
              onOpenProject={(project) => {
                setSelectedProjectId(project.id)
                navigate('project-space', project.id)
              }}
            />
          )}
          {view === 'profile' && authStatus === 'signed-in' && profileLoading && <AuthStatePage message="Loading your profile…" />}
          {view === 'profile' && authStatus === 'signed-in' && !profileLoading && authUser && (
            <MakerProfilePage
              accountName={authUser.profile.display_name}
              email={authUser.email ?? ''}
              profileType={authUser.profile.profile_type}
              details={profileDetails}
              onSave={saveProfile}
              onUploadAvatar={saveProfileAvatar}
              onNavigate={navigate}
              onCopyShare={(url) => void copyShareLink(url, 'Profile link')}
            />
          )}
          {view === 'settings' && authStatus === 'loading' && <AuthStatePage message="Checking your account…" />}
          {view === 'settings' && authStatus === 'error' && (
            <AuthStatePage message="We couldn't verify your account. Check your connection and try again." onRetry={retryAuth} />
          )}
          {view === 'settings' && authStatus === 'signed-in' && profileLoading && <AuthStatePage message="Loading your settings…" />}
          {view === 'settings' && authStatus === 'signed-in' && !profileLoading && authUser && (
            <MakerSettingsPage
              accountName={authUser.profile.display_name}
              email={authUser.email ?? ''}
              details={profileDetails}
              onSave={saveProfile}
              onNavigate={navigate}
            />
          )}
          {view === 'project-space' && authStatus === 'loading' && <AuthStatePage message="Checking your account…" />}
          {view === 'project-space' && authStatus === 'error' && (
            <AuthStatePage message="We couldn't verify your account. Check your connection and try again." onRetry={retryAuth} />
          )}
          {view === 'project-space' && authStatus === 'signed-in' && (
            (!selectedProject || selectedProject.makerId !== authUser?.id || !authUser)
              ? <NotFoundPage onNavigate={navigate} />
              : <ProjectSpacePage
                  key={selectedProject.id}
                  project={selectedProject}
                  accountName={authUser.profile.display_name}
                  profileSlug={profileDetails.slug}
                  profileIsPublic={profileDetails.isPublic}
                  onNavigate={navigate}
                  onPublish={publishDraft}
                  onAddUpdate={(update) => addProjectUpdate(selectedProject.id, update)}
                  onSaveSettings={(values) => saveProjectSettings(selectedProject.id, values)}
                  onCreateMedia={(files) => createProjectMedia(files, mediaUrls.current)}
                  onDiscardMedia={discardMedia}
                  onCopyShare={(url) => void copyShareLink(url, 'Project link')}
                />
          )}
          {view === 'portfolio' && makerIdFromPath && !visibleProjects.some((project) => project.makerId === makerIdFromPath) && (
            <NotFoundPage onNavigate={navigate} />
          )}
          {view === 'workspace' && authStatus === 'loading' && <AuthStatePage message="Checking your account…" />}
          {view === 'workspace' && authStatus === 'error' && (
            <AuthStatePage message="We couldn't verify your account. Check your connection and try again." onRetry={retryAuth} />
          )}
          {view === 'workspace' && authStatus === 'signed-in' && (
            <WorkspacePage
              title={draftTitle}
              description={draftDescription}
              stage={draftStage}
              visibility={draftVisibility}
              includeContact={draftIncludeContact}
              category={draftCategory}
              location={draftLocation}
              accountName={authUser?.profile.display_name ?? ''}
              attachments={draftAttachments}
              onTitleChange={setDraftTitle}
              onDescriptionChange={setDraftDescription}
              onStageChange={setDraftStage}
              onVisibilityChange={setDraftVisibility}
              onIncludeContactChange={setDraftIncludeContact}
              onCategoryChange={setDraftCategory}
              onLocationChange={setDraftLocation}
              onAttachmentsChange={setProjectAttachments}
              onRemoveAttachment={async (media) => {
                if (draftProjectId && media.uploadProgress === 100) {
                  try {
                    await removeProjectMedia(draftProjectId, media.id)
                  } catch (error) {
                    setAnnouncement(error instanceof Error ? error.message : 'We could not remove this file.')
                    return
                  }
                }
                discardMedia(media)
                setDraftAttachments((current) => current.filter((attachment) => attachment.id !== media.id))
              }}
              onChangeAttachmentDescription={(id, description) => setDraftAttachments((current) => current.map((media) => (
                media.id === id ? { ...media, description } : media
              )))}
              onSubmit={saveDraft}
              onNavigate={navigate}
              isSaving={savingProject}
            />
          )}
          {view === 'review' && authStatus === 'loading' && <AuthStatePage message="Checking your account…" />}
          {view === 'review' && authStatus === 'error' && (
            <AuthStatePage message="We couldn't verify your account. Check your connection and try again." onRetry={() => {
              setAuthStatus('loading')
              getCurrentUser()
                .then(({ user }) => { setAuthUser(user); setAuthStatus('signed-in') })
                .catch(() => setAuthStatus('error'))
            }} />
          )}
          {view === 'review' && authStatus === 'signed-in' && selectedProject && authUser && selectedProject.makerId === authUser.id && (
            <ReviewPage
              project={selectedProject}
              profileIsPublic={profileDetails.isPublic}
              onPublish={publishDraft}
              onNavigate={navigate}
            />
          )}
          {view === 'review' && authStatus === 'signed-in' && (!selectedProject || selectedProject.makerId !== authUser?.id) && (
            <NotFoundPage onNavigate={navigate} />
          )}
          {view === 'login' && (
            <LoginPage
              onSubmit={submitLogin}
              onNavigate={(path) => routerNavigate(path === '/signup' && safeNextPath !== '/app'
                ? `/signup?next=${encodeURIComponent(safeNextPath)}`
                : path)}
            />
          )}
          {view === 'signup' && (
            <SignUpPage
              onSubmit={submitSignup}
              onNavigate={(path) => routerNavigate(path === '/login' && safeNextPath !== '/app'
                ? `/login?next=${encodeURIComponent(safeNextPath)}`
                : path)}
            />
          )}
          {view === 'not-found' && <NotFoundPage onNavigate={navigate} />}
        </main>

        <Footer isAuthenticated={authStatus === 'signed-in'} onNavigate={navigate} />
      </div>
      {showMobileAppNav && <MobileAppNav activeView={view} onNavigate={navigate} />}
    </>
  )
}

interface HeaderProps {
  activeView: View
  menuOpen: boolean
  isAuthenticated: boolean
  showLandingMenu: boolean
  onMenuToggle: () => void
  onNavigate: (view: View, id?: string) => void
  onLogout: () => void
}

function Header({
  activeView,
  menuOpen,
  isAuthenticated,
  showLandingMenu,
  onMenuToggle,
  onNavigate,
  onLogout,
}: HeaderProps) {
  return (
    <header className={`site-header${isAuthenticated ? ' site-header-app' : ''}`}>
      <button className="wordmark" type="button" onClick={() => onNavigate('home')} aria-label="Decraft home">
        <BrandMark />
        <span>Decraft</span>
      </button>
      {showLandingMenu && (
        <button
          className="menu-toggle"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
          onClick={onMenuToggle}
        >
          <span>{menuOpen ? 'Close' : 'Menu'}</span>
          <span className={`menu-lines${menuOpen ? ' is-open' : ''}`} aria-hidden="true"><i /><i /></span>
        </button>
      )}
      <nav
        id="primary-navigation"
        className={`primary-navigation${menuOpen ? ' is-open' : ''}${isAuthenticated ? ' app-primary-navigation' : ''}${showLandingMenu ? ' landing-primary-navigation' : ''}`}
        aria-label="Main navigation"
      >
        {!isAuthenticated && showLandingMenu && (
          <button
            type="button"
            className={activeView === 'how' ? 'is-active' : ''}
            onClick={() => onNavigate('how')}
          >
            How it works
          </button>
        )}
        {isAuthenticated && (
          <button
            type="button"
            className={`nav-home${activeView === 'home' || activeView === 'discover' || activeView === 'portfolio' || activeView === 'project' ? ' is-active' : ''}`}
            onClick={() => onNavigate('discover')}
          >
            Home
          </button>
        )}
        {isAuthenticated ? (
          <button
            className={`nav-projects${activeView === 'dashboard' || activeView === 'project-space' ? ' is-active' : ''}`}
            type="button"
            onClick={() => onNavigate('dashboard')}
          >
            Projects
          </button>
        ) : showLandingMenu ? (
          <>
            <button className="nav-create" type="button" onClick={() => onNavigate('signup')}>Create account <ArrowIcon /></button>
            <button type="button" onClick={() => onNavigate('login')}>Sign in</button>
          </>
        ) : null}
        {isAuthenticated && <AccountMenu onNavigate={onNavigate} onLogout={onLogout} />}
      </nav>
    </header>
  )
}

function AccountMenu({
  onNavigate,
  onLogout,
}: {
  onNavigate: (view: View, id?: string) => void
  onLogout: () => void
}) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function closeOnOutsideClick(event: MouseEvent) {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) setOpen(false)
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  function navigateTo(view: View, id?: string) {
    setOpen(false)
    onNavigate(view, id)
  }

  return (
    <div className="account-menu" ref={menuRef}>
      <button
        className="account-menu-trigger"
        type="button"
        aria-label="Open account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <UserCircle weight={open ? 'fill' : 'regular'} aria-hidden="true" />
      </button>
      {open && (
        <div className="account-menu-popover" role="menu" aria-label="Account">
          <button type="button" role="menuitem" onClick={() => navigateTo('profile')}>
            <UserCircle aria-hidden="true" /> Your profile
          </button>
          <button type="button" role="menuitem" onClick={() => navigateTo('settings')}>
            <GearSix aria-hidden="true" /> Settings
          </button>
          <button type="button" role="menuitem" onClick={() => navigateTo('settings', 'privacy')}>
            <LockKey aria-hidden="true" /> Privacy
          </button>
          <button className="account-menu-signout" type="button" role="menuitem" onClick={() => {
            setOpen(false)
            onLogout()
          }}>
            <SignOut aria-hidden="true" /> Sign out
          </button>
        </div>
      )}
    </div>
  )
}

function MobileAppNav({ activeView, onNavigate }: { activeView: View; onNavigate: (view: View) => void }) {
  const homeActive = ['home', 'discover', 'portfolio', 'project'].includes(activeView)
  return (
    <nav className="mobile-app-nav" aria-label="App navigation">
      <button className={homeActive ? 'is-active' : ''} type="button" onClick={() => onNavigate('discover')} aria-current={homeActive ? 'page' : undefined}>
        <House weight={homeActive ? 'fill' : 'regular'} aria-hidden="true" />
        <span>Home</span>
      </button>
      <button className={activeView === 'dashboard' || activeView === 'project-space' ? 'is-active' : ''} type="button" onClick={() => onNavigate('dashboard')} aria-current={activeView === 'dashboard' ? 'page' : undefined}>
        <FolderSimple weight={activeView === 'dashboard' || activeView === 'project-space' ? 'fill' : 'regular'} aria-hidden="true" />
        <span>Projects</span>
      </button>
      <button className={activeView === 'profile' ? 'is-active' : ''} type="button" onClick={() => onNavigate('profile')} aria-current={activeView === 'profile' ? 'page' : undefined}>
        <UserCircle weight={activeView === 'profile' ? 'fill' : 'regular'} aria-hidden="true" />
        <span>Profile</span>
      </button>
    </nav>
  )
}

interface LandingPageProps {
  featuredProjects: Project[]
  onNavigate: (view: View) => void
}

function LandingPage({ featuredProjects, onNavigate }: LandingPageProps) {
  const featuredProject = featuredProjects[0] ?? SAMPLE_PROJECTS[0]
  const featuredMaker = SAMPLE_MAKERS.find((maker) => maker.id === featuredProject.makerId) ?? currentMaker

  return (
    <>
      <section className="hero-section">
        <div className="hero-copy">
          <h1>Let the work tell the story.</h1>
          <p className="hero-description">
            A project is more than a finished photo. Keep the brief, progress, and result together,
            then let customers see what you can do.
          </p>
          <div className="hero-actions">
            <button className="button button-dark" type="button" onClick={() => onNavigate('discover')}>
              Explore the work <ArrowIcon />
            </button>
            <button className="text-link" type="button" onClick={() => onNavigate('signup')}>
              Build your portfolio <ArrowIcon />
            </button>
                </div>
        </div>

        <article className="featured-folio">
          <div className="featured-image-wrap">
            <img className="featured-image" src={featuredProject.image} alt={featuredProject.imageAlt} />
            <span className="image-stamp">Featured project</span>
            <span className="image-status">{stageLabel(featuredProject.stage)}</span>
          </div>
          <div className="folio-caption">
            <div className="folio-maker">
              <span className="maker-monogram" aria-hidden="true">{featuredMaker.initials}</span>
              <span><strong>{featuredMaker.name}</strong><small>{featuredMaker.craft} · {featuredMaker.location}</small></span>
            </div>
            <div className="folio-title-row">
              <h2>{featuredProject.title}</h2>
              <span className="round-arrow"><ArrowIcon /></span>
            </div>
            <MilestoneTrack stage={featuredProject.stage} />
          </div>
        </article>
      </section>

      <section className="story-section section-wrap">
        <div className="section-heading">
          <h2>Keep the whole job<br />in one place.</h2>
        </div>
        <div className="story-body">
          <p>
            The first note, the work in progress, the finished piece. Each update stays with the
            project, ready to become part of a portfolio when you choose.
          </p>
          <div className="story-timeline" aria-label="Sample project stages">
            <div className="story-milestone is-complete"><span className="milestone-mark">01</span><span><strong>Plan the work</strong><small>Set down the brief and the details.</small></span></div>
            <div className="story-milestone is-complete"><span className="milestone-mark">02</span><span><strong>Show the progress</strong><small>Add updates as the project moves.</small></span></div>
            <div className="story-milestone"><span className="milestone-mark">03</span><span><strong>Share the finished work</strong><small>Choose what belongs in your portfolio.</small></span></div>
          </div>
        </div>
      </section>

      <section className="landing-featured section-wrap">
        <div className="landing-featured-heading">
          <h2>Projects with a story to tell.</h2>
          <p>See how a maker’s brief, process, and finished work can live together.</p>
        </div>
        <div className="landing-featured-grid">
          {featuredProjects.map((project, index) => {
            const maker = SAMPLE_MAKERS.find((item) => item.id === project.makerId) ?? currentMaker
            return (
              <article className={`landing-featured-item landing-featured-item-${index + 1}`} key={project.id}>
                <img src={project.image} alt={project.imageAlt} loading="lazy" />
                <div>
                  <h3>{project.title}</h3>
                  <p>{project.category} by {maker.name}</p>
                </div>
              </article>
            )
          })}
        </div>
        <button className="text-link" type="button" onClick={() => onNavigate('discover')}>
          Explore all work <ArrowIcon />
        </button>
      </section>

      <section className="landing-how" id="how-it-works">
        <header className="how-intro section-wrap">
          <div className="how-intro-copy">
            <p className="section-label">A better home for the work</p>
            <h2>From first note to work people can find.</h2>
            <p>Decraft keeps a project’s brief, progress, and finished result together, so a portfolio grows from the work itself.</p>
          </div>
          <img
            className="how-intro-image"
            src="/images/ceramics.jpg"
            alt="Handmade stoneware bowls arranged on a wooden studio shelf"
            loading="lazy"
          />
        </header>
        <div className="how-steps section-wrap">
          <article className="how-step">
            <span>01</span>
            <div>
              <h3>Start with the project</h3>
              <p>Write down what you are making, who it is for, and the materials or details worth remembering.</p>
            </div>
            <p className="how-aside">A useful record, not another feed.</p>
          </article>
          <article className="how-step">
            <span>02</span>
            <div>
              <h3>Add the work as it moves</h3>
              <p>Keep photos and video alongside the project, then add progress notes when something changes.</p>
            </div>
            <p className="how-aside">Write your own description. AI-assisted drafting is planned, with your approval always required.</p>
          </article>
          <article className="how-step">
            <span>03</span>
            <div>
              <h3>Choose what to share</h3>
              <p>Review the project before publishing it to a portfolio customers can browse and use to start an inquiry.</p>
            </div>
            <p className="how-aside">You decide what becomes public.</p>
          </article>
        </div>
      </section>

      <section className="audience-section">
        <div className="audience-image">
          <img src="/images/upholstery.jpg" alt="A restored deep-green sofa in a bright room" loading="lazy" />
          <span>Work, kept with its maker.</span>
        </div>
        <div className="audience-copy">
          <h2>Good work should be easier to find.</h2>
          <p>Give every project a place to live. Let customers browse the work, understand how it came together, and reach out to its maker.</p>
          <div className="audience-actions">
            <button className="button button-light" type="button" onClick={() => onNavigate('discover')}>Browse local work <ArrowIcon /></button>
            <button className="audience-link" type="button" onClick={() => onNavigate('signup')}>Start your portfolio <ArrowIcon /></button>
          </div>
        </div>
      </section>

      <section className="closing-section section-wrap">
        <div>
          <h2>Start with one project.</h2>
        </div>
        <button className="button button-dark" type="button" onClick={() => onNavigate('signup')}>Make your first folio <ArrowIcon /></button>
      </section>
    </>
  )
}

interface DiscoveryPageProps {
  projects: Project[]
  availableCategories: string[]
  search: string
  location: string
  category: string
  onSearchChange: (value: string) => void
  onLocationChange: (value: string) => void
  onCategoryChange: (value: string) => void
  onOpenProject: (project: Project) => void
  onOpenPortfolio: (makerId: string) => void
}

function DiscoveryPage({
  projects,
  availableCategories,
  search,
  location,
  category,
  onSearchChange,
  onLocationChange,
  onCategoryChange,
  onOpenProject,
  onOpenPortfolio,
}: DiscoveryPageProps) {
  return (
    <section className="page-section discovery-page">
      <div className="page-intro">
        <h1>Find work worth knowing.</h1>
        <p>Browse projects by craft and place, and see the people behind the work.</p>
      </div>
      <form className="search-panel" onSubmit={(event) => event.preventDefault()} role="search">
        <label className="search-field">
          <span>Craft or service</span>
          <input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Try ceramics, furniture…" />
        </label>
        <label className="search-field">
          <span>Area</span>
          <input value={location} onChange={(event) => onLocationChange(event.target.value)} placeholder="Lagos, Lekki, Yaba…" />
        </label>
        <label className="search-field search-category">
          <span>Craft</span>
          <select value={category} onChange={(event) => onCategoryChange(event.target.value)}>
            <option>All crafts</option>
            {availableCategories.map((craft) => <option key={craft}>{craft}</option>)}
          </select>
        </label>
      </form>

      <div className="results-heading">
        <h2>Projects to explore</h2>
        <span>{projects.length} {projects.length === 1 ? 'project' : 'projects'}</span>
      </div>
      {projects.length > 0 ? (
        <div className="project-grid">
          {projects.map((project) => {
            const maker = makerForProject(project)
            return (
              <article className="project-tile" key={project.id}>
                <button className="tile-image-button" type="button" onClick={() => onOpenProject(project)} aria-label={`Open ${project.title}`}>
                  <img src={project.image} alt={project.imageAlt} loading="lazy" />
                  <span className="tile-stage">{stageLabel(project.stage)}</span>
                </button>
                <div className="tile-copy">
                  <p className="tile-craft">{project.category} <span>·</span> {project.location}</p>
                  <h3><button type="button" onClick={() => onOpenProject(project)}>{project.title}</button></h3>
                  <p>{project.description}</p>
                  <button className="maker-link" type="button" onClick={() => onOpenPortfolio(maker.id)}>
                    <span className="maker-monogram" aria-hidden="true">
                      {maker.avatarUrl ? <img src={maker.avatarUrl} alt="" /> : maker.initials}
                    </span>
                    <span>{maker.name}<small>{maker.craft}</small></span>
                    <ArrowIcon />
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="empty-state">
          <h2>No projects match those filters.</h2>
          <p>Try a different craft or area, or check back as makers share more work.</p>
          <button className="text-link" type="button" onClick={() => { onSearchChange(''); onLocationChange(''); onCategoryChange('All crafts') }}>Clear filters <ArrowIcon /></button>
        </div>
      )}
    </section>
  )
}

interface PortfolioPageProps {
  maker: Maker
  projects: Project[]
  onOpenProject: (project: Project) => void
  onContactMaker: () => void
  onBack: () => void
  backLabel?: string
}

function PortfolioPage({ maker, projects, onOpenProject, onContactMaker, onBack, backLabel = 'Back to discovery' }: PortfolioPageProps) {
  return (
    <section className="page-section portfolio-page">
      <button className="back-link" type="button" onClick={onBack}><ArrowIcon /> {backLabel}</button>
      <div className="portfolio-header">
        <div className="portrait-block" aria-hidden="true">
          {maker.avatarUrl ? <img src={maker.avatarUrl} alt="" /> : maker.initials}
        </div>
        <div>
          <h1>{maker.name}</h1>
          <p className="portfolio-meta">{maker.craft} <span>·</span> {maker.location}</p>
          <p className="portfolio-bio">{maker.bio}</p>
          <ContactOptionsLinks contacts={maker.contactOptions} />
        </div>
        <button className="button button-dark portfolio-contact" type="button" onClick={onContactMaker}>Explore a project <ArrowIcon /></button>
      </div>
      <div className="results-heading portfolio-project-heading">
        <h2>Selected projects</h2>
        <span>{projects.length} {projects.length === 1 ? 'project' : 'projects'}</span>
      </div>
      {projects.length ? (
        <div className="project-grid portfolio-grid">
          {projects.map((project) => (
            <ProjectTile key={project.id} project={project} maker={maker} onOpenProject={onOpenProject} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>No published projects yet.</h2>
          <p>This maker has not shared a project yet.</p>
        </div>
      )}
    </section>
  )
}

interface ProjectTileProps {
  project: Project
  maker: Maker
  onOpenProject: (project: Project) => void
}

function ProjectTile({ project, maker, onOpenProject }: ProjectTileProps) {
  return (
    <article className="project-tile">
      <button className="tile-image-button" type="button" onClick={() => onOpenProject(project)} aria-label={`Open ${project.title}`}>
        <img src={project.image} alt={project.imageAlt} loading="lazy" />
        <span className="tile-stage">{stageLabel(project.stage)}</span>
      </button>
      <div className="tile-copy">
        <p className="tile-craft">{project.category} <span>·</span> {project.location}</p>
        <h3><button type="button" onClick={() => onOpenProject(project)}>{project.title}</button></h3>
        <p>{project.description}</p>
        <span className="maker-link maker-link-static">
          <span className="maker-monogram" aria-hidden="true">
            {maker.avatarUrl ? <img src={maker.avatarUrl} alt="" /> : maker.initials}
          </span>
          <span>{maker.name}<small>{maker.craft}</small></span>
        </span>
      </div>
    </article>
  )
}

interface ProjectPageProps {
  project: Project
  onNavigate: (view: View) => void
  onBack?: () => void
  backLabel?: string
  shareLink?: string
  onCopyShare?: (url: string) => void
}

function ProjectPage({ project, onNavigate, onBack, backLabel = 'Back to portfolio', shareLink, onCopyShare }: ProjectPageProps) {
  const maker = makerForProject(project)
  return (
    <section className="page-section detail-page">
      <div className="detail-page-actions">
        <button className="back-link" type="button" onClick={onBack ?? (() => onNavigate('portfolio'))}><ArrowIcon /> {backLabel}</button>
        {shareLink && onCopyShare && (
          <button className="text-link" type="button" onClick={() => onCopyShare(shareLink)}>Copy project link</button>
        )}
      </div>
      <div className="detail-layout">
        <article className="project-detail">
          <div className="detail-image">
            <img src={project.image} alt={project.imageAlt} />
            <span className="tile-stage">{stageLabel(project.stage)}</span>
          </div>
          <p className="tile-craft">{project.category} <span>·</span> {project.location}</p>
          <h1>{project.title}</h1>
          <p className="detail-description">{project.description}</p>
          {project.updates?.length ? (
            <section className="detail-timeline" aria-labelledby="timeline-heading">
              <h2 id="timeline-heading">The work, over time</h2>
              <ol>
                {groupUpdatesByDay(project.updates).map((day) => (
                  <li key={day.key}>
                    <span className="timeline-dot" aria-hidden="true" />
                    <div>
                      <strong>{day.label}</strong>
                      <ol className="detail-timeline-day-updates">
                        {day.updates.map((update) => (
                          <li key={update.id}>
                            <strong>{update.title}</strong>
                            <small><time dateTime={update.createdAt}>{formatUpdateTime(update.createdAt)}</time> · {stageLabel(update.stage)}</small>
                            <p>{update.description}</p>
                            {update.attachments.length > 0 && <MediaPreviews files={update.attachments} />}
                          </li>
                        ))}
                      </ol>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </article>
        <aside className="maker-aside">
          <p className="section-label">The maker</p>
          <div className="maker-aside-profile">
            <span className="portrait-small" aria-hidden="true">
              {maker.avatarUrl ? <img src={maker.avatarUrl} alt="" /> : maker.initials}
            </span>
            <span><strong>{maker.name}</strong><small>{maker.craft} · {maker.location}</small></span>
          </div>
          <p>{maker.bio}</p>
          <ContactOptionsLinks contacts={project.contactOptions} />
        </aside>
      </div>
    </section>
  )
}

function ContactOptionsLinks({ contacts }: { contacts?: Maker['contactOptions'] }) {
  if (!contacts || !Object.values(contacts).some(Boolean)) {
    return <p className="maker-contact-note">Contact details have not been shared.</p>
  }
  const phone = contacts.phone?.replace(/[^\d+]/g, '')
  const whatsapp = contacts.whatsapp?.replace(/\D/g, '')
  return (
    <div className="maker-contact-options" aria-label="Maker contact details">
      {contacts.email && <a href={`mailto:${contacts.email}`}>{contacts.email}</a>}
      {contacts.phone && phone && <a href={`tel:${phone}`}>{contacts.phone}</a>}
      {contacts.whatsapp && whatsapp && (
        <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer">
          WhatsApp {contacts.whatsapp}
        </a>
      )}
    </div>
  )
}

interface ProjectDashboardProps {
  projects: Project[]
  accountName: string
  isLoading: boolean
  error: string
  onCreateProject: () => void
  onOpenProject: (project: Project) => void
}

function ProjectDashboard({ projects, accountName, isLoading, error, onCreateProject, onOpenProject }: ProjectDashboardProps) {
  return (
    <section className="page-section project-dashboard">
      <div className="dashboard-heading">
        <div>
          <p className="section-label">Your work, in one place</p>
          <h1>{accountName ? `${accountName}’s projects` : 'Your projects'}</h1>
          <p>Each project has its own space for the story, progress, and media.</p>
        </div>
        <button className="button button-dark dashboard-add-project" type="button" onClick={onCreateProject}>
          <Plus weight="bold" aria-hidden="true" /> Add project
        </button>
      </div>
      <div className="dashboard-summary">
        <span><strong>{projects.length}</strong> {projects.length === 1 ? 'project' : 'projects'}</span>
      </div>
      {error && <p className="status-banner" role="alert">{error}</p>}
      {isLoading ? (
        <div className="dashboard-empty" role="status"><p>Loading your projects…</p></div>
      ) : projects.length > 0 ? (
        <div className="owned-project-grid">
          {projects.map((project) => (
            <article className="owned-project-card" key={project.id}>
              <button type="button" className="owned-project-open" onClick={() => onOpenProject(project)}>
                <span className="owned-project-image">
                  <img src={project.image} alt={project.imageAlt} loading="lazy" />
                  <span className={`project-visibility ${project.status === 'published' && project.visibility === 'public' ? 'published' : 'private'}`}>
                    {project.status === 'published'
                      ? project.visibility === 'public' ? 'Published' : 'Private'
                      : project.visibility === 'public' ? 'Public draft' : 'Private draft'}
                  </span>
                </span>
                <span className="owned-project-copy">
                  <span className="tile-craft">{project.category} <span>·</span> {stageLabel(project.stage)}</span>
                  <strong>{project.title}</strong>
                  <span>{project.description}</span>
                  <span className="owned-project-link">Open project space <ArrowIcon /></span>
                </span>
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="dashboard-empty">
          <span className="empty-index">01</span>
          <div>
            <h2>Your first project starts here.</h2>
            <p>Give one piece of work a clear home. Add what you made, how it moved forward, and the details you want to remember.</p>
          </div>
          <button className="text-link" type="button" onClick={onCreateProject}>Create the first project <ArrowIcon /></button>
        </div>
      )}
    </section>
  )
}

interface ProjectSpacePageProps {
  project: Project
  accountName: string
  profileSlug: string
  profileIsPublic: boolean
  onNavigate: (view: View) => void
  onPublish: () => void
  onAddUpdate: (update: Omit<ProjectUpdate, 'id' | 'createdAt'>) => Promise<void>
  onSaveSettings: (values: Pick<Project, 'title' | 'description' | 'category' | 'location' | 'stage' | 'includeContact'> & { visibility: 'private' | 'public' }) => Promise<void>
  onCreateMedia: (files: File[]) => ProjectMedia[]
  onDiscardMedia: (media: ProjectMedia) => void
  onCopyShare: (url: string) => void
}

function ProjectSpacePage({
  project,
  accountName,
  profileSlug,
  profileIsPublic,
  onNavigate,
  onPublish,
  onAddUpdate,
  onSaveSettings,
  onCreateMedia,
  onDiscardMedia,
  onCopyShare,
}: ProjectSpacePageProps) {
  const [addingUpdate, setAddingUpdate] = useState(false)
  const [updateTitle, setUpdateTitle] = useState('')
  const [updateDescription, setUpdateDescription] = useState('')
  const [updateStage, setUpdateStage] = useState(project.stage)
  const [updateAttachments, setUpdateAttachments] = useState<ProjectMedia[]>([])
  const [savingUpdate, setSavingUpdate] = useState(false)
  const [projectSettings, setProjectSettings] = useState({
    title: project.title,
    description: project.description,
    category: project.category,
    location: project.location,
    stage: project.stage,
    visibility: project.visibility === 'public' ? 'public' as const : 'private' as const,
    includeContact: project.includeContact ?? false,
  })
  const [savingSettings, setSavingSettings] = useState(false)
  const [editingProject, setEditingProject] = useState(false)

  async function submitUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSavingUpdate(true)
    try {
      await onAddUpdate({
        title: updateTitle.trim(),
        description: updateDescription.trim(),
        stage: updateStage,
        attachments: updateAttachments,
      })
      setUpdateTitle('')
      setUpdateDescription('')
      setUpdateStage(project.stage)
      setUpdateAttachments([])
      setAddingUpdate(false)
    } catch {
      // The parent surfaces the API error in the app status banner.
    } finally {
      setSavingUpdate(false)
    }
  }

  async function submitProjectSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSavingSettings(true)
    try {
      await onSaveSettings(projectSettings)
      setEditingProject(false)
    } catch {
      // The parent surfaces the API error in the app status banner.
    } finally {
      setSavingSettings(false)
    }
  }

  return (
    <section className="page-section project-space-page">
      <button className="back-link" type="button" onClick={() => onNavigate('dashboard')}><ArrowIcon /> All projects</button>
      <header className="project-space-header">
        <div>
          <p className="project-breadcrumb">{accountName} <span>/</span> Projects <span>/</span> {project.title}</p>
          <h1>{project.title}</h1>
          <p className="project-space-meta">{project.category} <span>·</span> {project.location} <span>·</span> {stageLabel(project.stage)}</p>
        </div>
        <div className="project-space-actions">
          <span className={`project-visibility ${project.status === 'published' && project.visibility === 'public' ? 'published' : 'private'}`}>
            {project.status === 'published'
              ? project.visibility === 'public' ? 'Published' : 'Private'
              : project.visibility === 'public' ? 'Public draft' : 'Private draft'}
          </span>
          {project.status === 'draft' && project.visibility === 'public' && (
            profileIsPublic
              ? <button className="button button-dark" type="button" onClick={onPublish}>Publish project <ArrowIcon /></button>
              : <button className="button button-dark" type="button" onClick={() => onNavigate('profile')}>Make profile public to publish <ArrowIcon /></button>
          )}
          {project.status === 'published' && project.visibility !== 'public' && (
            profileIsPublic
              ? <button className="button button-dark" type="button" onClick={onPublish}>Make project public <ArrowIcon /></button>
              : <button className="button button-dark" type="button" onClick={() => onNavigate('profile')}>Make profile public first <ArrowIcon /></button>
          )}
        </div>
      </header>
      <nav className="project-space-tabs" aria-label="Project sections">
        <a href="#overview">Overview</a>
        <a href="#progress">Progress</a>
        <a href="#media">Media</a>
      </nav>
      <section className="project-world" id="overview">
        <img className="project-world-cover" src={project.image} alt={project.imageAlt} />
        <div className="project-world-copy">
          <div className="project-overview-heading">
            <p className="section-label">Project overview</p>
            {!editingProject && (
              <button className="text-link project-edit-trigger" type="button" onClick={() => setEditingProject(true)}>
                <PencilSimple aria-hidden="true" /> Edit details
              </button>
            )}
          </div>
          {editingProject ? (
            <form className="project-form project-overview-form" onSubmit={submitProjectSettings}>
              <label>Project title
                <input required maxLength={90} value={projectSettings.title} onChange={(event) => setProjectSettings({ ...projectSettings, title: event.target.value })} />
              </label>
              <label>What was the work?
                <textarea required maxLength={500} rows={4} value={projectSettings.description} onChange={(event) => setProjectSettings({ ...projectSettings, description: event.target.value })} />
              </label>
              <SuggestedChoiceField
                label="Craft or service"
                value={projectSettings.category}
                options={craftOptions}
                onChange={(category) => setProjectSettings((current) => ({ ...current, category }))}
                required
                maxLength={60}
                placeholder="Type your craft or service"
              />
              <SuggestedChoiceField
                label="Where was the work made?"
                value={projectSettings.location}
                options={locationOptions}
                onChange={(location) => setProjectSettings((current) => ({ ...current, location }))}
                maxLength={100}
                placeholder="Type a town, city, or area"
              />
              <label>Current stage
                <select value={projectSettings.stage} onChange={(event) => setProjectSettings({ ...projectSettings, stage: event.target.value as ProjectStage })}>
                  <option value="planned">Planned</option>
                  <option value="in-progress">In progress</option>
                  <option value="completed">Completed</option>
                </select>
              </label>
              <fieldset className="visibility-fieldset">
                <legend>Visibility</legend>
                <label className="visibility-toggle">
                  <span>
                    <strong>{projectSettings.visibility === 'public' ? 'Public' : 'Private'}</strong>
                    <small>
                      {projectSettings.visibility === 'public'
                        ? 'Customers can see this project after you publish it.'
                        : 'Only you can see this project. You can make it public later.'}
                    </small>
                  </span>
                  <input
                    type="checkbox"
                    role="switch"
                    aria-label="Project visibility"
                    checked={projectSettings.visibility === 'public'}
                    onChange={(event) => setProjectSettings({
                      ...projectSettings,
                      visibility: event.target.checked ? 'public' : 'private',
                    })}
                  />
                </label>
              </fieldset>
              <fieldset className="visibility-fieldset">
                <legend>Contact details</legend>
                <label className="visibility-toggle">
                  <span>
                    <strong>{projectSettings.includeContact ? 'Include my contact details' : 'Keep contact details private'}</strong>
                    <small>Share the contact details enabled on your maker profile with customers viewing this project.</small>
                  </span>
                  <input
                    type="checkbox"
                    role="switch"
                    aria-label="Include contact details on this project"
                    checked={projectSettings.includeContact}
                    onChange={(event) => setProjectSettings({
                      ...projectSettings,
                      includeContact: event.target.checked,
                    })}
                  />
                </label>
              </fieldset>
              <div className="project-edit-actions">
                <button className="button button-dark" type="submit" disabled={savingSettings}>
                  {savingSettings ? 'Saving…' : 'Save project details'} <ArrowIcon />
                </button>
                <button className="text-link" type="button" onClick={() => {
                  setProjectSettings({
                    title: project.title,
                    description: project.description,
                    category: project.category,
                    location: project.location,
                    stage: project.stage,
                    visibility: project.visibility === 'public' ? 'public' : 'private',
                    includeContact: project.includeContact ?? false,
                  })
                  setEditingProject(false)
                }}>Cancel</button>
              </div>
            </form>
          ) : (
            <>
              <p>{project.description}</p>
              <div className="project-world-facts">
                <span><small>Maker</small><strong>{accountName}</strong></span>
                <span><small>Current stage</small><strong>{stageLabel(project.stage)}</strong></span>
                <span><small>Visibility</small><strong>{project.status === 'published' && project.visibility === 'public' ? 'Public' : 'Private'}</strong></span>
              </div>
              {project.status === 'published' && project.visibility === 'public' && profileIsPublic && project.slug && (
                <div className="project-share-link">
                  <label htmlFor="project-share-url">Share this project</label>
                  <div>
                    <input
                      id="project-share-url"
                      readOnly
                      value={`${window.location.origin}/@${encodeURIComponent(profileSlug)}/${encodeURIComponent(project.slug)}`}
                    />
                    <button
                      className="button button-dark"
                      type="button"
                      onClick={() => onCopyShare(`${window.location.origin}/@${encodeURIComponent(profileSlug)}/${encodeURIComponent(project.slug ?? '')}`)}
                    >
                      Copy link
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>
      <section className="project-world-section" id="progress">
        <div className="project-section-heading">
          <div><p className="section-label">Project progress</p><h2>Work, as it happens.</h2></div>
          <span>{project.milestones.length + (project.updates?.length ?? 0)} updates</span>
        </div>
        <ol className="project-log">
          {project.milestones.map((milestone, index) => (
            <li className={index < project.milestones.length - 1 ? 'is-complete' : ''} key={`${project.id}-${milestone.label}`}>
              <span className="timeline-dot" aria-hidden="true" />
              <div><strong>{milestone.label}</strong><small>{milestone.date}</small></div>
              <span className="project-log-stage">{stageLabel(milestone.stage)}</span>
            </li>
          ))}
        </ol>
        <div className="project-updates-heading">
          <div>
            <h3>Updates from the workshop</h3>
            <p>Each update is dated automatically. Add photos or videos here to keep them with the update.</p>
          </div>
          {!addingUpdate && (
            <button className="button button-dark" type="button" onClick={() => setAddingUpdate(true)}>
              Add progress update <ArrowIcon />
            </button>
          )}
        </div>
        {addingUpdate && (
          <form className="project-update-form" onSubmit={submitUpdate}>
            <h3>What changed?</h3>
            <label>
              Give this update a short heading
              <input
                value={updateTitle}
                onChange={(event) => setUpdateTitle(event.target.value)}
                required
                maxLength={100}
                placeholder="For example, First firing is complete"
              />
            </label>
            <label>
              Add a note for your customers
              <textarea
                value={updateDescription}
                onChange={(event) => setUpdateDescription(event.target.value)}
                required
                maxLength={2000}
                rows={4}
                placeholder="What did you make, change, or decide? Add the useful details in your own words."
              />
            </label>
            <label>
              Project stage
              <select value={updateStage} onChange={(event) => setUpdateStage(event.target.value as ProjectStage)}>
                <option value="planned">Planned</option>
                <option value="in-progress">In progress</option>
                <option value="completed">Completed</option>
              </select>
            </label>
            <MediaPicker
              files={updateAttachments}
              onAddFiles={(files) => setUpdateAttachments((current) => [...current, ...onCreateMedia(files)])}
              onRemoveFile={(media) => {
                onDiscardMedia(media)
                setUpdateAttachments((current) => current.filter((file) => file.id !== media.id))
              }}
              onDescriptionChange={(id, description) => setUpdateAttachments((current) => current.map((media) => (
                media.id === id ? { ...media, description } : media
              )))}
            />
            <div className="project-update-actions">
              <button className="button button-dark" type="submit" disabled={savingUpdate}>
                {savingUpdate ? 'Saving update…' : 'Add to project history'} <ArrowIcon />
              </button>
              <button className="text-link" type="button" onClick={() => {
                updateAttachments.forEach(onDiscardMedia)
                setUpdateAttachments([])
                setAddingUpdate(false)
              }}>Cancel</button>
            </div>
          </form>
        )}
        {project.updates?.length ? (
          <ol className="project-update-timeline">
            {groupUpdatesByDay(project.updates).map((day) => (
              <li key={day.key}>
                <span className="update-timeline-mark" aria-hidden="true" />
                <div className="project-update-day-content">
                  <p className="project-update-day-label">{day.label}</p>
                  <ol className="project-update-day-list">
                    {day.updates.map((update) => (
                      <li key={update.id}>
                        <article>
                          <div className="update-meta">
                            <time dateTime={update.createdAt}>{formatUpdateTime(update.createdAt)}</time>
                            <span>{stageLabel(update.stage)}</span>
                          </div>
                          <h3>{update.title}</h3>
                          <p>{update.description}</p>
                          {update.attachments.length > 0 && <MediaPreviews files={update.attachments} />}
                        </article>
                      </li>
                    ))}
                  </ol>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          !addingUpdate && (
            <div className="project-updates-empty">
              <p>When something changes, add a dated update so customers can follow the work.</p>
              <button className="text-link" type="button" onClick={() => setAddingUpdate(true)}>Write the first update <ArrowIcon /></button>
            </div>
          )
        )}
      </section>
      <section className="project-world-section project-media-section" id="media">
        <div className="project-section-heading">
          <div><p className="section-label">Project media</p><h2>Images and video</h2></div>
          <span>{project.attachments?.length ?? 0} attached</span>
        </div>
        {project.attachments?.length
          ? <MediaPreviews files={project.attachments} />
          : <p className="project-empty-media">No project media added yet. Add photos or video while editing this project.</p>}
      </section>
    </section>
  )
}

function MediaPreviews({ files }: { files: ProjectMedia[] }) {
  if (!files.length) return null
  return (
    <div className="media-preview-grid">
      {files.map(({ id, url, description, filename, mimeType }) => (
        <figure key={id}>
        {mimeType.startsWith('video/')
          ? <video src={url} controls preload="metadata" aria-label={filename} />
          : <img src={url} alt={description || filename} />}
        <figcaption>{description || filename}</figcaption>
        </figure>
      ))}
    </div>
  )
}

interface MediaPickerProps {
  files: ProjectMedia[]
  onAddFiles: (files: File[]) => void
  onRemoveFile: (media: ProjectMedia) => void
  onDescriptionChange: (id: string, description: string) => void
}

function MediaPicker({ files, onAddFiles, onRemoveFile, onDescriptionChange }: MediaPickerProps) {
  const input = useRef<HTMLInputElement>(null)

  function addFiles(selected: FileList | File[]) {
    const accepted = Array.from(selected).filter((file) => file.type.startsWith('image/') || file.type.startsWith('video/'))
    if (accepted.length) onAddFiles(accepted)
  }

  return (
    <section className="media-picker" aria-label="Project photos and videos">
      <div className="media-picker-heading">
        <div>
          <h3>Photos and videos</h3>
          <p>Add several at once, then add a short description if it helps explain the work.</p>
        </div>
        {files.length > 0 && <span>{files.length} added</span>}
      </div>
      <button
        className="media-dropzone"
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          addFiles(event.dataTransfer.files)
        }}
      >
        <span className="media-add-icon" aria-hidden="true"><Plus weight="bold" /></span>
        <span className="media-dropzone-copy">
          <strong>Add photos or videos</strong>
          <small>Choose more than one file, or drop them here</small>
        </span>
      </button>
      <input
        ref={input}
        className="media-file-input"
        type="file"
        accept="image/*,video/*"
        multiple
        aria-label="Choose project photos and videos"
        onChange={(event) => {
          addFiles(event.currentTarget.files ?? [])
          event.currentTarget.value = ''
        }}
      />
      {files.length > 0 && (
        <div className="media-editor-grid">
          {files.map((media) => (
            <article className="media-editor-item" key={media.id}>
              {media.mimeType.startsWith('video/')
                ? <video src={media.url} controls preload="metadata" aria-label={`Preview of ${media.filename}`} />
                : <img src={media.url} alt={media.description || `Preview of ${media.filename}`} />}
              <div className="media-editor-caption">
                <span className="media-file-name">{media.filename}</span>
                <label className="media-description-field">
                  {media.mimeType.startsWith('video/') ? 'Video caption (optional)' : 'Photo description (optional)'}
                  <input
                    value={media.description}
                    maxLength={240}
                    onChange={(event) => onDescriptionChange(media.id, event.target.value)}
                    placeholder={media.mimeType.startsWith('video/') ? 'What is happening in this clip?' : 'What should customers notice?'}
                  />
                </label>
                {media.uploadProgress !== undefined && media.uploadProgress < 100 && (
                  <span className="media-upload-progress">{media.uploadProgress === 0 ? 'Upload ready' : `Uploading ${media.uploadProgress}%`}</span>
                )}
                <button className="media-remove-button" type="button" onClick={() => onRemoveFile(media)}>
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function MakerProfilePage({
  accountName,
  email,
  profileType,
  details,
  onSave,
  onUploadAvatar,
  onNavigate,
  onCopyShare,
}: {
  accountName: string
  email: string
  profileType: AuthUser['profile']['profile_type']
  details: ProfileDetails
  onSave: (details: Omit<ProfileDetails, 'avatarUrl'>) => Promise<void>
  onUploadAvatar: (file: File) => Promise<string | null>
  onNavigate: (view: View) => void
  onCopyShare: (url: string) => void
}) {
  const [draft, setDraft] = useState(details)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarError, setAvatarError] = useState('')
  const avatarInput = useRef<HTMLInputElement>(null)

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    try {
      await onSave(draft)
      setSaved(true)
    } catch {
      setSaved(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="page-section maker-profile-page">
      <button className="back-link" type="button" onClick={() => onNavigate('dashboard')}><ArrowIcon /> Your projects</button>
      <header className="maker-profile-heading">
        <button
          className="maker-profile-avatar"
          type="button"
          onClick={() => avatarInput.current?.click()}
          disabled={uploadingAvatar}
          aria-label={draft.avatarUrl ? 'Change profile photo' : 'Add a profile photo'}
        >
          {draft.avatarUrl
            ? <img src={draft.avatarUrl} alt="" />
            : <span aria-hidden="true">{accountName.slice(0, 1).toLocaleUpperCase()}</span>}
          <span className="maker-profile-avatar-action">{uploadingAvatar ? 'Uploading…' : 'Add photo'}</span>
        </button>
        <input
          ref={avatarInput}
          className="visually-hidden"
          type="file"
          accept="image/jpeg,image/png"
          aria-label="Choose a JPEG or PNG profile photo"
          onChange={async (event) => {
            const file = event.currentTarget.files?.[0]
            event.currentTarget.value = ''
            if (!file) return
            setUploadingAvatar(true)
            setAvatarError('')
            try {
              const avatarUrl = await onUploadAvatar(file)
              setDraft((current) => ({ ...current, avatarUrl: avatarUrl ?? '' }))
            } catch (error) {
              setAvatarError(error instanceof Error ? error.message : 'We could not upload your profile photo.')
            } finally {
              setUploadingAvatar(false)
            }
          }}
        />
        <div>
          <p className="section-label">Your maker profile</p>
          <h1>{accountName}</h1>
          <p>{email} <span>·</span> {profileType === 'individual' ? 'Independent maker' : profileType === 'workshop' ? 'Workshop' : 'Business'}</p>
          <small className="maker-profile-avatar-hint">Choose a JPEG or PNG, up to 5 MB.</small>
        </div>
      </header>
      {avatarError && <p className="status-banner" role="alert">{avatarError}</p>}
      <div className="maker-profile-layout">
        <form className="profile-edit-form" onSubmit={submitProfile}>
          <h2>Tell customers about your work</h2>
          <label>Decraft username
            <input
              value={draft.slug}
              required
              minLength={3}
              maxLength={40}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              autoCapitalize="none"
              autoCorrect="off"
              onChange={(event) => { setDraft({ ...draft, slug: event.target.value }); setSaved(false) }}
              aria-describedby="profile-username-help"
            />
            <small id="profile-username-help">Use lowercase letters, numbers, and hyphens. This becomes your unique shareable profile address.</small>
          </label>
          <label>Your craft or service
            <input
              value={draft.craft}
              maxLength={80}
              onChange={(event) => { setDraft({ ...draft, craft: event.target.value }); setSaved(false) }}
              placeholder="For example, ceramics or furniture repair"
            />
          </label>
          <label>Where you work
            <input
              value={draft.location}
              maxLength={100}
              onChange={(event) => { setDraft({ ...draft, location: event.target.value }); setSaved(false) }}
              placeholder="Your town or neighbourhood"
            />
          </label>
          <label>A little about your work
            <textarea
              value={draft.bio}
              maxLength={600}
              rows={5}
              onChange={(event) => { setDraft({ ...draft, bio: event.target.value }); setSaved(false) }}
              placeholder="What do you make or repair? What should a customer know before getting in touch?"
            />
          </label>
          <fieldset className="profile-contact-fields">
            <legend>Contact details</legend>
            <label>Email for customers
              <input
                type="email"
                value={draft.contactEmail}
                maxLength={254}
                onChange={(event) => { setDraft({ ...draft, contactEmail: event.target.value }); setSaved(false) }}
                placeholder="hello@example.com"
              />
            </label>
            <label>Phone
              <input
                type="tel"
                value={draft.contactPhone}
                maxLength={40}
                onChange={(event) => { setDraft({ ...draft, contactPhone: event.target.value }); setSaved(false) }}
                placeholder="+234 800 000 0000"
              />
            </label>
            <label>WhatsApp
              <input
                type="tel"
                value={draft.contactWhatsapp}
                maxLength={40}
                onChange={(event) => { setDraft({ ...draft, contactWhatsapp: event.target.value }); setSaved(false) }}
                placeholder="+234 800 000 0000"
              />
            </label>
            <label className="profile-public-toggle">
              <input
                type="checkbox"
                checked={draft.showContactOnProfile}
                onChange={(event) => { setDraft({ ...draft, showContactOnProfile: event.target.checked }); setSaved(false) }}
              />
              <span>
                <strong>Show contact details on my profile</strong>
                <small>Only displayed when your maker profile is public. Project contact sharing is controlled separately.</small>
              </span>
            </label>
          </fieldset>
          <label className="profile-public-toggle">
            <input
              type="checkbox"
              checked={draft.isPublic}
              onChange={(event) => { setDraft({ ...draft, isPublic: event.target.checked }); setSaved(false) }}
            />
            <span>
              <strong>Make my profile public</strong>
              <small>Customers can discover your profile and published projects.</small>
            </span>
          </label>
          <div className="profile-edit-actions">
            <button className="button button-dark" type="submit" disabled={saving}>
              {saving ? 'Saving profile…' : 'Save profile'} <ArrowIcon />
            </button>
            {saved && <p role="status">Profile saved to your account.</p>}
          </div>
          {draft.isPublic && (
            <div className="profile-share-link">
              <label htmlFor="profile-share-url">Public profile link</label>
              <div>
                <input
                  id="profile-share-url"
                  readOnly
                  value={`${window.location.origin}/@${encodeURIComponent(draft.slug)}`}
                />
                <button
                  className="button button-dark"
                  type="button"
                  disabled={draft.slug !== details.slug || !details.isPublic}
                  onClick={() => onCopyShare(`${window.location.origin}/@${encodeURIComponent(draft.slug)}`)}
                >
                  Copy link
                </button>
              </div>
              {!details.isPublic && <small>Save your profile as public before sharing this link.</small>}
            </div>
          )}
        </form>
        <aside className="maker-profile-preview">
          <p className="section-label">Customer preview</p>
          <h2>{accountName || 'Your name'}</h2>
          <p className="maker-profile-preview-craft">{draft.craft || 'Add your craft or service'}{draft.location && ` · ${draft.location}`}</p>
          <p>{draft.bio || 'A short introduction to your work will appear here.'}</p>
          <button className="text-link" type="button" onClick={() => onNavigate('dashboard')}>View your projects <ArrowIcon /></button>
        </aside>
      </div>
    </section>
  )
}

function MakerSettingsPage({
  accountName,
  email,
  details,
  onSave,
  onNavigate,
}: {
  accountName: string
  email: string
  details: ProfileDetails
  onSave: (details: Omit<ProfileDetails, 'avatarUrl'>) => Promise<void>
  onNavigate: (view: View) => void
}) {
  const [isPublic, setIsPublic] = useState(details.isPublic)
  const [saving, setSaving] = useState(false)

  async function savePrivacy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    try {
      await onSave({ ...details, isPublic })
    } catch {
      setIsPublic(details.isPublic)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="page-section maker-settings-page">
      <button className="back-link" type="button" onClick={() => onNavigate('dashboard')}><ArrowIcon /> Your projects</button>
      <header className="workspace-heading">
        <div>
          <p className="section-label">Account settings</p>
          <h1>Settings</h1>
          <p>Manage your profile visibility and account details.</p>
        </div>
      </header>
      <section className="settings-card" id="privacy">
        <div>
          <p className="section-label">Privacy</p>
          <h2>Who can find your work?</h2>
          <p>Your email stays private. A public profile lets customers browse your profile and published projects.</p>
        </div>
        <form onSubmit={savePrivacy}>
          <p><strong>{accountName}</strong><span>{email}</span></p>
          <label className="profile-public-toggle">
            <input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} />
            <span>
              <strong>Public maker profile</strong>
              <small>{isPublic ? 'Customers can find your published work.' : 'Your profile is not listed for customers.'}</small>
            </span>
          </label>
          <button className="button button-dark" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save privacy settings'} <ArrowIcon />
          </button>
        </form>
      </section>
    </section>
  )
}

interface WorkspacePageProps {
  title: string
  description: string
  stage: ProjectStage
  visibility: 'private' | 'public'
  includeContact: boolean
  category: string
  location: string
  accountName: string
  attachments: ProjectMedia[]
  onTitleChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onStageChange: (value: ProjectStage) => void
  onVisibilityChange: (value: 'private' | 'public') => void
  onIncludeContactChange: (value: boolean) => void
  onCategoryChange: (value: string) => void
  onLocationChange: (value: string) => void
  onAttachmentsChange: (files: File[]) => void
  onRemoveAttachment: (media: ProjectMedia) => void
  onChangeAttachmentDescription: (id: string, description: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onNavigate: (view: View) => void
  isSaving: boolean
}

function WorkspacePage({
  title,
  description,
  stage,
  visibility,
  includeContact,
  category,
  location,
  accountName,
  attachments,
  onTitleChange,
  onDescriptionChange,
  onStageChange,
  onVisibilityChange,
  onIncludeContactChange,
  onCategoryChange,
  onLocationChange,
  onAttachmentsChange,
  onRemoveAttachment,
  onChangeAttachmentDescription,
  onSubmit,
  onNavigate,
  isSaving,
}: WorkspacePageProps) {
  const coverImage = attachments.find((attachment) => attachment.mimeType.startsWith('image/'))
  return (
    <section className="page-section workspace-page">
      <button className="back-link" type="button" onClick={() => onNavigate('dashboard')}><ArrowIcon /> Back to your projects</button>
      <div className="workspace-heading">
        <div>
          <h1>Give this project a home.</h1>
          <p>Add a few details now. You can share the progress as the work takes shape.</p>
        </div>
      </div>
      <div className="workspace-layout">
        <form className="project-form" onSubmit={onSubmit}>
          <label>Project title
            <input value={title} onChange={(event) => onTitleChange(event.target.value)} required maxLength={90} placeholder="e.g. A set of hand-thrown serving bowls" />
          </label>
          <label>What was the work?
            <textarea value={description} onChange={(event) => onDescriptionChange(event.target.value)} required rows={5} maxLength={500} placeholder="Add the brief, the materials, or a detail about how it came together." />
          </label>
          <SuggestedChoiceField
            label="Craft or service"
            value={category}
            options={craftOptions}
            onChange={onCategoryChange}
            required
            maxLength={60}
            placeholder="Type your craft or service"
          />
          <SuggestedChoiceField
            label="Where was the work made?"
            value={location}
            options={locationOptions}
            onChange={onLocationChange}
            maxLength={100}
            placeholder="Type a town, city, or area"
          />
          <fieldset className="stage-fieldset">
            <legend>Where is the project now?</legend>
            <div className="stage-options">
              {([
                ['planned', 'Planned'],
                ['in-progress', 'In progress'],
                ['completed', 'Completed'],
              ] as const).map(([value, label]) => (
                <label className={`stage-option${stage === value ? ' is-selected' : ''}`} key={value}>
                  <input type="radio" name="stage" value={value} checked={stage === value} onChange={() => onStageChange(value)} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="visibility-fieldset">
            <legend>Visibility</legend>
            <label className="visibility-toggle">
              <span>
                <strong>{visibility === 'public' ? 'Public' : 'Private'}</strong>
                <small>
                  {visibility === 'public'
                    ? 'Customers can see this project after you publish it.'
                    : 'Only you can see this project. You can make it public later.'}
                </small>
              </span>
              <input
                type="checkbox"
                role="switch"
                aria-label="Project visibility"
                checked={visibility === 'public'}
                onChange={(event) => onVisibilityChange(event.target.checked ? 'public' : 'private')}
              />
            </label>
          </fieldset>
          <fieldset className="visibility-fieldset">
            <legend>Contact details</legend>
            <label className="visibility-toggle">
              <span>
                <strong>{includeContact ? 'Include my contact details' : 'Keep contact details private'}</strong>
                <small>Share the contact details enabled on your maker profile with customers viewing this project.</small>
              </span>
              <input
                type="checkbox"
                role="switch"
                aria-label="Include contact details on this project"
                checked={includeContact}
                onChange={(event) => onIncludeContactChange(event.target.checked)}
              />
            </label>
          </fieldset>
          <MediaPicker
            files={attachments}
            onAddFiles={onAttachmentsChange}
            onRemoveFile={onRemoveAttachment}
            onDescriptionChange={onChangeAttachmentDescription}
          />
          <button className="button button-dark form-submit" type="submit" disabled={isSaving}>
            {isSaving ? 'Saving project…' : 'Save draft and review'} <ArrowIcon />
          </button>
        </form>
        <aside className="workspace-preview">
          <p className="section-label">Your folio preview</p>
          <img src={coverImage?.url ?? '/images/project-placeholder.svg'} alt={coverImage?.filename ?? 'Project photo preview'} />
          <p className="tile-craft">{category || 'Craft or service'} <span>·</span> {location || 'Add a location'}</p>
          <p className="preview-caption">For {accountName || 'your workshop'}</p>
          <h2>{title || 'Your project title'}</h2>
          <p>{description || 'The story of the work will appear here.'}</p>
          <MilestoneTrack stage={stage} />
          <p className="preview-caption">
            {visibility === 'public'
              ? 'Customers can see this project after you publish it.'
              : 'Only you can see this project.'}
          </p>
        </aside>
      </div>
    </section>
  )
}

interface ReviewPageProps {
  project: Project
  profileIsPublic: boolean
  onPublish: () => void
  onNavigate: (view: View) => void
}

function ReviewPage({ project, profileIsPublic, onPublish, onNavigate }: ReviewPageProps) {
  return (
    <section className="page-section review-page">
      <button className="back-link" type="button" onClick={() => onNavigate('project-space')}><ArrowIcon /> Back to project</button>
      <div className="review-heading">
        <h1>Does this look ready?</h1>
        <p>Check the details and media before publishing your project.</p>
        {project.status === 'draft' && project.visibility === 'public' && profileIsPublic && (
          <button className="button button-dark" type="button" onClick={onPublish}>Publish project <ArrowIcon /></button>
        )}
        {project.status === 'draft' && project.visibility === 'public' && !profileIsPublic && (
          <button className="button button-dark" type="button" onClick={() => onNavigate('profile')}>Make profile public to publish <ArrowIcon /></button>
        )}
        {project.status === 'draft' && project.visibility !== 'public' && (
          <p className="form-note">This project is a private draft. Choose “Public when published” in project settings before publishing.</p>
        )}
      </div>
      <article className="review-folio">
        <img src={project.image} alt={project.imageAlt} />
        <div className="review-copy">
          <p className="tile-craft">{project.category} <span>·</span> {project.location}</p>
          <span className="draft-state">Draft · Not public</span>
          <h2>{project.title}</h2>
          <p>{project.description}</p>
          {project.attachments?.length ? <MediaPreviews files={project.attachments} /> : null}
          <MilestoneTrack stage={project.stage} />
          <div className="review-actions">
            <button className="text-link" type="button" onClick={() => onNavigate('project-space')}>Keep as a draft</button>
          </div>
          <p className="preview-caption">Customers cannot see this project until you publish it.</p>
        </div>
      </article>
    </section>
  )
}

function MilestoneTrack({ stage }: { stage: ProjectStage }) {
  const stages: ProjectStage[] = ['planned', 'in-progress', 'completed']
  const currentIndex = stages.indexOf(stage)
  return (
    <div className="milestone-track" aria-label={`Project stage: ${stageLabel(stage)}`}>
      {stages.map((item, index) => (
        <span className={index <= currentIndex ? 'is-reached' : ''} key={item}>
          <i aria-hidden="true" />
          {stageLabel(item)}
        </span>
      ))}
    </div>
  )
}

function stageLabel(stage: ProjectStage) {
  if (stage === 'in-progress') return 'In progress'
  if (stage === 'completed') return 'Completed'
  return 'Planned'
}

function Footer({ isAuthenticated, onNavigate }: { isAuthenticated: boolean; onNavigate: (view: View) => void }) {
  return (
    <footer className="site-footer">
      <button className="wordmark footer-wordmark" type="button" onClick={() => onNavigate('home')}>
        <BrandMark /><span>Decraft</span>
      </button>
      <p>Built around the work, and the people who make it.</p>
      <nav aria-label="Footer navigation">
        <button type="button" onClick={() => onNavigate('how')}>How it works</button>
        {isAuthenticated && <button type="button" onClick={() => onNavigate('discover')}>Home</button>}
      </nav>
    </footer>
  )
}

function AuthStatePage({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <section className="auth-state page-section" role="status">
      <p className="section-label">Your workspace</p>
      <h1>{message}</h1>
      {onRetry && <button className="button button-dark" type="button" onClick={onRetry}>Try again <ArrowIcon /></button>}
    </section>
  )
}

function NotFoundPage({ onNavigate }: { onNavigate: (view: View) => void }) {
  return (
    <section className="auth-state page-section">
      <p className="section-label">Page not found</p>
      <h1>That page has moved on.</h1>
      <button className="button button-dark" type="button" onClick={() => onNavigate('home')}>Back to Decraft <ArrowIcon /></button>
    </section>
  )
}

export default App
