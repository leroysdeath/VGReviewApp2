import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthModal } from '../context/AuthModalContext';
import { referralService } from '../services/referralService';
import { Loader2 } from 'lucide-react';

export const SignupPage: React.FC = () => {
  const { code } = useParams<{ code?: string }>();
  const navigate = useNavigate();
  const { openModal, setInitialReferralCode } = useAuthModal();
  const [loading, setLoading] = React.useState(true);
  const [codeInfo, setCodeInfo] = React.useState<{ owner_name: string; type: string } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  useEffect(() => {
    const validateAndRedirect = async () => {
      if (!code) {
        // No code provided, redirect to home
        navigate('/');
        return;
      }

      try {
        // Validate the referral code
        const isValid = await referralService.validateCode(code);

        if (isValid) {
          const info = await referralService.getCodeInfo(code);
          setCodeInfo(info);

          // Store the code for the signup modal
          if (setInitialReferralCode) {
            setInitialReferralCode(code.toUpperCase());
          }

          // Store in sessionStorage as backup
          sessionStorage.setItem('referralCode', code.toUpperCase());
          sessionStorage.setItem('referralSignupUrl', `/signup/${code}`);

          // Open signup modal with pre-filled code
          setTimeout(() => {
            openModal('signup');
            // Redirect to home but modal will be open
            navigate('/');
          }, 1500);
        } else {
          setError('Invalid referral code. Redirecting to regular signup...');
          setTimeout(() => {
            openModal('signup');
            navigate('/');
          }, 2000);
        }
      } catch (err) {
        console.error('Error validating referral code:', err);
        setError('Something went wrong. Redirecting to regular signup...');
        setTimeout(() => {
          openModal('signup');
          navigate('/');
        }, 2000);
      } finally {
        setLoading(false);
      }
    };

    validateAndRedirect();
  }, [code, navigate, openModal, setInitialReferralCode]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-xl p-8 text-center">
        {loading ? (
          <>
            <Loader2 className="h-12 w-12 text-purple-500 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">
              Validating Referral Code
            </h2>
            <p className="text-gray-400">
              Checking code: <span className="font-mono text-purple-400">{code?.toUpperCase()}</span>
            </p>
          </>
        ) : error ? (
          <>
            <div className="text-yellow-500 mb-4">
              <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              {error}
            </h2>
          </>
        ) : codeInfo ? (
          <>
            <div className="text-green-500 mb-4">
              <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              Valid Referral Code!
            </h2>
            <p className="text-gray-400 mb-4">
              Referred by: <span className="font-semibold text-purple-400">{codeInfo.owner_name}</span>
            </p>
            <p className="text-sm text-gray-500">
              Redirecting to signup...
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
};