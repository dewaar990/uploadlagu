/* Panel admin: kelola akun pelanggan */
const $ = (s) => document.querySelector(s);
let customers = [];

async function load() {
  ({ customers } = await api('/api/admin/customers'));
  customers.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  render();
}

function statusOf(c) {
  if (!c.active) return ['err', t('admin.inactive')];
  if (c.expiresAt && Date.parse(c.expiresAt) < Date.now()) return ['warn', t('admin.expired')];
  return ['ok', t('admin.active')];
}

function render() {
  const tb = $('#rows');
  if (!customers.length) { tb.innerHTML = `<tr><td colspan="6" class="empty">${esc(t('admin.empty'))}</td></tr>`; return; }
  tb.innerHTML = customers.map((c) => {
    const [cls, label] = statusOf(c);
    const exp = c.expiresAt ? c.expiresAt.slice(0, 10) : '';
    return `<tr data-id="${esc(c.id)}">
      <td><b>${esc(c.id)}</b></td>
      <td>${esc(c.name)}${c.hasOwnApiKey ? ' <span class="small">· own key</span>' : ''}</td>
      <td><span class="badge ${cls}">${esc(label)}</span></td>
      <td><input class="input" type="date" value="${esc(exp)}" data-act="expires" style="padding:6px 8px;min-width:140px" title="${esc(t('admin.never'))} = kosong"></td>
      <td class="small">${esc(fmtDate(c.lastLoginAt))}</td>
      <td><div class="row">
        <button class="btn btn-ghost btn-sm" data-act="reset">${esc(t('admin.reset'))}</button>
        <button class="btn btn-ghost btn-sm" data-act="toggle">${esc(t(c.active ? 'admin.disable' : 'admin.enable'))}</button>
        <button class="btn btn-danger btn-sm" data-act="delete">${esc(t('admin.delete'))}</button>
      </div></td>
    </tr>`;
  }).join('');
}

function showCredentials(title, id, password) {
  $('#credTitle').textContent = title;
  const text = `ID Pelanggan: ${id}\nPassword: ${password}\nLogin: ${location.origin}/login`;
  $('#credText').textContent = text;
  $('#credCopy').onclick = () => copyText(text);
  $('#credModal').hidden = false;
}
$('#credClose').addEventListener('click', () => { $('#credModal').hidden = true; });

$('#createForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const r = await api('/api/admin/customers', {
      method: 'POST',
      body: {
        id: $('#cId').value,
        name: $('#cName').value,
        password: $('#cPass').value,
        expiresAt: $('#cExp').value || null,
        useServerKey: $('#cServerKey').checked,
      },
    });
    e.target.reset();
    $('#cServerKey').checked = true;
    showCredentials(t('admin.created'), r.customer.id, r.password);
    load();
  } catch (err) { toast(err.message, 'err'); }
});

$('#rows').addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  const id = btn.closest('tr').dataset.id;
  const c = customers.find((x) => x.id === id);
  try {
    if (btn.dataset.act === 'reset') {
      const pass = prompt(`${t('admin.reset')} — ${id}\n(${t('admin.password')})`, '');
      if (pass === null) return;
      const r = await api(`/api/admin/customers/${encodeURIComponent(id)}`, { method: 'PATCH', body: { resetPassword: true, password: pass } });
      showCredentials(t('admin.reset'), id, r.password);
    } else if (btn.dataset.act === 'toggle') {
      await api(`/api/admin/customers/${encodeURIComponent(id)}`, { method: 'PATCH', body: { active: !c.active } });
    } else if (btn.dataset.act === 'delete') {
      if (!confirm(`${t('common.confirmDelete')} ${id}`)) return;
      await api(`/api/admin/customers/${encodeURIComponent(id)}`, { method: 'DELETE' });
    }
    load();
  } catch (err) { toast(err.message, 'err'); }
});

$('#rows').addEventListener('change', async (e) => {
  if (e.target.dataset.act !== 'expires') return;
  const id = e.target.closest('tr').dataset.id;
  try {
    await api(`/api/admin/customers/${encodeURIComponent(id)}`, { method: 'PATCH', body: { expiresAt: e.target.value || null } });
    toast(t('common.saved'), 'ok');
    load();
  } catch (err) { toast(err.message, 'err'); }
});

onLangChange(render);
load().catch((e) => toast(e.message, 'err'));
