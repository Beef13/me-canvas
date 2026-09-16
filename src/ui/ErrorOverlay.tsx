import { useEffect, useState } from 'react'

/** TEMPORARY: surfaces async runtime errors until the blackout is solved. */
export default function ErrorOverlay() {
  const [errors, setErrors] = useState<string[]>([])

  useEffect(() => {
    const push = (msg: string) =>
      setErrors((prev) => (prev.length > 2 ? prev : [...prev, msg]))
    const onError = (e: ErrorEvent) => push(`ERR: ${e.message}`)
    const onRejection = (e: PromiseRejectionEvent) => {
      push(`REJ: ${e.reason instanceof Error ? e.reason.message : String(e.reason)}`)
    }
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])

  if (errors.length === 0) return null
  return (
    <div className="absolute left-1/2 top-2 z-50 w-max max-w-[80vw] -translate-x-1/2 rounded-lg bg-red-300 px-3 py-1.5 font-mono text-[11px] text-black">
      {errors.map((e, i) => (
        <div key={i} className="truncate">
          {e}
        </div>
      ))}
    </div>
  )
}
