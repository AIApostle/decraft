import { DetailedError, Upload } from 'tus-js-client'
import type { ContactOptions, Maker, Project, ProjectMedia, ProjectStage, ProjectUpdate } from '../data/sampleData'
import { apiRequest, ApiError } from './authApi'

type ApiStage = 'planned' | 'in_progress' | 'completed'
type ApiVisibility = 'private' | 'public' | 'client_only'

interface ApiMediaAsset {
  id: string
  original_filename: string
  media_type: 'image' | 'video'
  mime_type: string
  file_size_bytes: number
  caption: string | null
  sort_order: number
  processing_status: string
  signed_url: string | null
  project_update_id: string | null
}

interface ApiProjectUpdate {
  id: string
  title: string
  content: string
  stage: ApiStage
  created_at: string
  visibility: ApiVisibility
  publication_status: string
  media_assets: ApiMediaAsset[]
}

interface ApiProject {
  id: string
  slug: string
  owner_profile_id: string
  owner_profile_slug: string | null
  owner_profile_public: boolean
  owner_name: string | null
  owner_primary_craft: string | null
  owner_city: string | null
  owner_bio: string | null
  title: string
  description: string
  category: string
  location_label: string | null
  stage: ApiStage
  visibility: ApiVisibility
  include_contact: boolean
  contact_options: ApiContactOptions | null
  publication_status: string
  created_at: string
  published_at: string | null
  media_assets: ApiMediaAsset[]
  updates: ApiProjectUpdate[]
}

interface UploadCapability {
  media_asset_id: string
  bucket_id: string
  storage_path: string
  upload_endpoint: string
  upload_token: string
}

interface ApiProfile {
  id: string
  slug: string
  avatar_url: string | null
  display_name: string
  profile_type: 'individual' | 'workshop' | 'business'
  primary_craft: string | null
  city: string | null
  bio: string | null
  is_public: boolean
  contact_email: string | null
  contact_phone: string | null
  contact_whatsapp: string | null
  show_contact_on_profile: boolean
}

interface ApiContactOptions {
  email: string | null
  phone: string | null
  whatsapp: string | null
}

export interface PublicMakerProfile {
  slug: string
  maker: Maker
  projects: Project[]
}

function toApiStage(stage: ProjectStage): ApiStage {
  return stage === 'in-progress' ? 'in_progress' : stage
}

function fromApiStage(stage: ApiStage): ProjectStage {
  return stage === 'in_progress' ? 'in-progress' : stage
}

function mapMedia(media: ApiMediaAsset): ProjectMedia {
  return {
    id: media.id,
    url: media.signed_url ?? '',
    filename: media.original_filename,
    mimeType: media.mime_type,
    description: media.caption ?? '',
  }
}

function mapUpdate(update: ApiProjectUpdate): ProjectUpdate {
  return {
    id: update.id,
    title: update.title,
    description: update.content,
    createdAt: update.created_at,
    stage: fromApiStage(update.stage),
    attachments: readyMedia(update.media_assets),
  }
}

function readyMedia(media: ApiMediaAsset[]): ProjectMedia[] {
  return media
    .filter((asset) => asset.processing_status === 'ready' && asset.signed_url)
    .map(mapMedia)
}

export function mapProject(project: ApiProject): Project {
  const attachments = readyMedia(project.media_assets)
  const cover = attachments.find((media) => media.mimeType.startsWith('image/'))
  return {
    id: project.id,
    makerId: project.owner_profile_id,
    slug: project.slug,
    ownerProfileSlug: project.owner_profile_slug ?? undefined,
    ownerName: project.owner_name ?? undefined,
    ownerCraft: project.owner_primary_craft ?? undefined,
    ownerLocation: project.owner_city ?? undefined,
    ownerBio: project.owner_bio ?? undefined,
    title: project.title,
    category: project.category,
    location: project.location_label ?? project.owner_city ?? '',
    description: project.description,
    image: cover?.url ?? '/images/project-placeholder.svg',
    imageAlt: cover?.description || cover?.filename || 'Project photo',
    status: project.publication_status === 'published' ? 'published' : 'draft',
    stage: fromApiStage(project.stage),
    visibility: project.visibility,
    includeContact: project.include_contact,
    contactOptions: project.contact_options ? {
      email: project.contact_options.email ?? undefined,
      phone: project.contact_options.phone ?? undefined,
      whatsapp: project.contact_options.whatsapp ?? undefined,
    } : undefined,
    attachments,
    milestones: [],
    updates: project.updates.map(mapUpdate),
  }
}

export async function listProjects(): Promise<Project[]> {
  const response = await apiRequest<ApiProject[]>('/api/v1/projects')
  return response.map(mapProject)
}

export async function listDiscoverProjects(): Promise<Project[]> {
  const response = await apiRequest<ApiProject[]>('/api/v1/projects/discover')
  return response.map(mapProject)
}

export async function getPublicProfile(profileSlug: string): Promise<PublicMakerProfile> {
  const response = await apiRequest<{
    slug: string
    display_name: string
    profile_type: 'individual' | 'workshop' | 'business'
    primary_craft: string | null
    city: string | null
    bio: string | null
    avatar_url: string | null
    contact_options: ApiContactOptions | null
    projects: ApiProject[]
  }>(`/api/v1/projects/share/${encodeURIComponent(profileSlug)}`)
  const name = response.display_name
  return {
    slug: response.slug,
    maker: {
      id: response.slug,
      name,
      craft: response.primary_craft ?? 'Maker',
      location: response.city ?? '',
      bio: response.bio ?? '',
      contactOptions: response.contact_options ? mapContactOptions(response.contact_options) : undefined,
      initials: name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toLocaleUpperCase(),
      avatarUrl: response.avatar_url ?? undefined,
    },
    projects: response.projects.map(mapProject),
  }
}

function mapContactOptions(contacts: ApiContactOptions): ContactOptions {
  return {
    email: contacts.email ?? undefined,
    phone: contacts.phone ?? undefined,
    whatsapp: contacts.whatsapp ?? undefined,
  }
}

export async function getPublicProject(profileSlug: string, projectSlug: string): Promise<Project> {
  return mapProject(await apiRequest<ApiProject>(
    `/api/v1/projects/share/${encodeURIComponent(profileSlug)}/${encodeURIComponent(projectSlug)}`,
  ))
}

export async function getProject(projectId: string): Promise<Project> {
  return mapProject(await apiRequest<ApiProject>(`/api/v1/projects/${encodeURIComponent(projectId)}`))
}

export async function createProject(input: {
  title: string
  description: string
  category: string
  location_label: string | null
  stage: ProjectStage
  visibility: 'private' | 'public'
  include_contact: boolean
}): Promise<Project> {
  const response = await apiRequest<ApiProject>('/api/v1/projects', {
    method: 'POST',
    body: JSON.stringify({ ...input, stage: toApiStage(input.stage) }),
  })
  return mapProject(response)
}

export async function updateProject(
  projectId: string,
  input: Partial<{
    title: string
    description: string
    category: string
    location_label: string | null
    stage: ProjectStage
    visibility: 'private' | 'public'
    include_contact: boolean
  }>,
): Promise<Project> {
  const body = {
    ...input,
    ...(input.stage ? { stage: toApiStage(input.stage) } : {}),
  }
  return mapProject(await apiRequest<ApiProject>(`/api/v1/projects/${encodeURIComponent(projectId)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  }))
}

export async function publishProject(projectId: string): Promise<Project> {
  return mapProject(await apiRequest<ApiProject>(`/api/v1/projects/${encodeURIComponent(projectId)}/publish`, {
    method: 'POST',
  }))
}

export async function createProjectUpdate(
  projectId: string,
  update: Omit<ProjectUpdate, 'id' | 'createdAt' | 'attachments'>,
): Promise<ProjectUpdate> {
  return mapUpdate(await apiRequest<ApiProjectUpdate>(`/api/v1/projects/${encodeURIComponent(projectId)}/updates`, {
    method: 'POST',
    body: JSON.stringify({
      title: update.title,
      content: update.description,
      stage: toApiStage(update.stage),
    }),
  }))
}

function describeUploadError(fileName: string, error: Error): ApiError {
  if (error instanceof DetailedError) {
    const status = error.originalResponse?.getStatus()
    const responseBody = error.originalResponse?.getBody().trim()
    let serverMessage = ''

    if (responseBody && responseBody.length <= 300) {
      try {
        const response = JSON.parse(responseBody) as { message?: unknown; error?: unknown }
        const message = response.message ?? response.error
        if (typeof message === 'string') serverMessage = message
      } catch {
        if (!responseBody.startsWith('<')) serverMessage = responseBody
      }
    }

    const cause = error.causingError?.message
    const detail = serverMessage || cause || 'Check your connection and try again.'
    const statusText = status ? ` (${status})` : ''
    return new ApiError(`We couldn't upload ${fileName}${statusText}. ${detail}`, status ?? 0)
  }

  return new ApiError(`We couldn't upload ${fileName}. Check your connection and try again.`, 0)
}

export async function uploadProjectMedia(
  projectId: string,
  media: ProjectMedia,
  options: {
    projectUpdateId?: string
    sortOrder: number
    onProgress: (percentage: number) => void
  },
): Promise<ProjectMedia> {
  if (!media.file) {
    throw new ApiError('Choose the file again before uploading it.', 400)
  }
  const file = media.file
  const capability = await apiRequest<UploadCapability>(
    `/api/v1/projects/${encodeURIComponent(projectId)}/media/sign`,
    {
      method: 'POST',
      body: JSON.stringify({
        filename: file.name,
        mime_type: file.type,
        file_size_bytes: file.size,
        caption: media.description,
        project_update_id: options.projectUpdateId ?? null,
        sort_order: options.sortOrder,
      }),
    },
  )

  await new Promise<void>((resolve, reject) => {
    const upload = new Upload(file, {
      endpoint: capability.upload_endpoint,
      headers: {
        'x-signature': capability.upload_token,
      },
      fingerprint: () => Promise.resolve(
        `${capability.media_asset_id}-${file.name}-${file.size}-${file.lastModified}`,
      ),
      metadata: {
        bucketName: capability.bucket_id,
        objectName: capability.storage_path,
        contentType: file.type,
        cacheControl: '3600',
      },
      chunkSize: 6 * 1024 * 1024,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      onProgress(bytesUploaded, bytesTotal) {
        options.onProgress(bytesTotal ? Math.round((bytesUploaded / bytesTotal) * 100) : 0)
      },
      onError(error) {
        reject(describeUploadError(file.name, error))
      },
      onSuccess() {
        resolve()
      },
    })

    void upload.findPreviousUploads()
      .then((previousUploads) => {
        if (previousUploads.length > 0) upload.resumeFromPreviousUpload(previousUploads[0])
        upload.start()
      })
      .catch(() => reject(new ApiError(`We couldn't resume the upload for ${file.name}. Try again.`, 0)))
  })

  const response = await apiRequest<ApiMediaAsset>(
    `/api/v1/projects/${encodeURIComponent(projectId)}/media/${encodeURIComponent(capability.media_asset_id)}/complete`,
    { method: 'POST' },
  )
  return mapMedia(response)
}

export async function removeProjectMedia(projectId: string, mediaAssetId: string): Promise<void> {
  await apiRequest<void>(
    `/api/v1/projects/${encodeURIComponent(projectId)}/media/${encodeURIComponent(mediaAssetId)}`,
    { method: 'DELETE' },
  )
}

export function getProfileSettings(): Promise<ApiProfile> {
  return apiRequest<ApiProfile>('/api/v1/profile')
}

export async function uploadProfileAvatar(file: File): Promise<ApiProfile> {
  const formData = new FormData()
  formData.set('file', file)
  return apiRequest<ApiProfile>('/api/v1/profile/avatar', {
    method: 'POST',
    body: formData,
  })
}

export function updateProfileSettings(
  values: Partial<Pick<ApiProfile, 'slug' | 'primary_craft' | 'city' | 'bio' | 'is_public' | 'contact_email' | 'contact_phone' | 'contact_whatsapp' | 'show_contact_on_profile'>>,
): Promise<ApiProfile> {
  return apiRequest<ApiProfile>('/api/v1/profile', {
    method: 'PATCH',
    body: JSON.stringify(values),
  })
}
