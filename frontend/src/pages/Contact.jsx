import { Link } from 'react-router-dom';
export default function Contact() {
  return (
    <div style={{ maxWidth:600, margin:'0 auto', padding:'48px 24px', color:'var(--text-primary)' }}>
      <Link to="/login" style={{ color:'var(--accent)', fontSize:13, textDecoration:'none' }}>← Back</Link>
      <h1 style={{ marginTop:24, fontSize:28, fontWeight:800 }}>Contact</h1>
      <p style={{ fontSize:14, color:'var(--text-secondary)', lineHeight:1.8, marginBottom:32 }}>
        ResearchTrack is developed and maintained by Tariqul Islam at the
        Faculty of Graduate Studies, Daffodil International University.
      </p>
      {[
        ['Developer', 'Tariqul Islam'],
        ['Institution', 'Faculty of Graduate Studies, Daffodil International University'],
        ['For account issues', 'Contact your workspace admin first. They can reset passwords and manage members.'],
        ['For platform access', 'Use the "Request Access" form on the login page to create a new workspace.'],
        ['For technical issues', 'If the platform is down or you are experiencing a bug, please describe the issue clearly including what you were doing when it occurred.'],
      ].map(([k,v]) => (
        <div key={k} style={{ marginBottom:20, paddingBottom:20,
                               borderBottom:'1px solid var(--border)' }}>
          <div style={{ fontSize:11, fontWeight:600, textTransform:'uppercase',
                        letterSpacing:'0.06em', color:'var(--text-tertiary)', marginBottom:4 }}>
            {k}
          </div>
          <div style={{ fontSize:14, color:'var(--text-primary)', lineHeight:1.7 }}>{v}</div>
        </div>
      ))}
    </div>
  );
}
