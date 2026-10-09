import { ExternalLink, PlayCircle } from 'lucide-react'
import { youtubeUrl } from '@/lib/ai'

export function Resources({ data }) {
  if (!data) return null
  return (
    <div className="mt-4 rounded-card border border-line bg-surface-2/50 p-3">
      <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><PlayCircle className="h-4 w-4 text-brand" aria-hidden />Learn more: {data.topic}</p>
      {data.videos?.length > 0 && (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {data.videos.map((v) => (
            <li key={v.id}>
              <a href={youtubeUrl(v.id)} target="_blank" rel="noopener noreferrer" className="flex gap-3 rounded-ctl border border-line bg-surface p-2 hover:border-brand/50">
                {v.thumbnail && <img src={v.thumbnail} alt="" loading="lazy" className="h-14 w-24 shrink-0 rounded object-cover" />}
                <span className="min-w-0"><span className="line-clamp-2 text-sm font-medium">{v.title}</span><span className="block truncate text-xs text-muted">{v.channel}</span></span>
              </a>
            </li>
          ))}
        </ul>
      )}
      <a href={data.search_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-sm text-brand hover:underline">
        <ExternalLink className="h-3.5 w-3.5" aria-hidden />{data.videos?.length ? 'More on YouTube' : 'Search YouTube for this topic'}
      </a>
      <p className="mt-1 text-xs text-muted">External videos are not produced or checked by AutoCare 360.</p>
    </div>
  )
}
