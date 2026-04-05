import { Link } from 'react-router-dom';
export default function Privacy() {
  return (
    <div style={{ maxWidth:720, margin:'0 auto', padding:'48px 24px', color:'var(--text-primary)' }}>
      <Link to="/login" style={{ color:'var(--accent)', fontSize:13, textDecoration:'none' }}>← Back</Link>
      <h1 style={{ marginTop:24, fontSize:28, fontWeight:800 }}>Privacy Policy</h1>
      <p style={{ color:'var(--text-tertiary)', fontSize:13, marginBottom:32 }}>Last updated: 2025</p>
      {[
        ['What We Collect', 'We collect: your name, email address, and password (hashed — never stored as plain text). Optional profile fields (position, institution, phone, location) that you choose to fill in. Project and expense data that you and your team enter.'],
        ['How We Use It', 'Your data is used solely to provide the ResearchTrack service. We do not use it for advertising, do not sell it to third parties, and do not share it with any external service.'],
        ['Workspace Isolation', 'Each workspace is completely isolated at the database level. No user can access another workspace\'s data. The platform superadmin can see workspace names and user counts for operational purposes only — never project names, expenses, or financial figures.'],
        ['Passwords', 'All passwords are hashed using bcrypt before storage. We cannot read your password. If you forget it, you must reset it — we cannot recover it for you.'],
        ['Data in Transit', 'All communication between your browser and the server is encrypted via HTTPS/TLS.'],
        ['Data Retention', 'Your data is retained as long as your workspace exists. When a workspace is deleted by its admin, all associated data is permanently removed from the database.'],
        ['Cookies & Storage', 'We use browser localStorage to store your session token. No third-party cookies. No tracking scripts. No analytics services.'],
        ['Contact', 'For privacy concerns, contact the platform admin or reach out to the developer directly.'],
      ].map(([h,t]) => (
        <div key={h} style={{ marginBottom:24 }}>
          <h3 style={{ fontSize:16, fontWeight:700, marginBottom:8 }}>{h}</h3>
          <p style={{ fontSize:14, color:'var(--text-secondary)', lineHeight:1.8 }}>{t}</p>
        </div>
      ))}
    </div>
  );
}
