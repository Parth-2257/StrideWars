import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import useAuthStore from '../store/authStore';

function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { setUser, setProfile } = useAuthStore();

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let authResponse;
      if (isLogin) {
        authResponse = await supabase.auth.signInWithPassword({ email, password });
      } else {
        authResponse = await supabase.auth.signUp({ email, password });
      }

      if (authResponse.error) throw authResponse.error;

      const user = authResponse.data.user;
      if (user) {
        setUser(user);

        // Fetch user profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          // Ignore "Row not found" error if profile doesn't exist yet
          console.error('Error fetching profile:', profileError);
        } else {
          setProfile(profileData || null);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>STRIDE<span style={styles.accent}>WARS</span></h1>
        
        <div style={styles.toggleContainer}>
          <button 
            style={isLogin ? { ...styles.toggleBtn, ...styles.activeToggle } : styles.toggleBtn}
            onClick={() => setIsLogin(true)}
            type="button"
          >
            Login
          </button>
          <button 
            style={!isLogin ? { ...styles.toggleBtn, ...styles.activeToggle } : styles.toggleBtn}
            onClick={() => setIsLogin(false)}
            type="button"
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleAuth} style={styles.form}>
          <input 
            type="email" 
            placeholder="Email Address" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            required
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            required
          />
          
          {error && <div style={styles.error}>{error}</div>}
          
          <button type="submit" disabled={loading} style={styles.submitBtn}>
            {loading ? 'Processing...' : (isLogin ? 'ENTER BATTLEFIELD' : 'JOIN THE WAR')}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    padding: '40px',
    borderRadius: '24px',
    background: 'rgba(255, 255, 255, 0.03)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(57, 255, 20, 0.2)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
  },
  title: {
    color: '#fff',
    fontSize: '32px',
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: '32px',
    letterSpacing: '2px',
    margin: '0 0 32px 0'
  },
  accent: {
    color: '#39FF14'
  },
  toggleContainer: {
    display: 'flex',
    gap: '10px',
    marginBottom: '24px',
    background: 'rgba(0, 0, 0, 0.5)',
    padding: '6px',
    borderRadius: '12px'
  },
  toggleBtn: {
    flex: 1,
    padding: '12px',
    border: 'none',
    background: 'transparent',
    color: '#888',
    fontSize: '16px',
    fontWeight: 'bold',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  activeToggle: {
    background: '#39FF14',
    color: '#0a0a0a',
    boxShadow: '0 0 15px rgba(57, 255, 20, 0.4)'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  input: {
    width: '100%',
    padding: '16px',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    background: 'rgba(0, 0, 0, 0.5)',
    color: '#fff',
    fontSize: '16px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.3s ease'
  },
  submitBtn: {
    width: '100%',
    padding: '16px',
    marginTop: '8px',
    borderRadius: '12px',
    border: 'none',
    background: '#39FF14',
    color: '#0a0a0a',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    boxShadow: '0 0 20px rgba(57, 255, 20, 0.5)',
    transition: 'transform 0.1s ease, box-shadow 0.3s ease'
  },
  error: {
    color: '#ff3333',
    fontSize: '14px',
    textAlign: 'center',
    padding: '8px',
    background: 'rgba(255, 51, 51, 0.1)',
    borderRadius: '8px',
    border: '1px solid rgba(255, 51, 51, 0.3)'
  }
};

export default Auth;
