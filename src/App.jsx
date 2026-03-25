import React, { useEffect, useState } from 'react'
import Map from './components/Map.jsx'
import Auth from './components/Auth.jsx'
import { supabase } from './lib/supabase'
import useAuthStore from './store/authStore'

function App() {
  const { user, setUser, setProfile } = useAuthStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check initial session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        setProfile(profileData || null)
      }
      setLoading(false)
    }
    
    checkSession()

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user)
        if (event === 'SIGNED_IN') {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          setProfile(profileData || null)
        }
      } else {
        setUser(null)
        setProfile(null)
      }
    })

    return () => {
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe()
      }
    }
  }, [setUser, setProfile])

  if (loading) {
    return (
      <div style={{ width: '100vw', height: '100vh', backgroundColor: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#39FF14', fontSize: '1.2rem', fontFamily: 'system-ui' }}>Loading Battlefield...</div>
      </div>
    )
  }

  return (
    <div>
      {!user ? <Auth /> : <Map />}
    </div>
  )
}

export default App