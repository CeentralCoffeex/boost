'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="content-wrapper" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '400px',
      textAlign: 'center',
      padding: '2rem',
      paddingTop: '2rem'
    }}>
      <div className="error-code" style={{
         fontSize: '8rem',
         fontWeight: '900',
         color: '#000000',
         marginBottom: '0.5rem',
         marginTop: '1rem',
         display: 'flex',
         alignItems: 'center',
         gap: '1rem',
         fontFamily: 'Orbitron, sans-serif',
         letterSpacing: '0.2em'
       }}>
         <span style={{
           animation: 'bounce 1s ease-in-out infinite',
           animationDelay: '0s',
           color: '#000000'
         }}>4</span>
         <span className="warning-symbol" style={{ 
            color: '#dc2626 !important', 
            fontSize: '6rem',
            animation: 'pulse 1.5s ease-in-out infinite',
            filter: 'drop-shadow(0 0 10px rgba(220, 38, 38, 0.8))',
            fontWeight: '900'
          }}>⚠</span>
         <span style={{
           animation: 'bounce 1s ease-in-out infinite',
           animationDelay: '0.2s',
           color: '#000000'
         }}>4</span>
       </div>
      
      <style jsx>{`
         @keyframes bounce {
          0%, 20%, 50%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-15px);
          }
          60% {
            transform: translateY(-8px);
          }
        }
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.7;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
      
      <h1 style={{ 
         color: '#000000', 
         fontSize: '3rem', 
         fontWeight: '700', 
         marginBottom: '1rem', 
         marginTop: '0rem',
         fontFamily: 'Orbitron, sans-serif'
       }}>Page non trouvée</h1>
       
       <p style={{ 
         color: '#000000', 
         fontSize: '1.3rem', 
         marginBottom: '3rem', 
         maxWidth: '600px',
         lineHeight: '1.6'
       }}>Désolé, la page que vous recherchez n'existe pas ou a été déplacée.</p>
      
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link href="/" className="action-btn" style={{
          padding: '16px 32px',
          background: 'linear-gradient(135deg, rgba(74, 144, 255, 0.9), rgba(74, 144, 255, 0.7))',
          color: 'white',
          borderRadius: '50px',
          border: '2px solid rgba(255, 255, 255, 0.2)',
          fontWeight: 'bold',
          textDecoration: 'none',
          fontSize: '16px',
          letterSpacing: '1px',
          textTransform: 'uppercase',
          transition: 'all 0.3s ease'
        }}>
          Retour à l'accueil →
        </Link>
        
        <Link href="/contact" className="action-btn" style={{
          padding: '16px 32px',
          background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.9), rgba(220, 38, 38, 0.7))',
          color: 'white',
           borderRadius: '50px',
           border: '2px solid rgba(255, 255, 255, 0.2)',
           fontSize: '16px',
           fontWeight: '600',
           cursor: 'pointer',
           letterSpacing: '1px',
           textTransform: 'uppercase',
           transition: 'all 0.3s ease'
         }}>
           Nous contacter
        </Link>
      </div>
    </div>
  );
}