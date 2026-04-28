import { Outlet, useLocation } from 'react-router-dom'

export default function App() {
  const loc = useLocation()
  const isPlayer = loc.pathname.endsWith('/play')
  return (
    <div className={isPlayer ? 'app app--fullscreen' : 'app'}>
      <Outlet />
    </div>
  )
}
