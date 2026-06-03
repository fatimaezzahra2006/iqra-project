import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';

/**
 * AuthGate — Si non connecté, affiche un écran de connexion requis.
 * Si connecté, affiche le composant enfant normalement.
 */
const AuthGate = ({ children, featureName = 'cette fonctionnalité' }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <span>Chargement...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: 'calc(100vh - 70px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f8f4fb, #f0eaf7)',
        padding: '40px 20px',
        fontFamily: "'Satoshi', Georgia, serif",
      }}>
        <div style={{
          background: '#fff',
          borderRadius: 20,
          padding: '48px 44px',
          maxWidth: 480,
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 12px 48px rgba(142,85,161,0.12)',
        }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🔒</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#191a23', margin: '0 0 10px' }}>
            Connexion requise
          </h2>
          <p style={{ fontSize: 15, color: '#888', margin: '0 0 28px', lineHeight: 1.6 }}>
            Pour utiliser <strong>{featureName}</strong>, vous devez être connecté à votre compte IQRA.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              to="/login"
              state={{ from: location.pathname }}
              style={{
                background: 'linear-gradient(135deg, #8e55a1, #c084d8)',
                color: '#fff',
                padding: '12px 28px',
                borderRadius: 10,
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: 15,
                boxShadow: '0 4px 14px rgba(142,85,161,0.3)',
              }}
            >
              Se connecter
            </Link>
            <Link
              to="/signup"
              style={{
                background: '#f5f0f8',
                color: '#8e55a1',
                padding: '12px 24px',
                borderRadius: 10,
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: 15,
                border: '1.5px solid #d4b8e0',
              }}
            >
              Créer un compte
            </Link>
          </div>
          <p style={{ marginTop: 20, fontSize: 13, color: '#ccc' }}>
            Continuez à explorer la page librement ↓
          </p>
          <button
            onClick={() => document.documentElement.scrollBy({ top: 200, behavior: 'smooth' })}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: 20 }}
          >
            ↓
          </button>
        </div>
      </div>
    );
  }

  return children;
};

export default AuthGate;
