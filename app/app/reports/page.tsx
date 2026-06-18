import { redirect } from 'next/navigation'

// "Reports" is folded into the Overview, which is now the founder's scan history
// (every scan, newest first, each card opening the in-depth report). Old bookmarks
// land on the Overview instead of 404-ing.
export default function ReportsRedirect() {
  redirect('/app')
}
