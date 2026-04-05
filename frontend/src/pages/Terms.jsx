import { Link } from 'react-router-dom';
export default function Terms() {
  return (
    <div style={{ maxWidth:720, margin:'0 auto', padding:'48px 24px', color:'var(--text-primary)' }}>
      <Link to="/login" style={{ color:'var(--accent)', fontSize:13, textDecoration:'none' }}>← Back</Link>
      <h1 style={{ marginTop:24, fontSize:28, fontWeight:800 }}>Terms of Service</h1>
      <p style={{ color:'var(--text-tertiary)', fontSize:13, marginBottom:32 }}>Last updated: 2025</p>
      {[
        ['1. Acceptance', 'By creating an account and using ResearchTrack, you agree to these terms. If you do not agree, do not use the service.'],
        ['2. Use of Service', 'ResearchTrack is intended for legitimate research expense tracking by academic institutions, research organizations, and project teams. You agree not to use it for illegal purposes or to store data that violates applicable laws.'],
        ['3. Account Responsibility', 'You are responsible for maintaining the confidentiality of your password and for all activities under your account. Workspace admins are responsible for the data entered by their team members.'],
        ['4. Data Privacy', 'Each workspace is completely isolated. ResearchTrack does not sell, share, or monetize your project data. Platform administrators (superadmin) have no access to your financial data, project contents, or expense records.'],
        ['5. Data Ownership', 'You own your data. ResearchTrack stores it on your behalf. You can export your data at any time using the built-in report and export features.'],
        ['6. Availability', 'We aim for high availability but do not guarantee uninterrupted service. We are not liable for data loss due to technical failures beyond our control.'],
        ['7. Termination', 'Workspace owners may delete their workspace and all associated data at any time from the Settings page. The platform administrator may suspend access in cases of abuse.'],
        ['8. Changes', 'We may update these terms. Continued use after changes constitutes acceptance. We will notify users of significant changes.'],
      ].map(([h,t]) => (
        <div key={h} style={{ marginBottom:24 }}>
          <h3 style={{ fontSize:16, fontWeight:700, marginBottom:8 }}>{h}</h3>
          <p style={{ fontSize:14, color:'var(--text-secondary)', lineHeight:1.8 }}>{t}</p>
        </div>
      ))}
      <div style={{ marginTop:40, padding:'20px', background:'var(--bg-secondary)',
                    borderRadius:10, fontSize:13, color:'var(--text-tertiary)' }}>
        For questions about these terms, contact us via the platform admin.
        ResearchTrack is developed by Tariqul Islam, Faculty of Graduate Studies, DIU.
      </div>
    </div>
  );
}
