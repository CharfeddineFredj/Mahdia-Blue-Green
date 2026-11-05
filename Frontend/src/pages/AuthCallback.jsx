import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../services';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (authService.isAuthenticated() && !authService.needsQuestionnaireCompletion()) {
      navigate('/home', { replace: true });
      return;
    }

    const token = searchParams.get('token');
    const tempToken = searchParams.get('tempToken');
    const requiresQuestionnaire = searchParams.get('requiresQuestionnaire');
    const error = searchParams.get('error');

    if (error) {
      let errorMessage = 'Erreur d\'authentification';

      switch (error) {
        case 'google_auth_failed':
          errorMessage = 'Échec de l\'authentification Google';
          break;
        case 'token_generation_failed':
          errorMessage = 'Erreur de génération du token';
          break;
        case 'account_deactivated':
          errorMessage = 'Ce compte est désactivé';
          break;
        default:
          errorMessage = error;
      }

      alert(errorMessage);
      navigate('/auth');
      return;
    }

    if (tempToken && requiresQuestionnaire === 'true') {
      localStorage.setItem('mbg_temp_user', JSON.stringify({ tempToken }));
      navigate('/auth/complete-profile', { replace: true });
      return;
    }

    if (token) {
      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) {
            if (data.code === 'ACCOUNT_DEACTIVATED' || data.code === 'USER_NOT_FOUND') {
              localStorage.removeItem('mbg_user');
              localStorage.removeItem('mbg_temp_user');
            }
            throw new Error(data.message || 'Session invalide');
          }
          return data;
        })
        .then(data => {
          if (data.success) {
            const userData = {
              token: token,
              user: data.data
            };
            localStorage.setItem('mbg_user', JSON.stringify(userData));

            const isAdmin = data.data.role === 'superadmin' || data.data.role === 'admin' ||
              data.data.role === 'analyst' || data.data.role === 'moderator';

            if (isAdmin) {
              window.location.replace('/admin');
            } else {
              window.location.replace('/compte');
            }
          } else {
            throw new Error(data.message || 'Failed to fetch user info');
          }
        })
        .catch(err => {
          console.error('Error:', err);
          alert('Erreur lors de la récupération des informations utilisateur');
          navigate('/auth');
        });
    } else {
      navigate('/auth');
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex-center">
      <div className="text-center">
        <div className="spinner" style={{ margin: '0 auto', marginBottom: '1rem' }}></div>
        <p style={{ color: 'var(--text-secondary)' }}>Authentification en cours...</p>
      </div>
    </div>
  );
}


