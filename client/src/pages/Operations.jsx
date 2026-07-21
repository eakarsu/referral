import { useCallback, useEffect, useMemo, useState } from 'react';
import { get, patch, post } from '../api';

const blankLead = { firstName: '', lastName: '', email: '', accountName: '', phone: '', privacyRegion: 'US_CAN_SPAM', source: '' };
const classes = {
  panel: 'rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl',
  input: 'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-blue-500',
  button: 'rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50',
  secondary: 'rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50',
};

export default function Operations({ user, onLogout }) {
  const [leads, setLeads] = useState([]);
  const [queue, setQueue] = useState({ handoffs: [], outreach: [], operations: [] });
  const [users, setUsers] = useState([]);
  const [providers, setProviders] = useState([]);
  const [myHandoffs, setMyHandoffs] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [form, setForm] = useState(blankLead);
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'AGENT', password: '' });
  const canReview = ['ADMIN', 'MANAGER'].includes(user.role);

  const load = useCallback(async () => {
    const [leadRows, userRows, assignedRows] = await Promise.all([get('/workflow/leads'), get('/workflow/users'), get('/workflow/handoffs/mine')]);
    setLeads(leadRows); setUsers(userRows); setMyHandoffs(assignedRows);
    if (canReview) {
      const [queueRows, metricRows, providerRows] = await Promise.all([get('/workflow/queue'), get('/workflow/metrics'), get('/workflow/providers')]);
      setQueue(queueRows); setMetrics(metricRows); setProviders(providerRows);
    }
  }, [canReview]);

  useEffect(() => { load().catch((err) => setError(err.message)); }, [load]);
  const agents = useMemo(() => users.filter((item) => ['AGENT', 'MANAGER'].includes(item.role) && item.id !== user.id), [users, user.id]);

  async function act(work, success) {
    setBusy(true); setError(''); setMessage('');
    try { await work(); setMessage(success); await load(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  const create = (event) => {
    event.preventDefault();
    act(async () => { await post('/workflow/leads', form); setForm(blankLead); }, 'Lead created and CRM synchronization queued.');
  };

  const transition = (lead, lifecycle) => act(() => patch(`/workflow/leads/${lead.id}/lifecycle`, { lifecycle, expectedVersion: lead.version, reason: `Operator advanced referral to ${lifecycle}` }), `Lead moved to ${lifecycle}.`);
  const requestAssignment = (lead) => {
    const toUserId = window.prompt(`Target user ID:\n${agents.map((item) => `${item.name}: ${item.id}`).join('\n')}`);
    if (toUserId) act(() => post(`/workflow/leads/${lead.id}/handoffs`, { toUserId, reason: 'Assign referral to accountable owner' }), 'Ownership request submitted for independent approval.');
  };
  const draft = (lead) => {
    const subject = window.prompt('Outreach subject');
    if (!subject) return;
    const body = window.prompt('Outreach body (the approved send adds postal address and unsubscribe link)');
    if (body) act(() => post(`/workflow/leads/${lead.id}/outreach`, { subject, body }), 'Outreach submitted for independent human review.');
  };
  const inspect = async (lead) => {
    setError('');
    try { setSelected(await get(`/workflow/leads/${lead.id}/journey`)); }
    catch (err) { setError(err.message); }
  };
  const createUser = (event) => {
    event.preventDefault();
    act(async () => { await post('/workflow/users', newUser); setNewUser({ name: '', email: '', role: 'AGENT', password: '' }); setShowUserForm(false); }, 'Team member created. Share the temporary password through an approved channel.');
  };
  const createProvider = () => {
    const name = window.prompt('Provider connection name'); if (!name) return;
    const type = window.prompt('Type: CRM, EMAIL, CALENDAR, ENRICHMENT, CONSENT, or SUPPRESSION'); if (!type) return;
    const baseUrl = window.prompt('Credential-free HTTPS origin, for example https://provider.example'); if (!baseUrl) return;
    const tokenEnv = window.prompt('Environment variable containing the provider token'); if (!tokenEnv) return;
    const webhookSecretEnv = window.prompt('Environment variable containing the webhook secret'); if (!webhookSecretEnv) return;
    const contractRef = window.prompt('Data-processing contract reference'); if (!contractRef) return;
    const active = window.confirm('Activate immediately? This succeeds only when both named secrets are configured.');
    act(() => post('/workflow/providers', { name, type: type.toUpperCase(), baseUrl, tokenEnv, webhookSecretEnv, contractRef, active }), 'Provider connection saved.');
  };
  const recordConsent = (lead) => {
    const status = window.prompt('Consent status: GRANTED or REVOKED', 'GRANTED'); if (!status) return;
    const source = window.prompt('Consent evidence source'); if (!source) return;
    const purpose = window.prompt('Documented outreach purpose'); if (!purpose) return;
    const evidenceReference = window.prompt('Evidence reference (form/version/call record ID)'); if (!evidenceReference) return;
    act(() => post(`/workflow/leads/${lead.id}/consent`, { status: status.toUpperCase(), source, purpose, evidence: { reference: evidenceReference } }), `Consent recorded as ${status.toUpperCase()} and export queued.`);
  };
  const suppressLead = (lead) => {
    const reason = window.prompt('Suppression reason');
    if (reason && window.confirm(`Suppress all queued and future outreach to ${lead.email}?`)) act(() => post(`/workflow/leads/${lead.id}/suppressions`, { reason }), 'Lead suppressed and suppression export queued.');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/95 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div><h1 className="text-xl font-bold">Referral Operations</h1><p className="text-xs text-slate-400">Governed lead-to-conversion workflow</p></div>
          <div className="flex items-center gap-3 text-sm"><span>{user.name} · {user.role}</span><button className={classes.secondary} onClick={onLogout}>Sign out</button></div>
        </div>
      </header>
      <main className="mx-auto grid max-w-7xl gap-5 p-6">
        {error && <div role="alert" className="rounded-lg border border-red-700 bg-red-950/60 p-3 text-red-200">{error}</div>}
        {message && <div role="status" className="rounded-lg border border-emerald-700 bg-emerald-950/60 p-3 text-emerald-200">{message}</div>}

        {myHandoffs.length > 0 && <section className={classes.panel}><h2 className="mb-3 text-lg font-semibold">Ownership awaiting your acceptance</h2>{myHandoffs.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 p-3"><span>{item.first_name} {item.last_name} · {item.reason}</span><button className={classes.button} disabled={busy} onClick={() => act(() => post(`/workflow/handoffs/${item.id}/accept`, {}), 'Ownership accepted.')}>Accept ownership</button></div>)}</section>}

        {canReview && metrics && <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="Workflow metrics">
          <Metric label="Leads" value={metrics.totalLeads} /><Metric label="Converted" value={metrics.lifecycle.CONVERTED || 0} />
          <Metric label="Conversion" value={`${(metrics.conversionRate * 100).toFixed(1)}%`} /><Metric label="Missing consent" value={metrics.dataQuality.missingConsent} />
          <Metric label="Quarantined sync" value={metrics.dataQuality.syncQuarantined} />
        </section>}

        {user.role === 'ADMIN' && <section className={classes.panel}><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Administration</h2><p className="text-sm text-slate-400">Create accountable team members and contract-backed provider connections.</p></div><div className="flex gap-2"><button className={classes.secondary} disabled={busy} onClick={() => setShowUserForm((value) => !value)}>Add team member</button><button className={classes.secondary} disabled={busy} onClick={createProvider}>Add provider</button></div></div>{showUserForm && <form onSubmit={createUser} className="mt-4 grid gap-3 rounded-lg border border-slate-800 p-3 md:grid-cols-5"><input aria-label="Team member name" placeholder="Name" className={classes.input} value={newUser.name} required onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} /><input aria-label="Team member email" placeholder="Email" type="email" className={classes.input} value={newUser.email} required onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} /><select aria-label="Team member role" className={classes.input} value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}><option>AGENT</option><option>MANAGER</option><option>ADMIN</option></select><input aria-label="Temporary password" placeholder="16+ character temporary password" type="password" minLength="16" className={classes.input} value={newUser.password} required onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} /><button className={classes.button} disabled={busy}>Create user</button></form>}<div className="mt-3 flex flex-wrap gap-2">{users.map((item) => <Badge key={item.id}>{item.name} · {item.role}</Badge>)}</div></section>}

        <section className={classes.panel}>
          <h2 className="mb-1 text-lg font-semibold">Capture an attributed referral</h2>
          <p className="mb-4 text-sm text-slate-400">Email is deduplicated per organization. Consent must arrive independently from the configured consent source.</p>
          <form onSubmit={create} className="grid gap-3 md:grid-cols-4">
            {['firstName','lastName','email','accountName','phone','source'].map((key) => <label key={key} className="text-xs text-slate-400"><span className="mb-1 block">{key.replace(/([A-Z])/g, ' $1')}</span><input className={classes.input} value={form[key]} required={['firstName','lastName','email','source'].includes(key)} type={key === 'email' ? 'email' : 'text'} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></label>)}
            <label className="text-xs text-slate-400"><span className="mb-1 block">Privacy region</span><select className={classes.input} value={form.privacyRegion} onChange={(e) => setForm({ ...form, privacyRegion: e.target.value })}><option>US_CAN_SPAM</option><option>EU_GDPR</option><option>CA_CCPA</option></select></label>
            <button disabled={busy} className={`${classes.button} self-end`} type="submit">Create lead</button>
          </form>
        </section>

        <section className={classes.panel}>
          <div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-semibold">Lead lifecycle</h2><p className="text-sm text-slate-400">Ownership, review and optimistic version checks are enforced server-side.</p></div><button className={classes.secondary} onClick={() => load().catch((err) => setError(err.message))}>Refresh</button></div>
          <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="p-2">Lead</th><th className="p-2">Account</th><th className="p-2">Lifecycle</th><th className="p-2">Consent</th><th className="p-2">Owner</th><th className="p-2">Actions</th></tr></thead><tbody>
            {leads.map((lead) => <tr key={lead.id} className="border-t border-slate-800"><td className="p-2"><div>{lead.first_name} {lead.last_name}</div><div className="text-xs text-slate-500">{lead.email}</div></td><td className="p-2">{lead.account_name || '—'}</td><td className="p-2"><Badge>{lead.lifecycle}</Badge></td><td className="p-2"><Badge>{lead.consent_status}</Badge></td><td className="p-2">{lead.owner_name || 'Unassigned'}</td><td className="flex flex-wrap gap-2 p-2">
              <button className={classes.secondary} onClick={() => inspect(lead)}>Journey</button>
              {canReview && <button disabled={busy} className={classes.secondary} onClick={() => recordConsent(lead)}>Record consent</button>}
              {canReview && <button disabled={busy} className={classes.secondary} onClick={() => suppressLead(lead)}>Suppress</button>}
              {lead.lifecycle === 'NEW' && <button disabled={busy || !agents.length} className={classes.secondary} onClick={() => requestAssignment(lead)}>Request owner</button>}
              {lead.lifecycle === 'ASSIGNED' && <button disabled={busy} className={classes.button} onClick={() => transition(lead, 'QUALIFIED')}>Qualify</button>}
              {lead.lifecycle === 'QUALIFIED' && <button disabled={busy} className={classes.button} onClick={() => draft(lead)}>Draft outreach</button>}
              {lead.lifecycle === 'OUTREACH_READY' && <button disabled={busy} className={classes.button} onClick={() => transition(lead, 'ENGAGED')}>Mark engaged</button>}
              {lead.lifecycle === 'ENGAGED' && <button disabled={busy} className={classes.button} onClick={() => transition(lead, 'CONVERTED')}>Convert</button>}
            </td></tr>)}
            {!leads.length && <tr><td colSpan="6" className="p-6 text-center text-slate-500">No leads yet.</td></tr>}
          </tbody></table></div>
        </section>

        {canReview && <section className="grid gap-5 lg:grid-cols-2">
          <div className={classes.panel}><h2 className="mb-3 text-lg font-semibold">Human approval queue</h2><QueueList title="Ownership" empty="No handoffs awaiting action." rows={queue.handoffs} render={(item) => <div><p>{item.first_name} {item.last_name}: {item.from_name || 'Unassigned'} → {item.to_name}</p><p className="text-xs text-slate-500">{item.status} · {item.reason}</p>{item.status === 'REQUESTED' && <button className={`${classes.button} mt-2`} disabled={busy || item.requested_by_id === user.id || item.to_user_id === user.id} onClick={() => act(() => post(`/workflow/handoffs/${item.id}/review`, { decision: 'approve' }), 'Handoff approved; target owner must accept.')}>Approve</button>}</div>} />
          <QueueList title="Outreach" empty="No drafts awaiting review." rows={queue.outreach} render={(item) => <div><p>{item.first_name} {item.last_name}: {item.subject}</p><p className="line-clamp-2 text-xs text-slate-500">{item.body}</p><button className={`${classes.button} mt-2`} disabled={busy || item.requester_user_id === user.id} onClick={() => act(() => post(`/workflow/outreach/${item.id}/review`, { decision: 'approve', reason: 'Content and compliance reviewed' }), 'Outreach approved and queued.')}>Approve & queue</button></div>} /></div>
          <div className={classes.panel}><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Integration outbox</h2><button className={classes.button} disabled={busy} onClick={() => act(() => post('/workflow/operations/run', { limit: 25 }), 'Due operations processed.')}>Run due work</button></div><div className="mt-3 space-y-2">{queue.operations.map((item) => <div key={item.id} className="rounded-lg border border-slate-800 p-3 text-sm"><div className="flex justify-between"><span>{item.kind} · {item.provider_name}</span><Badge>{item.status}</Badge></div>{item.last_error && <p className="mt-1 text-xs text-red-300">{item.last_error}</p>}</div>)}{!queue.operations.length && <p className="text-sm text-slate-500">No due or failed operations.</p>}</div></div>
        </section>}

        {canReview && <section className={classes.panel}><h2 className="mb-3 text-lg font-semibold">Governed providers</h2><div className="grid gap-2 md:grid-cols-3">{providers.map((item) => <div key={item.id} className="rounded-lg border border-slate-800 p-3 text-sm"><div className="flex justify-between"><span>{item.name}</span><Badge>{item.type}</Badge></div><p className="mt-1 text-xs text-slate-500">{item.active ? 'Active' : 'Inactive'} · contract {item.contract_ref}</p><p className="text-xs text-slate-500">Credentials: {item.tokenConfigured && item.webhookSecretConfigured ? 'configured' : 'missing'}</p>{user.role === 'ADMIN' && <button className={`${classes.secondary} mt-2`} disabled={busy || (!item.active && !(item.tokenConfigured && item.webhookSecretConfigured))} onClick={() => act(() => patch(`/workflow/providers/${item.id}`, { active: !item.active }), `Provider ${item.active ? 'deactivated' : 'activated'}.`)}>{item.active ? 'Deactivate' : 'Activate'}</button>}</div>)}</div></section>}

        {selected && <section className={classes.panel}><div className="flex justify-between"><h2 className="text-lg font-semibold">Journey evidence: {selected.lead.first_name} {selected.lead.last_name}</h2><button className={classes.secondary} onClick={() => setSelected(null)}>Close</button></div><pre className="mt-3 max-h-96 overflow-auto rounded-lg bg-black/30 p-3 text-xs text-slate-300">{JSON.stringify(selected, null, 2)}</pre></section>}
      </main>
    </div>
  );
}

function Metric({ label, value }) { return <div className={classes.panel}><p className="text-xs uppercase text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>; }
function Badge({ children }) { return <span className="inline-flex rounded-full border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] font-medium text-slate-300">{children}</span>; }
function QueueList({ title, rows, empty, render }) { return <div className="mt-4"><h3 className="mb-2 text-sm font-medium text-slate-300">{title}</h3><div className="space-y-2">{rows.map((item) => <div className="rounded-lg border border-slate-800 p-3 text-sm" key={item.id}>{render(item)}</div>)}{!rows.length && <p className="text-sm text-slate-500">{empty}</p>}</div></div>; }
