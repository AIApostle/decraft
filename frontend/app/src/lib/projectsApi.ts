import { Upload } from 'tus-js-client'
import type { Project, ProjectMedia, ProjectStage, ProjectUpdate } from '../data/sampleData'
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
  owner_profile_id: string
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
  api_key: string
}

interface ApiProfile {
  id: string
  display_name: string
  profile_type: 'individual' | 'workshop' | 'business'
  primary_craft: string | null
  city: string | null
  bio: string | null
  is_public: boolean
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
        apikey: capability.api_key,
        'x-signature': capability.upload_token,
      },
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
      onError() {
        reject(new ApiError(`We couldn't upload ${file.name}. Check your connection and try again.`, 0))
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

export function updateProfileSettings(
  values: Partial<Pick<ApiProfile, 'primary_craft' | 'city' | 'bio' | 'is_public'>>,
): Promise<ApiProfile> {
  return apiRequest<ApiProfile>('/api/v1/profile', {
    method: 'PATCH',
    body: JSON.stringify(values),
  })
}
